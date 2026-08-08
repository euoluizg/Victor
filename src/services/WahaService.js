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

  /**
   * Obtém a lista de grupos em que o WhatsApp está conectado.
   * @param {string} sessionName 
   * @returns {Promise<Array>} Lista de grupos
   */
  async getGroups(sessionName = env.WAHA_SESSION) {
    try {
      const response = await this.api.get(`/api/${sessionName}/groups`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao buscar grupos do WAHA', { message: error.message });
      throw error;
    }
  }

  /**
   * Obtém o status da sessão.
   * @param {string} sessionName 
   * @returns {Promise<Object>} Status da sessão
   */
  async getSessionStatus(sessionName = env.WAHA_SESSION) {
    try {
      const response = await this.api.get(`/api/sessions/${sessionName}`);
      return response.data;
    } catch (error) {
      // Retorna objeto indicando que não existe se falhar com 404
      if (error.response && error.response.status === 404) {
        return { status: 'STOPPED' };
      }
      throw error;
    }
  }

  /**
   * Inicia a sessão.
   * @param {string} sessionName 
   */
  async startSession(sessionName = env.WAHA_SESSION) {
    try {
      await this.api.post('/api/sessions/start', { name: sessionName });
    } catch (error) {
      logger.error('Erro ao iniciar sessão no WAHA', { message: error.message });
      throw error;
    }
  }

  /**
   * Para a sessão.
   * @param {string} sessionName 
   */
  async stopSession(sessionName = env.WAHA_SESSION) {
    try {
      await this.api.post('/api/sessions/stop', { name: sessionName });
    } catch (error) {
      logger.error('Erro ao parar sessão no WAHA', { message: error.message });
      throw error;
    }
  }

  /**
   * Puxa o QR Code da sessão.
   * @param {string} sessionName 
   */
  async getQrCode(sessionName = env.WAHA_SESSION) {
    try {
      const response = await this.api.get(`/api/sessions/${sessionName}/auth/qr?format=raw`);
      return response.data; // Retorna dados binários ou string dependendo da API
    } catch (error) {
      logger.error('Erro ao buscar QR Code', { message: error.message });
      throw error;
    }
  }
}

export default new WahaService();
