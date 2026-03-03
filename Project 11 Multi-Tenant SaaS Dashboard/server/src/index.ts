import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes';
import workspaceRoutes from './routes/workspace.routes';
import memberRoutes from './routes/member.routes';
import projectRoutes from './routes/project.routes';
import billingRoutes from './routes/billing.routes';
import { webhookHandler } from './controllers/billing.controller';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL }));

// Stripe webhook needs the RAW request body for signature verification,
// so it must be registered BEFORE express.json().
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ success: true, data: null, message: 'OK' }));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/members', memberRoutes);
app.use('/api/workspaces/:workspaceId/projects', projectRoutes);
app.use('/api/workspaces/:workspaceId/billing', billingRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
