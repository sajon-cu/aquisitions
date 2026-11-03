import 'dotenv/config';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Neon Local speaks the Neon HTTP protocol on plain HTTP at /sql.
// In development, point the serverless driver at it; in production it uses Neon Cloud.
if (process.env.NODE_ENV === 'development') {
    // const { hostname, port } = new URL(process.env.DATABASE_URL);
    neonConfig.fetchEndpoint = 'http://neon-local:5432/sql';
    neonConfig.useSecureWebSocket = false;
    neonConfig.poolQueryViaFetch = true;
}

const sql = neon(process.env.DATABASE_URL);

const db = drizzle(sql);

export { db, sql };
