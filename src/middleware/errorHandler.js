import logger from '../logger/index.js';

/**
 * Middleware global para tratamento de erros.
 * Impede que o Express encerre a aplicação devido a exceções não tratadas nas rotas.
 */
export const errorHandler = (err, req, res, next) => {
  logger.error('Erro global capturado pelo Middleware:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Se a resposta já foi enviada, passa pro padrão do express
  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    status: 'error',
    message: 'Ocorreu um erro interno no servidor.',
  });
};
