# Wellness & RPE — PWA del equipo

App **web instalable (PWA)** para enviar y registrar los cuestionarios de
**Wellness** (pre-entrenamiento) y **RPE** (post-entrenamiento), con
**notificaciones push** automáticas (por horario) y manuales (el entrenador las
lanza cuando quiere). Funciona **gratis en iPhone y Android** (iOS 16.4+).

- Los cuestionarios son tus **Google Forms incrustados**, así que las respuestas
  se siguen guardando en tus hojas de cálculo de siempre.
- Dos modos: **Jugador** (recibe avisos y rellena) y **Entrenador** (configura el
  horario y lanza avisos).

```
wellness-rpe-app/
├── server/            → servidor Node: sirve la PWA + Web Push + horario
│   ├── index.js
│   ├── storage.js
│   ├── public/        → la PWA (index.html, app.js, sw.js, ...)
│   └── vapid.json     → claves de push (NO se sube al repo)
├── render.yaml        → configuración de despliegue en Render
└── app/               → (obsoleto) versión nativa Expo anterior, ya no se usa
```

---

## Probar en local (en tu PC)

Requiere Node.js (https://nodejs.org).

```bash
cd server
npm install
npm start
```

Abre http://localhost:3000 en el navegador del PC. Verás la app. Ojo: las
**notificaciones push no funcionan en `http://` ni en `localhost` desde el móvil**;
para probarlas de verdad hay que desplegar con HTTPS (siguiente sección).

Las claves VAPID ya están en `server/vapid.json`. Si necesitaras regenerarlas:
```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

---

## Desplegar gratis y permanente (Render + Upstash + cron-job.org)

Necesitas 4 cuentas gratuitas (sin tarjeta): **GitHub**, **Render**, **Upstash**
y **cron-job.org**.

### 1. Subir el código a GitHub
Crea un repositorio en https://github.com y sube esta carpeta:
```bash
cd wellness-rpe-app
git init
git add .
git commit -m "Wellness & RPE PWA"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```
(`vapid.json` y `data.json` NO se suben, están en `.gitignore` — es correcto.)

### 2. Base de datos gratuita (Upstash Redis)
1. Entra en https://upstash.com → crea una base de datos **Redis** (región cercana).
2. En su página, copia **UPSTASH_REDIS_REST_URL** y **UPSTASH_REDIS_REST_TOKEN**
   (sección "REST API").

### 3. Desplegar en Render
1. Entra en https://render.com → **New +** → **Web Service** → conecta tu repo de GitHub.
2. Render detecta `render.yaml`. Confirma: Root Directory `server`, plan **Free**.
3. En **Environment**, añade las variables:
   - `VAPID_PUBLIC` y `VAPID_PRIVATE` → cópialas de tu `server/vapid.json`.
   - `VAPID_CONTACT` → `mailto:tu-email@ejemplo.com`.
   - `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` → los del paso 2.
   - `TICK_SECRET` → una palabra secreta cualquiera (p. ej. `mi-clave-123`).
4. Deploy. Al terminar tendrás una URL tipo `https://wellness-rpe.onrender.com`.

### 4. Horario fiable (cron-job.org)
El plan gratuito de Render se "duerme"; para que las notificaciones automáticas
salgan puntuales, un cron externo despierta el servidor cada minuto:
1. Entra en https://cron-job.org → crea un cronjob.
2. URL: `https://TU-APP.onrender.com/api/tick?secret=TU_TICK_SECRET`
3. Frecuencia: **cada 1 minuto**.

¡Listo! La app vive en la URL de Render.

---

## Cómo la usan tú y tus jugadores

Comparte la URL de Render (`https://TU-APP.onrender.com`). No hay tiendas ni APKs.

**Jugador (iPhone o Android):**
1. Abre la URL en el navegador.
2. **iPhone:** botón **Compartir** → **«Añadir a pantalla de inicio»**. Abre la app
   desde ese icono (en iPhone las notificaciones solo funcionan así).
   **Android:** el navegador ofrecerá **«Instalar app»** / «Añadir a pantalla de inicio».
3. Entra como **jugador**, pon el nombre y pulsa **Activar notificaciones**.

**Entrenador:**
1. Abre la URL → **entrenador** → PIN (por defecto `1234`, cámbialo en
   `server/public/config.js`).
2. **Enviar aviso ahora** (Wellness/RPE) o configura el **horario automático**.

---

## Notas

- El registro de respuestas lo siguen haciendo tus **Google Forms**; la PWA se
  encarga del envío, los avisos y el acceso rápido.
- Para autocompletar el nombre en los formularios se pueden usar los enlaces
  "pre-rellenados" de Google Forms (se puede añadir).
- Cambia el PIN del entrenador y las URLs de los formularios en
  `server/public/config.js`.
