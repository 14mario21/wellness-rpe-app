'use strict';
const CFG = window.APP_CONFIG;
const STORAGE_KEY = 'wellness.user.v1';

// --- Utilidades ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function show(screenId) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#' + screenId).classList.add('active');
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

function getUser() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function setUser(u) { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); }
function clearUser() { localStorage.removeItem(STORAGE_KEY); }

// VAPID: convierte la clave pública (base64url) a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// --- Detección de entorno (iOS / PWA instalada) ---
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;
const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// --- Service Worker ---
async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.warn('SW no registrado:', e);
    return null;
  }
}

// --- Push ---
async function subscribeToPush(name) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await fetch('/api/vapidPublicKey');
    const { key } = await res.json();
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }
  await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, subscription: sub }),
  });
  return sub;
}

// Actualiza el aviso y el botón de notificaciones en la pantalla del jugador.
async function updateNotifUI() {
  const badge = $('#notif-badge');
  const enableBtn = $('#enable-notif');
  const iosHint = $('#ios-install-hint');
  enableBtn.hidden = true;
  iosHint.hidden = true;

  // En iPhone las push solo funcionan si la app está "instalada" (pantalla de inicio).
  if (isIOS && !isStandalone) {
    iosHint.hidden = false;
    badge.className = 'badge badge-warn';
    badge.textContent = '⚠️ Añade la app a la pantalla de inicio para recibir avisos';
    return;
  }

  if (!pushSupported) {
    badge.className = 'badge badge-warn';
    badge.textContent = '⚠️ Este navegador no admite notificaciones';
    return;
  }

  const perm = Notification.permission;
  if (perm === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      badge.className = 'badge badge-ok';
      badge.textContent = '🔔 Notificaciones activadas';
    } else {
      // Permiso concedido pero sin suscripción: la creamos.
      enableBtn.hidden = false;
      badge.className = 'badge badge-warn';
      badge.textContent = 'Pulsa «Activar notificaciones» para terminar';
    }
  } else if (perm === 'denied') {
    badge.className = 'badge badge-warn';
    badge.textContent = '⚠️ Notificaciones bloqueadas. Actívalas en los ajustes.';
  } else {
    enableBtn.hidden = false;
    badge.className = 'badge badge-warn';
    badge.textContent = '🔕 Notificaciones desactivadas';
  }
}

async function onEnableNotifications() {
  const user = getUser();
  if (!user) return;
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast('No se concedió el permiso de notificaciones');
      await updateNotifUI();
      return;
    }
    await subscribeToPush(user.name);
    toast('¡Notificaciones activadas!');
  } catch (e) {
    toast('Error activando notificaciones');
    console.error(e);
  }
  await updateNotifUI();
}

// --- Formularios ---
function openForm(type) {
  const isRpe = type === 'rpe';
  $('#form-title').textContent = isRpe ? 'RPE (post-entrenamiento)' : 'Wellness (pre-entrenamiento)';
  $('#form-frame').src = isRpe ? CFG.RPE_URL : CFG.WELLNESS_URL;
  show('screen-form');
}
function closeForm() {
  $('#form-frame').src = 'about:blank';
  show('screen-player');
}

// --- Pantallas ---
function showPlayer() {
  const user = getUser();
  $('#player-hello').textContent = 'Hola, ' + user.name;
  show('screen-player');
  updateNotifUI();
  // Si el jugador ya dio permiso, nos aseguramos de que esté suscrito.
  if (pushSupported && (!isIOS || isStandalone) && Notification.permission === 'granted') {
    subscribeToPush(user.name).catch(() => {});
  }
}

// --- Panel del entrenador ---
const DAYS = [
  { v: 1, label: 'L' }, { v: 2, label: 'M' }, { v: 3, label: 'X' },
  { v: 4, label: 'J' }, { v: 5, label: 'V' }, { v: 6, label: 'S' }, { v: 0, label: 'D' },
];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
let coachDays = [];
let coachEnabled = true;

function renderDays() {
  const el = $('#days');
  el.innerHTML = '';
  DAYS.forEach((d) => {
    const b = document.createElement('button');
    b.className = 'day' + (coachDays.includes(d.v) ? ' on' : '');
    b.textContent = d.label;
    b.onclick = () => {
      coachDays = coachDays.includes(d.v) ? coachDays.filter((x) => x !== d.v) : [...coachDays, d.v];
      renderDays();
    };
    el.appendChild(b);
  });
}

function renderAutoToggle() {
  const b = $('#toggle-auto');
  b.textContent = coachEnabled ? '✅ Automático activado' : '⏸️ Automático pausado';
  b.className = 'btn btn-secondary';
}

async function showCoach() {
  show('screen-coach');
  try {
    const [s, players] = await Promise.all([
      fetch('/api/schedule').then((r) => r.json()),
      fetch('/api/players').then((r) => r.json()).catch(() => []),
    ]);
    coachDays = s.days || [];
    coachEnabled = s.enabled !== false;
    $('#wellness-time').value = s.wellnessTime || '17:30';
    $('#rpe-time').value = s.rpeTime || '19:30';
    $('#players-count').textContent = (players.length || 0) + ' jugador(es) registrados';
    renderDays();
    renderAutoToggle();
  } catch (e) {
    toast('Sin conexión con el servidor');
  }
}

async function saveSchedule() {
  const wellnessTime = $('#wellness-time').value.trim();
  const rpeTime = $('#rpe-time').value.trim();
  if (!TIME_RE.test(wellnessTime) || !TIME_RE.test(rpeTime)) {
    toast('Hora no válida. Usa HH:MM, p. ej. 17:30');
    return;
  }
  try {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: coachDays, wellnessTime, rpeTime, enabled: coachEnabled }),
    });
    toast('Horario guardado');
  } catch {
    toast('Error al guardar');
  }
}

async function manualSend(type) {
  try {
    const r = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }).then((res) => res.json());
    toast(`Aviso ${type === 'rpe' ? 'RPE' : 'Wellness'} enviado a ${r.sent ?? 0} jugador(es)`);
  } catch {
    toast('Error al enviar');
  }
}

// --- Enrutado de acciones (delegación de eventos) ---
const ACTIONS = {
  'choose-player': () => { $('#setup-choose').hidden = true; $('#setup-player').hidden = false; },
  'choose-coach': () => { $('#setup-choose').hidden = true; $('#setup-coach').hidden = false; },
  'back-choose': () => {
    $('#setup-choose').hidden = false;
    $('#setup-player').hidden = true;
    $('#setup-coach').hidden = true;
  },
  'enter-player': () => {
    const name = $('#player-name').value.trim();
    if (name.length < 2) { toast('Escribe tu nombre'); return; }
    setUser({ role: 'player', name });
    showPlayer();
  },
  'enter-coach': () => {
    if ($('#coach-pin').value !== CFG.COACH_PIN) { toast('PIN incorrecto'); return; }
    setUser({ role: 'coach', name: 'Entrenador' });
    showCoach();
  },
  'open-wellness': () => openForm('wellness'),
  'open-rpe': () => openForm('rpe'),
  'close-form': () => closeForm(),
  'send-wellness': () => manualSend('wellness'),
  'send-rpe': () => manualSend('rpe'),
  'toggle-auto': () => { coachEnabled = !coachEnabled; renderAutoToggle(); },
  'save-schedule': () => saveSchedule(),
  'logout': () => {
    clearUser();
    $('#setup-choose').hidden = false;
    $('#setup-player').hidden = true;
    $('#setup-coach').hidden = true;
    show('screen-setup');
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn();
});
$('#enable-notif').addEventListener('click', onEnableNotifications);

// --- Arranque ---
(async function init() {
  await registerSW();

  // ¿Se abrió desde una notificación? (?form=wellness|rpe)
  const params = new URLSearchParams(location.search);
  const formParam = params.get('form');

  const user = getUser();
  if (user && user.role === 'player') {
    showPlayer();
    if (formParam === 'wellness' || formParam === 'rpe') openForm(formParam);
  } else if (user && user.role === 'coach') {
    showCoach();
  } else {
    show('screen-setup');
  }
})();
