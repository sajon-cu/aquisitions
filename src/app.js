import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoute from '#routes/auth.route.js';
import securityMiddleware from '#middleware/security.middleware.js';
import userRoute from '#routes/user.route.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
    morgan('combined', {
        stream: { write: message => logger.info(message.trim()) },
    })
);

// Health check stays before security middleware so container probes aren't bot-blocked or rate-limited
app.get('/health', (req, res) => {
    res.status(200).send({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use(securityMiddleware);

app.get('/', (req, res) => {
    logger.info('Hello from acquisition');
    res.status(200).send('Hello from acquisition');
});

app.get('/api', (req, res) => {
    res.status(200).send({ message: 'Acquisition API running!' });
});

app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);

app.use((req, res) => {
    res.status(404).json({ error: 'Route not found!' });
});

export default app;
