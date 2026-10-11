/**
 * Configuracion central de la aplicacion leida desde variables de entorno.
 * Unica puerta de acceso a configuracion; nunca se hardcodean secretos aqui.
 */
export function loadConfig(env = process.env) {
  return {
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 3000),
    databaseUrl: env.DATABASE_URL ?? 'postgresql://cdq:cdq@localhost:5432/cdq',
    sessionSecret: env.SESSION_SECRET ?? 'dev-secret-cambiar-en-produccion',
    sessionTtlMs: Number(env.SESSION_TTL_MS ?? 8 * 60 * 60 * 1000),
    admin: {
      username: env.ADMIN_USER ?? 'admin',
      password: env.ADMIN_PASSWORD ?? 'admin123',
      name: env.ADMIN_NAME ?? 'Administrador',
    },
    cajero: {
      username: env.CAJERO_USER ?? 'cajero',
      password: env.CAJERO_PASSWORD ?? 'cajero123',
      name: env.CAJERO_NAME ?? 'Cajero Principal',
    },
  };
}
