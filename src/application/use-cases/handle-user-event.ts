import { parseUserEvent } from '../user-event';
import type { IndexUser } from './index-user';
import type { RemoveUser } from './remove-user';

export type HandleOutcome = 'indexed' | 'removed' | 'ignored' | 'invalid';

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
}

/**
 * Orquesta un mensaje de Kafka. Si OpenSearch falla, la excepción sube
 * para que el consumer NO marque el mensaje como procesado y reintente.
 * Mensajes ilegibles o desconocidos se registran y se saltan.
 */
export class HandleUserEvent {
  constructor(
    private readonly indexUser: IndexUser,
    private readonly removeUser: RemoveUser,
    private readonly logger: Logger,
  ) {}

  async execute(rawValue: string): Promise<HandleOutcome> {
    const event = parseUserEvent(rawValue);
    switch (event.type) {
      case 'upsert':
        await this.indexUser.execute(event.user);
        this.logger.info(`Usuario indexado id=${event.user.id}`);
        return 'indexed';
      case 'delete':
        await this.removeUser.execute(event.id);
        this.logger.info(`Usuario eliminado del índice id=${event.id}`);
        return 'removed';
      case 'unknown':
        this.logger.warn(`Evento desconocido ignorado: ${event.name}`);
        return 'ignored';
      case 'invalid':
        this.logger.warn(`Mensaje inválido descartado: ${event.reason}`);
        return 'invalid';
    }
  }
}
