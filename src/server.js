import { env } from './config/env.js';
import app from './app.js';
import logger from './logger/index.js';

// Prevenção de quebra da aplicação em exceções não tratadas de Promises
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Prevenção de quebra da aplicação por exceções síncronas não tratadas
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', { error: error.message, stack: error.stack });
});

const startServer = () => {
  app.listen(env.PORT, () => {
    logger.info(`=================================================`);
    logger.info(`🚀 Servidor iniciado na porta ${env.PORT}`);
    logger.info(`📡 Escutando Webhooks em http://localhost:${env.PORT}/webhook`);
    logger.info(`🌐 WAHA API configurada para: ${env.WAHA_URL} (Sessão: ${env.WAHA_SESSION})`);
    logger.info(`⏱️  Delay configurado entre ${env.VOTE_DELAY_MIN}ms e ${env.VOTE_DELAY_MAX}ms`);
    logger.info(`=================================================`);
  });
};

startServer();
