# Hospital Rawson - Kinesiología (agenda de turnos)

## Deploy (regla de oro)
- Repo GitHub: `insersalud-byte/hospital-rawson`, branch de produccion: `master`.
- Hosting: Vercel conectado al repo. **Push a `master` = deploy automatico** (Vercel buildea solo).
- `dist/` y `client/dist/` estan en `.gitignore`: NO se commitean, Vercel los genera.
- Build command (raiz package.json): `cd client && npx vite build --outDir ../dist`.
- Flujo: editar `client/src/**` o `api/**` -> `cd client && npm run build` para verificar que compila -> `git add` (solo fuente, no dist) -> commit -> `git push origin master`. Avisar Ctrl+F5 por cache.
- Verificar local opcional: `cd client && npm run build` (Vite 5). Backend serverless en `api/*.js` (Vercel functions), data en Supabase.

## Arquitectura
- Frontend: Vite + React 18 en `client/src/`. Vistas clave en `client/src/features/` (agenda, patients, statistics, config).
- API: funciones serverless en `api/*.js` (patients, sessions, treatments, pathologies, professionals, stats). Cliente Supabase en `api/_supabase.js`.
- Rewrites en `vercel.json` mapean `/api/<x>/...` -> `/api/<x>.js`, y todo lo demas -> `index.html` (SPA).
- Tablas Supabase: `rawson_pacientes`, `rawson_sesiones`, `rawson_tratamientos`, etc. `parseId()` normaliza IDs.

## Modelo de datos relevante (agenda)
- Paciente: `historia_clinica`, `dni`, `patologia` (diagnostico), `resumen_hc`, `whatsapp`, `estado_paciente`.
- Sesion: `paciente_id`, `fecha` (yyyy-mm-dd), `hora`, `estado` ('programado' | 'asistió' | 'no asistió' | 'suspendido'), `created_at`, `observaciones`.
- Estados con encoding seguro: comparar con `startsWith('asisti')` / `startsWith('no asisti')` porque la "ó" puede corromperse.

## Contador de sesiones por CICLO (AgendaCalendar.jsx)
- El globito numerico en la agenda y en "Proximos Turnos" cuenta solo las sesiones completadas del CICLO ACTUAL (no el historico total).
- Un ciclo = la ultima tanda de sesiones cargada. Se detecta por `created_at`: se toma el lote mas reciente (ventana de 2 dias) via `cycleCounts()`. Cuando un paciente termina y se le dan sesiones nuevas, el contador arranca en 0 el primer dia.
- Diagnostico (`patologia`) se muestra al lado de HC/DNI en el header del panel del paciente.
