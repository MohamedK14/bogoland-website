const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { rowToCustomer } = require('../mappers');
const { requireCustomer } = require('../authMiddleware');

const router = express.Router();

// POST /api/auth/register — { name, email, phone, address, password } -> { token, customer }
router.post('/register', async (req, res) => {
  const { name, email, phone, address, password } = req.body || {};

  if(!name || !email || !password){
    return res.status(400).json({ error: 'name, email, and password are required' });
  }
  if(password.length < 6){
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const existing = await pool.query('SELECT id FROM customers WHERE email = $1', [email.toLowerCase()]);
    if(existing.rows.length > 0){
      return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO customers (name, email, phone, address, password_hash)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, email.toLowerCase(), phone || '', address || '', passwordHash]
    );
    const customer = result.rows[0];
    const token = jwt.sign({ role: 'customer', id: customer.id }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.status(201).json({ token, customer: rowToCustomer(customer) });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not create account' });
  }
});

// POST /api/auth/login — { email, password } -> { token, customer }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if(!email || !password){
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email.toLowerCase()]);
    const customer = result.rows[0];
    const validPassword = customer ? await bcrypt.compare(password, customer.password_hash) : false;

    if(!customer || !validPassword){
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'customer', id: customer.id }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, customer: rowToCustomer(customer) });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not log in' });
  }
});

// GET /api/auth/me — requires a customer token
router.get('/me', requireCustomer, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.customerId]);
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(rowToCustomer(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch profile' });
  }
});

// PUT /api/auth/me — update saved name/phone/address. Email and password
// changes aren't handled here, kept out of scope for now.
router.put('/me', requireCustomer, async (req, res) => {
  const { name, phone, address } = req.body || {};

  try {
    const result = await pool.query(
      `UPDATE customers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         address = COALESCE($3, address)
       WHERE id = $4 RETURNING *`,
      [name, phone, address, req.customerId]
    );
    res.json(rowToCustomer(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

module.exports = router;
