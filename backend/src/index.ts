import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { cardRoutes } from './routes/cards';
import { prizeRoutes } from './routes/prizes';
import { originRoutes } from './routes/origins';
import { importRoutes } from './routes/imports';
import { concessaoRoutes } from './routes/concessoes';
import { cardLoadingRoutes } from './routes/cardLoading';
import { scheduleCronJobs } from './services/cronService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/prizes', prizeRoutes);
app.use('/api/origins', originRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/concessoes', concessaoRoutes);
app.use('/api/card-loading', cardLoadingRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

scheduleCronJobs();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
