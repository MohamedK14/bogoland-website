const express = require('express');
const pool = require('../db');
const { rowToReview } = require('../mappers');

const router = express.Router();

// POST /api/reviews — public. Anyone can submit one; it does NOT show up
// anywhere until an admin approves it (see /api/admin/reviews).
router.post('/', async (req, res) => {
  const { name, rating, message } = req.body || {};
  const ratingNum = Number(rating);

  if(!name || !message || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5){
    return res.status(400).json({ error: 'name, message, and a rating from 1 to 5 are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reviews (name, rating, message) VALUES ($1,$2,$3) RETURNING *`,
      [name, ratingNum, message]
    );
    res.status(201).json(rowToReview(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: "Could not submit review" });
  }
});

// GET /api/reviews — public. Only ever returns approved reviews — this is
// what the storefront displays.
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE approved = true ORDER BY created_at DESC'
    );
    res.json(result.rows.map(rowToReview));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch reviews' });
  }
});

module.exports = router;
