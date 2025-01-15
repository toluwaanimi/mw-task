import { buildApp } from '@app/app';
import { SERVER_CONFIG } from '@app/config/env.config';

const initServer = async () => {
  const server = await buildApp();

  if (import.meta.env.PROD) {
    try {
      await server.listen({ port: SERVER_CONFIG.PORT, host: '0.0.0.0' });
      server.log.info(`Server started on 0.0.0.0:${SERVER_CONFIG.PORT}`);
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  }

  return server;
};

export const viteNodeApp = initServer();
