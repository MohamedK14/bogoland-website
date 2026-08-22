const express = require('express');
const pool = require('../db');
const { requireCustomer } = require('../authMiddleware');

const router = express.Router();

// POST /api/orders — requires a customer token. Called right before opening
// the WhatsApp link at checkout, so a logged-in customer's purchase gets a
// history entry. Body: { items: [{productId, nameFr, price, qty, image}], total }
router.post('/', requireCustomer, async (req, res) => {
  const { items, total } = req.body || {};

  if(!Array.isArray(items) || items.length === 0 || total == null){
    return res.status(400).json({ error: 'items (non-empty array) and total are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'INSERT INTO orders (customer_id, total) VALUES ($1,$2) RETURNING *',
      [req.customerId, total]
    );
    const order = orderResult.rows[0];

    for(const item of items){
      await client.query(
        `INSERT INTO order_items (order_id, product_id, name_fr, price, qty, image, size)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, item.productId || null, item.nameFr, item.price, item.qty, item.image || '', item.size || '']
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: order.id, total: order.total, createdAt: order.created_at });
  } catch(err){
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Could not save order' });
  } finally {
    client.release();
  }
});

// GET /api/orders — requires a customer token. Returns this customer's own
// orders (never anyone else's), newest first, with their line items.
router.get('/', requireCustomer, async (req, res) => {
  try {
    const ordersResult = await pool.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC',
      [req.customerId]
    );
    const orders = ordersResult.rows;
    if(orders.length === 0){
      return res.json([]);
    }

    const orderIds = orders.map(o => o.id);
    const itemsResult = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ANY($1::int[])',
      [orderIds]
    );

    const itemsByOrder = {};
    for(const item of itemsResult.rows){
      if(!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push({
        productId: item.product_id,
        nameFr: item.name_fr,
        price: item.price,
        qty: item.qty,
        image: item.image,
        size: item.size,
      });
    }

    res.json(orders.map(o => ({
      id: o.id,
      total: o.total,
      createdAt: o.created_at,
      items: itemsByOrder[o.id] || [],
    })));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch orders' });
  }
});

module.exports = router;
