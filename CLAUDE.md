# Hospital Rawson - Kinesiología (agenda de turnos)

## CONTROL PRE-DEPLOY OBLIGATORIO (procedimiento estandar para TODO cambio)
Antes de pushear/deployar CUALQUIER cosa, en este orden. No saltear pasos.
1. **Compila**: `cd client && npm run build`. Si falla, no se deploya.
2. **Control de datos reales** (si el cambio afecta como se muestran/calculan datos): ANTES de deployar, simular la logica nueva contra la base productiva (Supabase MCP, project `gvharyztavhugqiaihjq`) y comparar viejo vs nuevo. Verificar que SOLO cambian las filas que deberian cambiar. Ej. del bug del contador: una query que contaba cuantos pacientes pasaban a 0 revelo que se reseteaban pacientes en tratamiento (Morales) y no solo los que reempezaron. Si el control muestra cambios masivos inesperados -> NO deployar, revisar la logica.
3. **Revisar alcance del commit**: `git status`. Commitear SOLO los archivos del cambio actual (no arrastrar trabajo ajeno a medias). Nunca `git add -A` a ciegas.
4. Recien ahi: commit + `git push origin master`. Avisar Ctrl+F5.
5. Registrar en "Historial de deploys" abajo.
Cambios solo-docs (CLAUDE.md, README) saltan el paso 2.

## Deploy (regla de oro)
- Repo GitHub: `insersalud-byte/hospital-rawson`, branch de produccion: `master`.
- Hosting: Vercel conectado al repo. **Push a `master` = deploy automatico** (Vercel buildea solo).
- `dist/` y `client/dist/` estan en `.gitignore`: NO se commitean, Vercel los genera.
- Build command (raiz package.json): `cd client && npx vite build --outDir ../dist`.
- Flujo: editar `client/src/**` o `api/**` -> `cd client && npm run build` para verificar que compila -> `git add` (solo fuente, no dist) -> commit -> `git push origin master`. Avisar Ctrl+F5 por cache.
- Verificar local opcional: `cd client && npm run build` (Vite 5). Backend serverless en `api/*.js` (Vercel functions), data en Supabase.

## Historial de deploys
- 2026-06-01 - commit `4c005a5` (push master OK, Vercel auto-deploy). Diagnostico junto a HC + contador de sesiones por ciclo (arranca en 0 al renovar turnos).

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
- LOGICA CLAVE: el contador cuenta las sesiones COMPLETADAS = asistió + no asistió (ambas cuentan, la falta tambien consume sesion de la tanda). Ej: 7 hechas + 3 faltas = 10 -> termino las 10 que se programaron. SIEMPRE mirar contra las que se PROGRAMARON (la tanda actual), no el historico total del paciente.
- El globito numerico en la agenda y en "Proximos Turnos" muestra ese conteo del CICLO ACTUAL.
- Un ciclo se detecta por SALTOS DE FECHA (`cycleCounts()`, constante `CYCLE_GAP_DAYS=30`): si entre dos fechas consecutivas hay un hueco > 30 dias, empieza un ciclo nuevo y el contador arranca en 0. NO usar `created_at` (la secretaria agenda en tandas chicas dentro del mismo tratamiento -> daria falsos reinicios; ej. paciente Morales tiene 7 tandas con created_at distintos pero fechas seguidas = 1 solo tratamiento).
- Caso de reinicio legitimo (verificado): GONZALEZ FRANCO completo 29 hasta 15-may, hueco de 31 dias, arranca bloque nuevo 15-jun -> contador 0.
- Diagnostico (`patologia`) se muestra al lado de HC/DNI en el header del panel del paciente.
