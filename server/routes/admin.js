const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { requireAdmin } = require('../authMiddleware');
const { rowToReview } = require('../mappers');

const router = express.Router();

// POST /api/admin/login — { email, password } -> { token }
// Credentials live in the admin_account table (see seed-admin.js), not env
// vars, so the admin can change their own email/password from the admin
// panel via PUT /account below, instead of needing Render dashboard access.
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if(!email || !password){
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query('SELECT * FROM admin_account WHERE email = $1', [email]);
    const admin = result.rows[0];
    const validPassword = admin ? await bcrypt.compare(password, admin.password_hash) : false;

    if(!admin || !validPassword){
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'admin', id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not log in' });
  }
});

// PUT /api/admin/account — admin only. Body: { currentPassword, newEmail?, newPassword? }.
// Lets the admin change their own login without touching Render env vars.
// Always requires the current password, even though the route itself is
// already behind requireAdmin, since this changes the credentials that
// guard everything else in the admin panel.
router.put('/account', requireAdmin, async (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body || {};

  if(!currentPassword){
    return res.status(400).json({ error: 'currentPassword is required' });
  }
  if(newPassword && newPassword.length < 6){
    return res.status(400).json({ error: 'newPassword must be at least 6 characters' });
  }

  try {
    const result = await pool.query('SELECT * FROM admin_account WHERE id = $1', [req.adminId]);
    const admin = result.rows[0];
    if(!admin){
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, admin.password_hash);
    if(!validPassword){
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const newHash = newPassword ? await bcrypt.hash(newPassword, 10) : admin.password_hash;
    const updated = await pool.query(
      `UPDATE admin_account SET email = COALESCE($1, email), password_hash = $2 WHERE id = $3 RETURNING email`,
      [newEmail || null, newHash, req.adminId]
    );
    res.json({ email: updated.rows[0].email });
  } catch(err){
    console.error(err);
    if(err.code === '23505'){ // unique_violation on email
      return res.status(409).json({ error: 'Cet e-mail est déjà utilisé.' });
    }
    res.status(500).json({ error: 'Could not update account' });
  }
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

// GET /api/admin/reviews — admin only. Everything (pending + approved),
// newest first, so the admin can moderate what goes public.
router.get('/reviews', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
    res.json(result.rows.map(rowToReview));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not fetch reviews' });
  }
});

// PUT /api/admin/reviews/:id — admin only. Body: { approved: true|false }.
router.put('/reviews/:id', requireAdmin, async (req, res) => {
  const { approved } = req.body || {};

  try {
    const result = await pool.query(
      'UPDATE reviews SET approved = $1 WHERE id = $2 RETURNING *',
      [approved === true, req.params.id]
    );
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(rowToReview(result.rows[0]));
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not update review' });
  }
});

// DELETE /api/admin/reviews/:id — admin only. For rejecting/removing one entirely.
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1 RETURNING id', [req.params.id]);
    if(result.rows.length === 0){
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ deleted: true });
  } catch(err){
    console.error(err);
    res.status(500).json({ error: 'Could not delete review' });
  }
});

module.exports = router;
