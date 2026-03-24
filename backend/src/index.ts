import http from 'http';
import { createApp } from './app';
import { setupSocketIO } from './socket';
import { config } from './config/config';

const app = createApp();
const server = http.createServer(app);
setupSocketIO(server);

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
