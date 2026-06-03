const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes below require auth
router.use(auth);

// GET /words — get all words for logged-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT w.*, c.name as category_name,
        (SELECT next_review_at FROM review_logs
         WHERE word_id = w.id ORDER BY reviewed_at DESC LIMIT 1) as next_review_at
       FROM words w
       LEFT JOIN categories c ON w.category_id = c.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get words error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /words — add a new word
router.post('/', async (req, res) => {
  const { german, english, category_id } = req.body;

  if (!german || !english) {
    return res.status(400).json({ error: 'German and English are required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO words (user_id, german, english, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, german.trim(), english.trim(), category_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add word error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /words/:id — update a word
router.put('/:id', async (req, res) => {
  const { german, english, category_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE words SET german = $1, english = $2, category_id = $3
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [german, english, category_id || null, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update word error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /words/:id — delete a word
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM words WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Word not found.' });
    }

    res.json({ message: 'Word deleted.' });
  } catch (err) {
    console.error('Delete word error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /words/categories — get all CEFR categories
router.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;