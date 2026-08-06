import { Router } from 'express';
import webhookController from '../controllers/WebhookController.js';

const router = Router();

// Rota para recebimento de eventos do WAHA (O WAHA envia como POST)
router.post('/', webhookController.handleWebhook);

// Rota amigável caso o usuário acesse pelo navegador (GET)
router.get('/', (req, res) => {
  res.status(200).send(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h3>✅ O endpoint de Webhook está ativo!</h3>
        <p>Esta URL (<b>/webhook</b>) deve ser configurada dentro do painel/configuração do WAHA para receber eventos via <b>POST</b>.</p>
      </body>
    </html>
  `);
});

export default router;
