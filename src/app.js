import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFound } from './middleware/not-found.js';
import aiRoutes from './routes/ai-routes.js';
import authRoutes from './routes/auth-routes.js';
import plantRoutes from './routes/plant-routes.js';

export const app = express();
const origins = env.CORS_ORIGIN.split(',').map((item) => item.trim());

app.use(helmet());
app.use(cors({
  origin: origins.includes('*') ? true : origins,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/plants', plantRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use(notFound);
app.use(errorHandler);
