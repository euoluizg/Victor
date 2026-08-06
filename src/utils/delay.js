import logger from '../logger/index.js';

/**
 * Retorna uma Promise que resolve após um tempo aleatório entre min e max.
 * @param {number} min - Tempo mínimo em ms
 * @param {number} max - Tempo máximo em ms
 * @returns {Promise<void>}
 */
export const randomDelay = (min, max) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  logger.info(`Delay iniciado de ${delay}ms para humanização.`);
  return new Promise(resolve => setTimeout(resolve, delay));
};
