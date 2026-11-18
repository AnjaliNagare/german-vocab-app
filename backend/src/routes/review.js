const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { calculateNextReview, getLastReviewState } = require('../services/srsAlgorithm');
const { generateExampleSentence } = require('../services/aiService');

const router = express.Router();

router.use(auth);

// GET /review/due — get all words due for review today
router.get('/due', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         w.id, w.german, w.english, w.category_id, c.name AS category_name,
         lr.next_review_at,
         lr.ease_factor AS last_ease,
         lr.interval_days AS last_interval,
         (SELECT COUNT(*) FROM review_logs
          WHERE word_id = w.id AND user_id = $1) AS review_count
       FROM words w
       LEFT JOIN categories c ON c.id = w.category_id
       LEFT JOIN LATERAL (
         SELECT next_review_at, ease_factor, interval_days
         FROM review_logs
         WHERE word_id = w.id AND user_id = $1
         ORDER BY reviewed_at DESC
         LIMIT 1
       ) lr ON true
       WHERE w.user_id = $1
         AND COALESCE(lr.next_review_at, NOW()) <= NOW()
       ORDER BY COALESCE(lr.next_review_at, NOW()) ASC
       LIMIT 20`,
      [req.user.id]
    );

    const due = result.rows.map((row) => {
      const state = {
        easeFactor: row.last_ease ? parseFloat(row.last_ease) : 2.5,
        intervalDays: row.last_interval ? parseInt(row.last_interval, 10) : 1,
      };
      const previews = {};
      [1, 2, 3, 4].forEach((rating) => {
        previews[rating] = calculateNextReview({ ...state, rating }).intervalDays;
      });
      return { ...row, previews };
    });

    res.json({ due, count: due.length });
  } catch (err) {
    console.error('Get due words error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /review/submit — submit a review rating for a word
router.post('/submit', async (req, res) => {
  const { word_id, rating } = req.body;

  if (!word_id || !rating) {
    return res.status(400).json({ error: 'word_id and rating are required.' });
  }

  if (rating < 1 || rating > 4) {
    return res.status(400).json({ error: 'Rating must be between 1 and 4.' });
  }

  try {
    // Verify word belongs to this user
    const wordResult = await pool.query(
      'SELECT * FROM words WHERE id = $1 AND user_id = $2',
      [word_id, req.user.id]
    );

    if (wordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found.' });
    }

    const word = wordResult.rows[0];

    // Get review history to calculate next interval
    const historyResult = await pool.query(
      'SELECT * FROM review_logs WHERE word_id = $1 AND user_id = $2 ORDER BY reviewed_at DESC',
      [word_id, req.user.id]
    );

    const lastState = getLastReviewState(historyResult.rows);
    const { nextReviewAt, intervalDays, easeFactor } = calculateNextReview({
      ...lastState,
      rating,
    });

    // Save the review log
    await pool.query(
      `INSERT INTO review_logs (user_id, word_id, rating, next_review_at, interval_days, ease_factor)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.user.id, word_id, rating, nextReviewAt, intervalDays, easeFactor]
    );

    const response = {
      word_id,
      rating,
      nextReviewAt,
      intervalDays,
      easeFactor,
      aiSentence: null,
    };

    // If user forgot the word (rating 1), generate an AI example sentence
    if (rating === 1) {
      console.log(`💡 Rating 1 — generating AI sentence for "${word.german}"`);
      response.aiSentence = await generateExampleSentence(word.german, word.english);
    }

    res.json(response);
  } catch (err) {
    console.error('Submit review error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /review/stats — dashboard stats
function previousDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

router.get('/stats', async (req, res) => {
  const userId = req.user.id;

  try {
    const [totalWords, totalReviews, dueToday, weekly, activeDays, levels] =
      await Promise.all([
        pool.query('SELECT COUNT(*) FROM words WHERE user_id = $1', [userId]),

        pool.query('SELECT COUNT(*) FROM review_logs WHERE user_id = $1', [userId]),

        pool.query(
          `SELECT COUNT(*) FROM words w
           WHERE w.user_id = $1
             AND COALESCE(
               (SELECT next_review_at FROM review_logs
                WHERE word_id = w.id AND user_id = $1
                ORDER BY reviewed_at DESC LIMIT 1),
               NOW()
             ) <= NOW()`,
          [userId]
        ),

        pool.query(
          `SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
                  COUNT(r.id)::int AS count
           FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day') d
           LEFT JOIN review_logs r
             ON DATE(r.reviewed_at) = d::date AND r.user_id = $1
           GROUP BY d
           ORDER BY d`,
          [userId]
        ),

        pool.query(
          `SELECT DISTINCT to_char(DATE(reviewed_at), 'YYYY-MM-DD') AS day
           FROM review_logs
           WHERE user_id = $1 AND reviewed_at >= NOW() - INTERVAL '90 days'`,
          [userId]
        ),

        pool.query(
          `SELECT COALESCE(c.name, 'Other') AS level,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE COALESCE(lr.interval_days, 0) >= 21)::int AS mastered,
        COUNT(*) FILTER (WHERE lr.interval_days IS NOT NULL AND lr.interval_days < 21)::int AS learning
 FROM words w
           LEFT JOIN categories c ON c.id = w.category_id
           LEFT JOIN LATERAL (
             SELECT interval_days FROM review_logs
             WHERE word_id = w.id AND user_id = $1
             ORDER BY reviewed_at DESC LIMIT 1
           ) lr ON true
           WHERE w.user_id = $1
           GROUP BY COALESCE(c.name, 'Other')
           ORDER BY 1`,
          [userId]
        ),
      ]);

    const active = new Set(activeDays.rows.map((r) => r.day));
    let cursor = weekly.rows[weekly.rows.length - 1].date;
    if (!active.has(cursor)) cursor = previousDay(cursor);

    let streak = 0;
    while (active.has(cursor)) {
      streak += 1;
      cursor = previousDay(cursor);
    }

    res.json({
      totalWords: parseInt(totalWords.rows[0].count, 10),
      totalReviews: parseInt(totalReviews.rows[0].count, 10),
      dueToday: parseInt(dueToday.rows[0].count, 10),
      streakDays: streak,
      weekly: weekly.rows,
      levels: levels.rows,
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;