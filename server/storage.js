// Almacenamiento del servidor.
// - En LOCAL: guarda en un archivo data.json.
// - En PRODUCCIÓN: si existen las variables UPSTASH_REDIS_REST_URL y
//   UPSTASH_REDIS_REST_TOKEN, guarda todo el estado como un blob JSON en Upstash
//   (Redis gratuito), para que sobreviva a los reinicios del hosting.
//
// Las lecturas son síncronas (desde memoria); solo la escritura persiste (async).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data.json');
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const UP_KEY = 'wellness_rpe_data';
const useUpstash = !!(UP_URL && UP_TOKEN);

const DEFAULT_DATA = {
  // players: { [nombre]: { subscription, updatedAt } }
  players: {},
  schedule: {
    days: [1, 3, 5], // Lun, Mié, Vie (0=Dom..6=Sáb)
    wellnessTime: '17:30',
    rpeTime: '19:30',
    enabled: true,
  },
};

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));

function merge(parsed) {
  data = {
    ...DEFAULT_DATA,
    ...parsed,
    schedule: { ...DEFAULT_DATA.schedule, ...(parsed.schedule || {}) },
  };
}

// --- Backend Upstash (REST) ---
async function upstashGet() {
  const res = await fetch(`${UP_URL}/get/${UP_KEY}`, {
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
  });
  if (!res.ok) throw new Error('Upstash GET ' + res.status);
  const json = await res.json();
  return json.result ? JSON.parse(json.result) : null;
}

async function upstashSet() {
  const res = await fetch(`${UP_URL}/set/${UP_KEY}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UP_TOKEN}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Upstash SET ' + res.status);
}

// --- Carga inicial ---
async function init() {
  if (useUpstash) {
    try {
      const parsed = await upstashGet();
      if (parsed) merge(parsed);
      console.log('Almacenamiento: Upstash (Redis).');
    } catch (e) {
      console.error('Upstash no disponible, uso valores por defecto:', e.message);
    }
  } else {
    try {
      merge(JSON.parse(fs.readFileSync(FILE, 'utf8')));
    } catch {
      /* archivo aún no existe */
    }
    console.log('Almacenamiento: archivo local (data.json).');
  }
}

// Persiste el estado (sin bloquear al que llama).
function persist() {
  if (useUpstash) {
    upstashSet().catch((e) => console.error('Error guardando en Upstash:', e.message));
  } else {
    try {
      fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Error guardando data.json:', e.message);
    }
  }
}

module.exports = {
  init,
  getData: () => data,

  upsertPlayer(name, subscription) {
    data.players[name] = { subscription, updatedAt: new Date().toISOString() };
    persist();
  },

  getPlayers() {
    return Object.entries(data.players).map(([name, v]) => ({
      name,
      updatedAt: v.updatedAt,
    }));
  },

  // Devuelve [{ name, subscription }]
  getSubscriptions() {
    return Object.entries(data.players)
      .filter(([, v]) => v.subscription)
      .map(([name, v]) => ({ name, subscription: v.subscription }));
  },

  getSchedule() {
    return data.schedule;
  },

  setSchedule(schedule) {
    const clean = {};
    if (Array.isArray(schedule.days)) clean.days = schedule.days;
    if (typeof schedule.wellnessTime === 'string') clean.wellnessTime = schedule.wellnessTime;
    if (typeof schedule.rpeTime === 'string') clean.rpeTime = schedule.rpeTime;
    if (typeof schedule.enabled === 'boolean') clean.enabled = schedule.enabled;
    data.schedule = { ...data.schedule, ...clean };
    persist();
    return data.schedule;
  },

  // Elimina un jugador por su nombre exacto. Devuelve true si existía.
  removePlayer(name) {
    if (!data.players[name]) return false;
    delete data.players[name];
    persist();
    return true;
  },

  removeByEndpoint(endpoint) {
    for (const [name, v] of Object.entries(data.players)) {
      if (v.subscription && v.subscription.endpoint === endpoint) {
        delete data.players[name];
      }
    }
    persist();
  },
};
