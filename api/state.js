import { getPool, initializeStorage } from "./_lib/db.js";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function normalizePayload(payload) {
  return {
    people: Array.isArray(payload?.people) ? payload.people : [],
    categories: Array.isArray(payload?.categories) ? payload.categories : [],
  };
}

function getRoomId(req) {
  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get("roomId") || "default";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

async function getRoomState(roomId) {
  const pool = getPool();
  const { rows } = await pool.query(
    `
      select room_id, payload, version, updated_at
      from seating_state
      where room_id = $1
    `,
    [roomId],
  );

  if (rows[0]) return rows[0];

  const { rows: insertedRows } = await pool.query(
    `
      insert into seating_state (room_id, payload)
      values ($1, $2::jsonb)
      on conflict (room_id) do update set room_id = excluded.room_id
      returning room_id, payload, version, updated_at
    `,
    [roomId, JSON.stringify({ people: [], categories: [] })],
  );

  return insertedRows[0];
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Allow", "GET, PUT, OPTIONS");
    res.end();
    return;
  }

  if (!["GET", "PUT"].includes(req.method)) {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    await initializeStorage();

    if (req.method === "GET") {
      const roomId = getRoomId(req);
      const row = await getRoomState(roomId);

      sendJson(res, 200, {
        roomId: row.room_id,
        payload: normalizePayload(row.payload),
        version: row.version,
        updatedAt: row.updated_at,
      });
      return;
    }

    const body = await readJsonBody(req);
    const roomId = typeof body.roomId === "string" && body.roomId.trim() ? body.roomId.trim() : "default";
    const payload = normalizePayload(body.payload);
    const version = Number(body.version);

    if (!Number.isInteger(version) || version < 1) {
      sendJson(res, 400, { error: "A valid version is required" });
      return;
    }

    const pool = getPool();
    const { rows } = await pool.query(
      `
        update seating_state
        set payload = $1::jsonb,
            version = version + 1,
            updated_at = now()
        where room_id = $2
          and version = $3
        returning room_id, payload, version, updated_at
      `,
      [JSON.stringify(payload), roomId, version],
    );

    if (!rows[0]) {
      const latest = await getRoomState(roomId);
      sendJson(res, 409, {
        error: "Version conflict",
        code: "VERSION_CONFLICT",
        version: latest.version,
        updatedAt: latest.updated_at,
        payload: normalizePayload(latest.payload),
      });
      return;
    }

    sendJson(res, 200, {
      ok: true,
      roomId: rows[0].room_id,
      version: rows[0].version,
      updatedAt: rows[0].updated_at,
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : "Unexpected server error",
    });
  }
}
