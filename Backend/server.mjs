import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.mjs';
import authRoutes         from './Routes/auth.mjs';
import customerRoutes     from './Routes/customers.mjs';
import productRoutes      from './Routes/products.mjs';
import orderRoutes        from './Routes/orders.mjs';
import trainingRoutes     from './Routes/training.mjs';
import deliveryRoutes     from './Routes/delivery.mjs';
import consultationRoutes from './Routes/consultation.mjs';

await connectDB();

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

app.get('/', (_, res) => res.json({ message: 'Belle Kreyashon API running ✅' }));

app.use('/api/auth',         authRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/training',     trainingRoutes);
app.use('/api/delivery',     deliveryRoutes);
app.use('/api/consultation', consultationRoutes);

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
