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
import blogRoutes         from './Routes/blog.mjs';
import featuredRoutes     from './Routes/featured.mjs';
import certificateRoutes  from './Routes/certificates.mjs';
import marketingRoutes    from './Routes/marketing.mjs';
import contactRoutes      from './Routes/contact.mjs';
import couponRoutes       from './Routes/coupons.mjs';
import { startDigitalTrialBillingWorker } from './Services/digitalAccessService.mjs';
import { startAbandonedCartRecoveryWorker } from './Services/abandonedRecoveryService.mjs';

await connectDB();

const app = express();

app.disable('x-powered-by');
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://bellekreyashon.com',
  'https://www.bellekreyashon.com',
  'https://belle-kreyashion.pages.dev',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin)) ? cb(null, true) : cb(new Error('CORS')),
  credentials: true,
}));

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buffer) => {
    if (req.originalUrl === '/api/orders/paystack/webhook') req.rawBody = Buffer.from(buffer);
  },
}));
app.get('/', (_, res) => res.json({ message: 'Belle Kreyashon API ✅' }));

app.use('/api/auth',         authRoutes);
app.use('/api/customers',    customerRoutes);
app.use('/api/products',     productRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/training',     trainingRoutes);
app.use('/api/delivery',     deliveryRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/blog',         blogRoutes);
app.use('/api/featured',     featuredRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/marketing',    marketingRoutes);
app.use('/api/contact',      contactRoutes);
app.use('/api/coupons',      couponRoutes);

const PORT = process.env.PORT || 8002;
startDigitalTrialBillingWorker();
startAbandonedCartRecoveryWorker();
app.listen(PORT, () => console.log(`Belle Kreyashon API running on port ${PORT}`));
