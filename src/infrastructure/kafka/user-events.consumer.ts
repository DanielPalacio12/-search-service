import { Kafka, logLevel, type Consumer, type SASLOptions } from 'kafkajs';
import type { HandleUserEvent } from '../../application/use-cases/handle-user-event';
import { withRetry } from '../../application/retry';
import type { AppConfig } from '../config/env';

export class UserEventsConsumer {
  private readonly consumer: Consumer;

  constructor(
    private readonly cfg: AppConfig['kafka'],
    private readonly handler: HandleUserEvent,
  ) {
    const kafka = new Kafka({
      clientId: 'search-service',
      brokers: cfg.brokers,
      logLevel: logLevel.WARN,
      connectionTimeout: 10000,
      authenticationTimeout: 10000,
      ssl: cfg.ssl ? (cfg.ca ? { ca: [cfg.ca] } : true) : false,
      sasl: { mechanism: cfg.mechanism, username: cfg.username, password: cfg.password } as SASLOptions,
    });
    this.consumer = kafka.consumer({ groupId: cfg.groupId });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    for (const topic of this.cfg.topics) {
      await this.consumer.subscribe({ topic, fromBeginning: this.cfg.fromBeginning });
    }
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value = message.value?.toString();
        if (!value) return;
        // Si OpenSearch sigue fallando, el error sube: kafkajs no confirma el offset
        // y vuelve a entregar el mensaje.
        await withRetry(() => this.handler.execute(value), { attempts: 3, delayMs: 1000 });
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
