import { createServer } from 'node:http';
import { env } from './config/env.mjs';
import { getAppContext, handleRequest } from './app.mjs';

const start = async () => {
  await getAppContext();

  const server = createServer(handleRequest);

  server.listen(env.port, env.host, () => {
    console.log(`@kuli/api listening on http://${env.host}:${env.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start @kuli/api', error);
  process.exitCode = 1;
});
