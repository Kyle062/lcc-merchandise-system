import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';
import settingsRoutes from './routes/settingsRoutes';
import studentRoutes from './routes/studentRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import tailorRoutes from './routes/tailorRoutes';
import refundRoutes from './routes/refundRoutes';
const app = express();

app.use(cors());
// Profile pictures are sent as base64 data URLs, so the default 100kb body
// limit is too small.
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'LCC Merchandise API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/student', studentRoutes); 
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tailor', tailorRoutes);
app.use('/api/refunds', refundRoutes);
console.log('✅ app.ts loaded — all routes registered');

export default app;