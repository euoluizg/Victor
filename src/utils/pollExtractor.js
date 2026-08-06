import logger from '../logger/index.js';

/**
 * Cobre os formatos mais comuns entre engines do WAHA (NOWEB/Baileys, GOWS, WEBJS).
 * Extrai os dados essenciais da enquete.
 * 
 * @param {Object} payload O payload recebido via webhook do WAHA
 * @returns {Object|null} Retorna o objeto com dados da enquete ou null se não for enquete
 */
export const extractPoll = (payload) => {
  let options = null;
  let pollName = "Enquete";

  // NOWEB (Baileys)
  if (payload._data?.message?.pollCreationMessage?.options) {
    options = payload._data.message.pollCreationMessage.options.map((o) => o.optionName ?? o.name);
    pollName = payload._data.message.pollCreationMessage.name || pollName;
  } else if (payload._data?.message?.pollCreationMessageV2?.options) {
    options = payload._data.message.pollCreationMessageV2.options.map((o) => o.optionName ?? o.name);
    pollName = payload._data.message.pollCreationMessageV2.name || pollName;
  } else if (payload._data?.message?.pollCreationMessageV3?.options) {
    options = payload._data.message.pollCreationMessageV3.options.map((o) => o.optionName ?? o.name);
    pollName = payload._data.message.pollCreationMessageV3.name || pollName;
  }
  // Formato genérico normalizado pelo WAHA (ou v2)
  else if (payload.poll?.options) {
    options = payload.poll.options.map((o) => (typeof o === "string" ? o : o.name || o.optionName));
    pollName = payload.poll.name || pollName;
  }
  // GOWS costuma expor os dados brutos em _data também
  else if (payload._data?.pollOptions) {
    options = payload._data.pollOptions.map((o) => (typeof o === "string" ? o : o.name || o.optionName));
    pollName = payload._data.pollName || pollName;
  } else if (payload._data?.Message?.pollCreationMessage?.options) {
    options = payload._data.Message.pollCreationMessage.options.map((o) => o.optionName ?? o.name);
    pollName = payload._data.Message.pollCreationMessage.name || pollName;
  }

  if (!options || options.length === 0) return null;
  options = options.filter((o) => typeof o === "string" && o.length > 0);
  if (options.length === 0) return null;

  const pollMessageId = payload.id || payload._data?.id || payload._data?.key?.id;
  const chatId = payload.from || payload.chatId || payload._data?.key?.remoteJid;
  // Extrai o nome do grupo se disponível, ou o próprio chatId
  const groupName = payload._data?.groupName || payload.pushName || chatId;

  if (!pollMessageId || !chatId) {
    logger.warn("Enquete detectada, mas faltam identificadores cruciais (chatId ou pollMessageId).", { payload });
    return null;
  }

  return {
    chatId,
    pollMessageId,
    options,
    name: pollName,
    groupName
  };
};
