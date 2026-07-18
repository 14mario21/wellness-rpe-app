// Servidor de la PWA Wellness & RPE.
// - Sirve la app web (carpeta public/).
// - Guarda las suscripciones de push de los jugadores y el horario del entrenador.
// - Envía notificaciones Web Push automáticas (cron) y manuales (/api/send).
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const webpush = require('web-push');
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Claves VAPID (autenticación de Web Push) ---
// Se generan una vez con: node -e "console.log(require('web-push').generateVAPIDKeys())"
// y se guardan en vapid.json. Se pueden sobreescribir con variables de entorno.
let vapid = {};
try {
  vapid = JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid.json'), 'utf8'));
} catch {
  vapid = {};
}
const VAPID_PUBLIC = process.env.VAPID_PUBLIC || vapid.publicKey;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || vapid.privateKey;
const CONTACT = process.env.VAPID_CONTACT || 'mailto:entrenador@example.com';

if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('FALTAN las claves VAPID. Genera vapid.json antes de arrancar.');
  process.exit(1);
}
webpush.setVapidDetails(CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Texto de cada tipo de notificación.
const MESSAGES = {
  wellness: {
    title: '📋 Cuestionario Wellness',
    body: 'Antes de entrenar: rellena tu Wellness (fatiga, sueño, estrés…).',
  },
  rpe: {
    title: '💪 Cuestionario RPE',
    body: 'Después de entrenar: valora tu esfuerzo percibido (RPE).',
  },
};

// Envía una notificación de un tipo a todos los jugadores suscritos.
async function sendNotifications(type) {
  const msg = MESSAGES[type];
  if (!msg) throw new Error('Tipo no válido');

  const subs = storage.getSubscriptions();
  const payload = JSON.stringify({ type, title: msg.title, body: msg.body });

  let sent = 0;
  await Promise.all(
    subs.map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        // 404/410 => suscripción caducada: la quitamos.
        if (err.statusCode === 404 || err.statusCode === 410) {
          storage.removeByEndpoint(subscription.endpoint);
        } else {
          console.error('Error push:', err.statusCode, err.body || err.message);
        }
      }
    })
  );
  console.log(`[${new Date().toISOString()}] Enviadas ${sent}/${subs.length} (${type})`);
  return sent;
}

// --- API ---

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Clave pública VAPID que el navegador necesita para suscribirse.
app.get('/api/vapidPublicKey', (_req, res) => res.json({ key: VAPID_PUBLIC }));

// El jugador registra su suscripción de push + su nombre.
app.post('/api/register', (req, res) => {
  const { name, subscription } = req.body || {};
  if (!name || !subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Faltan name o subscription' });
  }
  storage.upsertPlayer(String(name).trim(), subscription);
  res.json({ ok: true });
});

// Lista de jugadores (para el panel del entrenador).
app.get('/api/players', (_req, res) => res.json(storage.getPlayers()));

// Consultar / guardar el horario.
app.get('/api/schedule', (_req, res) => res.json(storage.getSchedule()));
app.post('/api/schedule', (req, res) => {
  res.json(storage.setSchedule(req.body || {}));
});

// Envío manual: { type: 'wellness' | 'rpe' }
app.post('/api/send', async (req, res) => {
  try {
    const sent = await sendNotifications(req.body?.type);
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Programación por horario ---
// Comprueba si toca enviar Wellness o RPE en este minuto. La usa tanto el
// cron interno (útil en local) como el endpoint /api/tick (lo llama un cron
// externo en producción, por si el hosting gratuito se duerme).
// Zona horaria en la que se interpretan las horas del horario (el hosting suele
// estar en UTC). Por defecto, hora peninsular española.
const TIMEZONE = process.env.TIMEZONE || 'Europe/Madrid';
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Devuelve { day, hhmm } según la zona horaria configurada.
function nowInTz() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { day: WD[get('weekday')], hhmm: `${get('hour')}:${get('minute')}` };
}

let lastFired = '';
async function runScheduledCheck() {
  const s = storage.getSchedule();
  if (!s.enabled) return;

  const { day, hhmm } = nowInTz();

  if (!Array.isArray(s.days) || !s.days.includes(day)) return;

  const stamp = `${day} ${hhmm}`;
  if (s.wellnessTime === hhmm && lastFired !== `${stamp} wellness`) {
    lastFired = `${stamp} wellness`;
    await sendNotifications('wellness');
  }
  if (s.rpeTime === hhmm && lastFired !== `${stamp} rpe`) {
    lastFired = `${stamp} rpe`;
    await sendNotifications('rpe');
  }
}

// Cron interno (cada minuto). En producción puede no ejecutarse si el hosting
// gratuito se duerme; por eso existe también /api/tick.
cron.schedule('* * * * *', () => {
  runScheduledCheck().catch((e) => console.error('Error en cron:', e.message));
});

// Endpoint para un cron externo (cron-job.org) que llama cada minuto.
// Si defines TICK_SECRET, hay que pasarlo como ?secret=...
app.all('/api/tick', async (req, res) => {
  const secret = process.env.TICK_SECRET;
  if (secret && req.query.secret !== secret) {
    return res.status(403).json({ error: 'secret inválido' });
  }
  try {
    await runScheduledCheck();
    res.json({ ok: true, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Arranque: primero carga el estado, luego escucha.
storage.init().then(() => {
  app.listen(PORT, () => {
    console.log(`PWA Wellness & RPE en http://0.0.0.0:${PORT}`);
    console.log('Horario actual:', storage.getSchedule());
  });
});
