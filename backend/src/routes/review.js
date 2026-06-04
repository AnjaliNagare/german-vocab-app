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
        w.id, w.german, w.english, w.category_id, c.name as category_name,
        COALESCE(
          (SELECT next_review_at FROM review_logs
           WHERE word_id = w.id AND user_id = $1
           ORDER BY reviewed_at DESC LIMIT 1),
          NOW()  -- new words are immediately due
        ) as next_review_at,
        (SELECT COUNT(*) FROM review_logs
         WHERE word_id = w.id AND user_id = $1) as review_count
       FROM words w
       LEFT JOIN categories c ON w.category_id = c.id
       WHERE w.user_id = $1
         AND COALESCE(
           (SELECT next_review_at FROM review_logs
            WHERE word_id = w.id AND user_id = $1
            ORDER BY reviewed_at DESC LIMIT 1),
           NOW()
         ) <= NOW()
       ORDER BY next_review_at ASC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      due: result.rows,
      count: result.rows.length,
    });
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
router.get('/stats', async (req, res) => {
  try {
    const [totalWords, totalReviews, dueToday, streak] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM words WHERE user_id = $1', [req.user.id]),

      pool.query('SELECT COUNT(*) FROM review_logs WHERE user_id = $1', [req.user.id]),

      pool.query(
        `SELECT COUNT(DISTINCT w.id) FROM words w
         WHERE w.user_id = $1
           AND COALESCE(
             (SELECT next_review_at FROM review_logs
              WHERE word_id = w.id AND user_id = $1
              ORDER BY reviewed_at DESC LIMIT 1),
             NOW()
           ) <= NOW()`,
        [req.user.id]
      ),

      // Streak = consecutive days with at least one review
      pool.query(
        `SELECT COUNT(DISTINCT DATE(reviewed_at)) as streak_days
         FROM review_logs
         WHERE user_id = $1
           AND reviewed_at >= NOW() - INTERVAL '30 days'`,
        [req.user.id]
      ),
    ]);

    res.json({
      totalWords: parseInt(totalWords.rows[0].count),
      totalReviews: parseInt(totalReviews.rows[0].count),
      dueToday: parseInt(dueToday.rows[0].count),
      streakDays: parseInt(streak.rows[0].streak_days),
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;