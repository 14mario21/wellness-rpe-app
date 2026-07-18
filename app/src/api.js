// Cliente HTTP mínimo para hablar con el servidor de notificaciones.
import { SERVER_URL } from './config';

async function request(path, options = {}) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text}`);
  }
  return res.json().catch(() => ({}));
}

// El jugador registra su token de push junto a su nombre.
export function registerPlayer(name, token) {
  return request('/register', {
    method: 'POST',
    body: JSON.stringify({ name, token }),
  });
}

// El entrenador consulta el horario actual.
export function getSchedule() {
  return request('/schedule');
}

// El entrenador guarda el horario (días + horas de Wellness y RPE).
export function saveSchedule(schedule) {
  return request('/schedule', {
    method: 'POST',
    body: JSON.stringify(schedule),
  });
}

// El entrenador lanza un aviso manual: type = 'wellness' | 'rpe'.
export function sendNow(type) {
  return request('/send', {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

// Lista de jugadores registrados (para el panel del entrenador).
export function getPlayers() {
  return request('/players');
}
