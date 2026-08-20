const express = require('express');
const pool = require('../db');
const { rowToCategory } = require('../mappers');
const { requireAdmin } = require('../authMiddleware');

const router = express.Router();

// GET /api/categories — public, powers the "Nos Collections" cards
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows.map(rowToCategory));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch categories' });
  }
});

// PUT /api/categories/:id — admin only. Body: { available: true|false }
// (also accepts nameFr/nameEn/image if you want to edit those later).
router.put('/:id', requireAdmin, async (req, res) => {
  const { nameFr, nameEn, image, available } = req.body || {};

  try {
    const result = await pool.query(
      `UPDATE categories SET
         name_fr = COALESCE($1, name_fr),
         name_en = COALESCE($2, name_en),
         image = COALESCE($3, image),
         available = COALESCE($4, available)
       WHERE id = $5 RETURNING *`,
      [nameFr, nameEn, image, available, req.params.id]
    );
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(rowToCategory(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not update category' });
  }
});

module.exports = router;
