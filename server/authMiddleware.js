const jwt = require('jsonwebtoken');

// Protects admin-only routes. Expects "Authorization: Bearer <token>",
// where the token was issued by POST /api/admin/login.
function requireAdmin(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if(!token){
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch(err){
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin };
