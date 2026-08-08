import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import basicAuth from 'express-basic-auth';
import webhookRoutes from './routes/webhook.js';
import { errorHandler } from './middleware/errorHandler.js';
import dynamicConfig from './config/dynamicConfig.js';
import wahaService from './services/WahaService.js';

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auth configuration for Admin Panel (uses the same credentials as WAHA to keep it simple)
const adminAuth = basicAuth({
  users: { [process.env.WAHA_DASHBOARD_USERNAME || 'admin']: process.env.WAHA_DASHBOARD_PASSWORD || 'Waha@123456' },
  challenge: true,
  realm: 'BotVote Admin'
});

// Admin Panel UI Route
app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin API Routes
app.get('/admin/api/settings', adminAuth, (req, res) => {
  res.json({ targetGroups: dynamicConfig.getTargetGroups() });
});

app.post('/admin/api/settings', adminAuth, (req, res) => {
  const { action, group } = req.body;
  if (!action || !group) return res.status(400).json({ error: 'Missing action or group' });

  let success = false;
  if (action === 'add') {
    success = dynamicConfig.addTargetGroup(group);
  } else if (action === 'remove') {
    success = dynamicConfig.removeTargetGroup(group);
  }

  if (success) {
    res.status(200).json({ success: true, targetGroups: dynamicConfig.getTargetGroups() });
  } else {
    res.status(400).json({ error: 'Action failed or group already exists/not found' });
  }
});

app.get('/admin/api/delay', adminAuth, (req, res) => {
  res.json(dynamicConfig.getDelayConfig());
});

app.post('/admin/api/delay', adminAuth, (req, res) => {
  const { min, max, voteOption } = req.body;
  if (min === undefined || max === undefined || voteOption === undefined) {
    return res.status(400).json({ error: 'Missing min, max or voteOption' });
  }

  const success = dynamicConfig.updateDelayConfig(min, max, voteOption);
  
  if (success) {
    res.status(200).json({ success: true, ...dynamicConfig.getDelayConfig() });
  } else {
    res.status(400).json({ error: 'Invalid delay values' });
  }
});

app.get('/admin/api/logs', adminAuth, (req, res) => {
  try {
    const logFile = path.join(__dirname, '../data/app.log');
    if (fs.existsSync(logFile)) {
      const data = fs.readFileSync(logFile, 'utf8');
      const lines = data.split('\n').filter(Boolean);
      // Return the last 300 lines for the console
      const tail = lines.slice(-300).join('\n');
      res.json({ logs: tail });
    } else {
      res.json({ logs: 'Aguardando primeiros logs...' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler logs' });
  }
});

app.get('/admin/api/waha/groups', adminAuth, async (req, res) => {
  try {
    const groups = await wahaService.getGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar grupos do WAHA' });
  }
});

app.get('/admin/api/waha/session', adminAuth, async (req, res) => {
  try {
    const session = await wahaService.getSessionStatus();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar sessão' });
  }
});

app.post('/admin/api/waha/start', adminAuth, async (req, res) => {
  try {
    await wahaService.startSession();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar sessão' });
  }
});

// Monta as rotas de webhook
app.use('/webhook', webhookRoutes);

// Registra middleware de erro por último
app.use(errorHandler);

export default app;
