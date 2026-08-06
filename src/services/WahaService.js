import axios from 'axios';
import { env } from '../config/env.js';
import { WAHA_ENDPOINTS } from '../constants/waha.js';
import logger from '../logger/index.js';

/**
 * Service specifically for interacting with the WAHA API.
 */
class WahaService {
  constructor() {
    this.api = axios.create({
      baseURL: env.WAHA_URL,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': env.WAHA_API_KEY,
      },
      timeout: 10000,
    });
  }

  /**
   * Envia um voto para a enquete especificada.
   * @param {string} chatId 
   * @param {string} pollMessageId 
   * @param {string} option 
   * @returns {Promise<Object>} Resposta da API
   */
  async sendPollVote(chatId, pollMessageId, option, sessionName = env.WAHA_SESSION) {
    try {
      const payload = {
        session: sessionName,
        chatId: chatId,
        pollMessageId: pollMessageId,
        pollServerId: null,
        votes: [option],
      };

      logger.info('Enviando requisição de voto para o WAHA...', { endpoint: WAHA_ENDPOINTS.SEND_POLL_VOTE, payload });
      
      const response = await this.api.post(WAHA_ENDPOINTS.SEND_POLL_VOTE, payload);
      
      logger.info('Voto computado pelo WAHA com sucesso!', { status: response.status, data: response.data });
      return response.data;
    } catch (error) {
      if (error.response) {
        logger.error('WAHA API retornou erro HTTP.', { status: error.response.status, data: error.response.data });
      } else if (error.request) {
        logger.error('Falha de conexão com WAHA API (Timeout ou Offline).', { message: error.message });
      } else {
        logger.error('Erro desconhecido ao tentar enviar requisição para WAHA.', { message: error.message, stack: error.stack });
      }
      throw error;
    }
  }
}

export default new WahaService();
