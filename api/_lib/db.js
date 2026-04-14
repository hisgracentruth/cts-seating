import { Pool } from "pg";

let pool;
let initPromise;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.POSTGRES_SSL === "disable" ? false : { rejectUnauthorized: false },
    });
  }

  return pool;
}

export async function initializeStorage() {
  if (!initPromise) {
    initPromise = (async () => {
      const client = await getPool().connect();
      try {
        await client.query(`
          create table if not exists seating_state (
            room_id text primary key,
            payload jsonb not null,
            version integer not null default 1,
            updated_at timestamptz not null default now()
          )
        `);

        await client.query(
          `
            insert into seating_state (room_id, payload)
            values ($1, $2::jsonb)
            on conflict (room_id) do nothing
          `,
          ["default", JSON.stringify({ people: [], categories: [] })],
        );
      } finally {
        client.release();
      }
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export { getPool };
