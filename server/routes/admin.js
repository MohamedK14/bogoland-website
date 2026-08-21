const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAdmin } = require('../authMiddleware');

const router = express.Router();

// POST /api/admin/login — { email, password } -> { token }
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if(!email || !password){
    return res.status(400).json({ error: 'Email and password required' });
  }

  const validEmail = email === process.env.ADMIN_EMAIL;
  const validPassword = validEmail && process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if(!validEmail || !validPassword){
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ role: 'admin', email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// GET /api/admin/customers — admin only. Never returns password_hash.
router.get('/customers', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, created_at FROM customers ORDER BY created_at DESC'
    );
    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      createdAt: row.created_at,
    })));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch customers' });
  }
});

// POST /api/admin/customers/:id/reset-password — admin only. Body: { newPassword }.
// Used when a customer forgets their password and contacts the shop directly
// (WhatsApp, etc.) — admin sets a temporary one and relays it to them.
router.post('/customers/:id/reset-password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body || {};

  if(!newPassword || newPassword.length < 6){
    return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE customers SET password_hash = $1 WHERE id = $2 RETURNING id',
      [passwordHash, req.params.id]
    );
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not reset password' });
  }
});

module.exports = router;
