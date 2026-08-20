const express = require('express');
const pool = require('../db');
const { rowToProduct } = require('../mappers');
const { requireAdmin } = require('../authMiddleware');

const router = express.Router();

// GET /api/products — public, read-only storefront listing
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id');
    res.json(result.rows.map(rowToProduct));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch products' });
  }
});

// GET /api/products/:id — public
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rowToProduct(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch product' });
  }
});

// POST /api/products/:id/click — public, called by the "Commander sur
// WhatsApp" button so "Meilleures ventes" can be sorted by real interest.
router.post('/:id/click', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE products SET click_count = click_count + 1 WHERE id = $1 RETURNING click_count',
      [req.params.id]
    );
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ clickCount: result.rows[0].click_count });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not record click' });
  }
});

// POST /api/products — admin only
router.post('/', requireAdmin, async (req, res) => {
  const { nameFr, nameEn, category, price, images, descriptionFr, descriptionEn, inStock } = req.body || {};

  if(!nameFr || !nameEn || !category || price == null){
    return res.status(400).json({ error: 'nameFr, nameEn, category, and price are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (name_fr, name_en, category, price, images, description_fr, description_en, in_stock)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [nameFr, nameEn, category, price, images || [], descriptionFr || '', descriptionEn || '', inStock !== false]
    );
    res.status(201).json(rowToProduct(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not create product' });
  }
});

// PUT /api/products/:id — admin only
router.put('/:id', requireAdmin, async (req, res) => {
  const { nameFr, nameEn, category, price, images, descriptionFr, descriptionEn, inStock } = req.body || {};

  try {
    const result = await pool.query(
      `UPDATE products SET
         name_fr = COALESCE($1, name_fr),
         name_en = COALESCE($2, name_en),
         category = COALESCE($3, category),
         price = COALESCE($4, price),
         images = COALESCE($5, images),
         description_fr = COALESCE($6, description_fr),
         description_en = COALESCE($7, description_en),
         in_stock = COALESCE($8, in_stock)
       WHERE id = $9 RETURNING *`,
      [nameFr, nameEn, category, price, images, descriptionFr, descriptionEn, inStock, req.params.id]
    );
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rowToProduct(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not update product' });
  }
});

// DELETE /api/products/:id — admin only
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ deleted: true });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not delete product' });
  }
});

module.exports = router;
