import express from 'express';
import webhookRoutes from './routes/webhook.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Configura limite alto para caso payloads do waha venham grandes
app.use(express.json({ limit: '5mb' }));

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Root Route para evitar 404 no navegador
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🤖 WAHA Auto Vote Bot está rodando!</h2>
        <p>A API está online. Configure o webhook do WAHA para apontar para: <b>http://SEU_IP:8080/webhook</b></p>
      </body>
    </html>
  `);
});

// Monta as rotas de webhook
app.use('/webhook', webhookRoutes);

// Registra middleware de erro por último
app.use(errorHandler);

export default app;
