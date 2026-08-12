import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { verifyDatabaseConnection } from './lib/prisma.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRoutes } from './routes/index.js';
const normalizeOrigin = (origin) => {
    try {
        return new URL(origin.trim()).origin;
    }
    catch {
        return origin.trim().replace(/\/+$/, '');
    }
};
export const app = express();
app.set('trust proxy', 1);
app.use(cors({
    origin: (origin, callback) => {
        const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
        if (!normalizedOrigin || env.corsOrigins.includes(normalizedOrigin)) {
            callback(null, true);
            return;
        }
        console.warn(`Blocked CORS origin: ${origin}`);
        callback(null, false);
    },
    credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
app.get('/', (_request, response) => {
    response.json({
        service: 'ayanfe-food-variety-api',
        status: 'ok',
        health: '/health',
        api: '/api/v1',
    });
});
app.get('/health', (_request, response) => {
    response.json({ data: { status: 'ok' } });
});
app.get('/ready', async (_request, response) => {
    try {
        await verifyDatabaseConnection();
        response.json({
            data: {
                status: 'ready',
                database: 'ok',
                imageStorage: env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
                    ? 'configured'
                    : 'not_configured',
            },
        });
    }
    catch (error) {
        console.error('Readiness check failed', error);
        response.status(503).json({
            error: {
                message: 'The API is running but cannot reach its database.',
                statusCode: 503,
            },
        });
    }
});
app.use('/api/v1', apiRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
