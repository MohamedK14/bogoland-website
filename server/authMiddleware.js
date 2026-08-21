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

// Protects customer-only routes (account, orders). Same token shape as
// admin, but role must be 'customer' — attaches req.customerId for the
// route to use.
function requireCustomer(req, res, next){
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if(!token){
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if(decoded.role !== 'customer'){
      return res.status(403).json({ error: 'Not a customer token' });
    }
    req.customerId = decoded.id;
    next();
  } catch(err){
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin, requireCustomer };
