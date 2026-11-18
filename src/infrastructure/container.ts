import { HandleUserEvent } from '../application/use-cases/handle-user-event';
import { IndexUser } from '../application/use-cases/index-user';
import { RemoveUser } from '../application/use-cases/remove-user';
import { SearchUsers } from '../application/use-cases/search-users';
import { loadEnv } from './config/env';
import { UserEventsConsumer } from './kafka/user-events.consumer';
import { OpenSearchIndexAdapter } from './opensearch/opensearch-index.adapter';
import { JoseJwtVerifier } from './security/jwt-verifier';

const logger = {
  info: (m: string) => console.log(`[search] ${m}`),
  warn: (m: string) => console.warn(`[search] ${m}`),
};

/** Composición perezosa: el entorno se valida al primer uso, no al compilar. */
export function buildContainer() {
  const config = loadEnv();
  const index = new OpenSearchIndexAdapter(config.opensearch);
  return {
    config,
    index,
    searchUsers: new SearchUsers(index),
    tokenVerifier: new JoseJwtVerifier(config.jwtSecret),
    createConsumer: () =>
      new UserEventsConsumer(
        config.kafka,
        new HandleUserEvent(new IndexUser(index), new RemoveUser(index), logger),
      ),
  };
}

let cached: ReturnType<typeof buildContainer> | undefined;
export function getContainer() {
  return (cached ??= buildContainer());
}
