import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRoutes } from './routes/index.js';
export const app = express();
app.set('trust proxy', 1);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || env.corsOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok' } });
});
app.use('/api/v1', apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
