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

// POST /api/categories — admin only. Body: { nameFr, nameEn, image, available }.
// Slug is derived from nameFr and de-duplicated if needed (slugs must stay
// unique — that's what shop.html?category=... could theoretically use,
// though today the frontend filters by nameFr instead).
router.post('/', requireAdmin, async (req, res) => {
  const { nameFr, nameEn, image, available } = req.body || {};

  if(!nameFr || !nameEn){
    return res.status(400).json({ error: 'nameFr and nameEn are required' });
  }

  const baseSlug = nameFr
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents (é -> e, etc.)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'categorie';

  try {
    let slug = baseSlug;
    let suffix = 1;
    while((await pool.query('SELECT id FROM categories WHERE slug = $1', [slug])).rows.length > 0){
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    const result = await pool.query(
      `INSERT INTO categories (slug, name_fr, name_en, image, available)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [slug, nameFr, nameEn, image || '', available !== false]
    );
    res.status(201).json(rowToCategory(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not create category' });
  }
});

// DELETE /api/categories/:id — admin only.
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json({ deleted: true });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not delete category' });
  }
});

module.exports = router;
