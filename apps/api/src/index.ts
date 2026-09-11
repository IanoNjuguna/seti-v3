import fastify from 'fastify';
import { config } from './config/index.js';
import { healthRoutes } from './routes/health.js';
import { quoteRoutes } from './routes/quotes.js';
import { whatsappRoutes } from './routes/whatsapp.js';

const app = fastify({ logger: true });

app.register(healthRoutes, { prefix: '/' });
app.register(quoteRoutes, { prefix: '/api/v1' });
app.register(whatsappRoutes, { prefix: '/api/v1' });

async function main() {
  try {
    await app.listen({ port: Number(config.PORT), host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
