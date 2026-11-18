import { buildContainer } from '../src/infrastructure/container';

// Carga .env en desarrollo; en Render las variables ya vienen en el entorno.
try {
  process.loadEnvFile();
} catch {
  /* sin .env */
}

async function main() {
  const c = buildContainer();
  await c.index.ensureIndex();
  const consumer = c.createConsumer();
  await consumer.start();
  console.log(`[worker] Consumiendo ${c.config.kafka.topics.join(', ')} como ${c.config.kafka.groupId}`);

  const shutdown = async () => {
    await consumer.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[worker] Error fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
