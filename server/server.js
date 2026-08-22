require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productsRouter = require('./routes/products');
const categoriesRouter = require('./routes/categories');
const adminRouter = require('./routes/admin');
const uploadRouter = require('./routes/upload');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const reviewsRouter = require('./routes/reviews');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'bogoland-server' });
});

app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/reviews', reviewsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BOGOLAND server running on port ${PORT}`);
});
