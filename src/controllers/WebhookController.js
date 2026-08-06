import logger from '../logger/index.js';
import voteService from '../services/VoteService.js';
import { extractPoll } from '../utils/pollExtractor.js';
import { WAHA_EVENTS } from '../constants/waha.js';

class WebhookController {
  /**
   * Processa as requisições de webhook enviadas pelo WAHA.
   * Responde rapidamente com 200 OK para evitar timeouts na API do WhatsApp,
   * e processa a lógica em background.
   */
  async handleWebhook(req, res, next) {
    try {
      const body = req.body;

      // Responde com 200 imediatamente.
      res.status(200).send('OK');

      // Processa apenas eventos do tipo MESSAGE
      if (!body || body.event !== WAHA_EVENTS.MESSAGE) {
        return;
      }

      const payload = body.payload || {};
      
      // Ignora enquetes enviadas pelo próprio número (opcional, mas evita loop de votos no próprio poll)
      if (payload.fromMe) {
        logger.debug('Mensagem enviada pela própria conta. Ignorando.');
        return;
      }

      // Extrai os dados da enquete (retorna null se não for enquete)
      const poll = extractPoll(payload);

      if (!poll) {
        // Não é uma enquete ou não tem opções
        return;
      }

      logger.info('Enquete recebida no webhook!', { pollName: poll.name, chatId: poll.chatId, group: poll.groupName });

      // Inicia processamento assíncrono (não bloqueia a response do express)
      voteService.processVote(poll).catch(err => {
        logger.error('Erro no processamento background do VoteService.', { error: err.message });
      });

    } catch (error) {
      // Como já enviamos o `res.status(200)`, não passamos o erro pro `next(error)` se a response já foi enviada,
      // a menos que não tenha sido. Mas o bloco principal já lida de forma segura.
      logger.error('Exceção capturada no WebhookController.', { error: error.message, stack: error.stack });
    }
  }
}

export default new WebhookController();
