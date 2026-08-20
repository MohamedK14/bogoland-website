const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

module.exports = router;
