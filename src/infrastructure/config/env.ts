import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('true')
  .transform((v) => v === 'true');

const schema = z.object({
  OPENSEARCH_URL: z.string().url(),
  OPENSEARCH_USERNAME: z.string().min(1),
  OPENSEARCH_PASSWORD: z.string().min(1),
  OPENSEARCH_CA: z.string().optional(),
  OPENSEARCH_INDEX: z.string().min(1).default('users'),
  KAFKA_BROKERS: z.string().min(1),
  KAFKA_SSL: bool,
  KAFKA_SSL_CA: z.string().optional(),
  KAFKA_SASL_MECHANISM: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).default('scram-sha-256'),
  KAFKA_USERNAME: z.string().min(1),
  KAFKA_PASSWORD: z.string().min(1),
  KAFKA_TOPIC_USER_EVENTS: z.string().min(1).default('users.created,users.updated,users.deleted'),
  KAFKA_GROUP_ID: z.string().min(1).default('search-service'),
  KAFKA_FROM_BEGINNING: bool,
  JWT_SECRET: z.string().min(1),
  SEARCH_ALLOWED_ROLES: z.string().min(1).default('ADMIN,REVIEWER'),
});

const pem = (v?: string) => v?.replace(/\\n/g, '\n');
const list = (v: string) =>
  v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function loadEnv(source: Record<string, string | undefined> = process.env) {
  // Una variable vacía (como en .env.example) cuenta como no definida
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ''));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    // Solo nombres de variables, nunca valores
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join('.')))].join(', ');
    throw new Error(`Variables de entorno inválidas o faltantes: ${names}`);
  }
  const e = parsed.data;
  return {
    opensearch: {
      url: e.OPENSEARCH_URL,
      username: e.OPENSEARCH_USERNAME,
      password: e.OPENSEARCH_PASSWORD,
      ca: pem(e.OPENSEARCH_CA),
      index: e.OPENSEARCH_INDEX,
    },
    kafka: {
      brokers: list(e.KAFKA_BROKERS),
      ssl: e.KAFKA_SSL,
      ca: pem(e.KAFKA_SSL_CA),
      mechanism: e.KAFKA_SASL_MECHANISM,
      username: e.KAFKA_USERNAME,
      password: e.KAFKA_PASSWORD,
      topics: list(e.KAFKA_TOPIC_USER_EVENTS),
      groupId: e.KAFKA_GROUP_ID,
      fromBeginning: e.KAFKA_FROM_BEGINNING,
    },
    jwtSecret: e.JWT_SECRET,
    allowedRoles: list(e.SEARCH_ALLOWED_ROLES).map((r) => r.toUpperCase()),
  };
}

export type AppConfig = ReturnType<typeof loadEnv>;
