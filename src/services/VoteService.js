import wahaService from './WahaService.js';
import { env } from '../config/env.js';
import { randomDelay } from '../utils/delay.js';
import dynamicConfig from '../config/dynamicConfig.js';
import logger from '../logger/index.js';

class VoteService {
  /**
   * Verifica se o grupo está na whitelist (TARGET_GROUPS)
   * Se TARGET_GROUPS estiver vazio na configuração, consideramos que TODOS os grupos estão liberados
   * (embora a spec peça whitelist configurável, esta é uma boa prática defensiva).
   * @param {string} chatId 
   * @returns {boolean}
   */
  isGroupAuthorized(chatId) {
    const targetGroups = dynamicConfig.getTargetGroups();

    if (!targetGroups || targetGroups.length === 0) {
      logger.warn('Nenhum grupo configurado no TARGET_GROUPS. Permitindo votos para TODOS os grupos.');
      return true;
    }
    
    // Procura por correspondência exata do ID do grupo (chatId)
    return targetGroups.some(
      (target) => target === chatId
    );
  }

  /**
   * Processa a votação após receber a enquete validada.
   * @param {Object} poll 
   * @param {string} poll.chatId
   * @param {string} poll.pollMessageId
   * @param {string[]} poll.options
   * @param {string} poll.name
   * @param {string} poll.groupName
   */
  async processVote(poll) {
    try {
      logger.info('Iniciando processamento de voto para enquete...', { pollName: poll.name, chatId: poll.chatId, groupName: poll.groupName });

      if (!this.isGroupAuthorized(poll.chatId)) {
        logger.warn(`Grupo ID "${poll.chatId}" (Nome: "${poll.groupName}") não autorizado pela whitelist. Voto ignorado.`);
        return;
      }

      // Humanização do bot (Delay)
      const delayConfig = dynamicConfig.getDelayConfig();
      await randomDelay(delayConfig.delayMin, delayConfig.delayMax);

      // Determina a opção de voto usando o índice configurado (1 para a primeira, 2 para a segunda...)
      let optionIndex = (delayConfig.voteOption || 1) - 1;
      
      // Se a opção configurada for maior do que o número de opções, cai para a última opção
      if (optionIndex >= poll.options.length) {
        logger.warn(`Opção configurada (${optionIndex + 1}) excede o total de opções na enquete (${poll.options.length}). Votando na última opção.`);
        optionIndex = poll.options.length - 1;
      }

      const selectedOption = poll.options[optionIndex];
      logger.info(`Opção escolhida para votar: "${selectedOption}"`);



      // Envia Voto via WahaService
      await wahaService.sendPollVote(poll.chatId, poll.pollMessageId, selectedOption, poll.session);

      logger.info(`Voto na enquete "${poll.name}" realizado com sucesso!`, { chatId: poll.chatId });
    } catch (error) {
      logger.error(`Falha ao processar voto na enquete "${poll.name}".`, { error: error.message, stack: error.stack });
      // Lança o erro para que não seja silenciado se a rota quiser pegar, mas como rodamos assíncrono, já logamos aqui.
    }
  }
}

export default new VoteService();
