import { createServer } from 'node:http';
import { env } from './config/env.mjs';
import { handleRequest } from './app.mjs';

const server = createServer(handleRequest);

server.listen(env.port, env.host, () => {
  console.log(`@kuli/api listening on http://${env.host}:${env.port}`);
});
