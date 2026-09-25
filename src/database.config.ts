// Single source of truth for the database connection.
// Production (Neon, Vercel): set DATABASE_URL and SSL is turned on.
// Local development: leave DATABASE_URL unset and use the DB_* variables.

// TypeORM loads the "pg" driver with a dynamic require() at runtime, which
// Vercel'\''s bundler cannot see when tracing static imports for the function.
// This import forces pg into the deployed bundle.
import 'pg';

export function databaseConnection() {
  const url = process.env.DATABASE_URL;

  if (url) {
    return {
      type: 'postgres' as const,
      url,
      ssl: true,
      synchronize: false,
    };
  }

  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
  };
}
