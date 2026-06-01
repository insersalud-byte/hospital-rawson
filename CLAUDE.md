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
- 2026-06-01 - commit `4c005a5`. Diagnostico junto a HC + primer intento de contador por ciclo.
- 2026-06-01 - contador por TANDA (lote de la proxima sesion pendiente). Control de datos OK: nunca acumula a 30, Morales=1, GONZALEZ FRANCO=0.

## Arquitectura
- Frontend: Vite + React 18 en `client/src/`. Vistas clave en `client/src/features/` (agenda, patients, statistics, config).
- API: funciones serverless en `api/*.js` (patients, sessions, treatments, pathologies, professionals, stats). Cliente Supabase en `api/_supabase.js`.
- Rewrites en `vercel.json` mapean `/api/<x>/...` -> `/api/<x>.js`, y todo lo demas -> `index.html` (SPA).
- Tablas Supabase: `rawson_pacientes`, `rawson_sesiones`, `rawson_tratamientos`, etc. `parseId()` normaliza IDs.

## Modelo de datos relevante (agenda)
- Paciente: `historia_clinica`, `dni`, `patologia` (diagnostico), `resumen_hc`, `whatsapp`, `estado_paciente`.
- Sesion: `paciente_id`, `fecha` (yyyy-mm-dd), `hora`, `estado` ('programado' | 'asistió' | 'no asistió' | 'suspendido'), `created_at`, `observaciones`.
- Estados con encoding seguro: comparar con `startsWith('asisti')` / `startsWith('no asisti')` porque la "ó" puede corromperse.

## Contador de sesiones por TANDA (AgendaCalendar.jsx, `cycleCounts()`)
- REGLA: el paciente recibe una TANDA (ej. 10 sesiones). El contador cuenta las COMPLETADAS = asistió + no asistió (la falta tambien consume sesion) DENTRO de esa tanda. Ej: 7 hechas + 3 faltas = 10 -> termino la tanda. Se le dan otras 10 -> arranca de 0. EL CONTADOR NUNCA ACUMULA ENTRE TANDAS (nunca 30/40). NO mirar el historico total del paciente.
- Una tanda = el LOTE en que se cargaron las sesiones (mismo `created_at`, redondeado al minuto en `batchKeyOf`; la secretaria carga la orden junta).
- Tanda actual = lote de la PROXIMA sesion pendiente (programada futura mas temprana). Si no hay futuras, lote de la sesion mas reciente. NO usar el lote mas nuevo por created_at (puede ser una tanda agendada a futuro y daria 0 a quien esta cursando una tanda anterior -> ese fue el bug de Morales).
- Verificado contra la base (control pre-deploy): Morales=1 (tanda en curso, no 0 ni 15), GONZALEZ FRANCO=0 (termino 29, tanda nueva), ningun contador llega a 30 aunque el historico sea 33.
- El globito en la agenda y en "Proximos Turnos" muestra este conteo de la tanda actual. La falta (>=2 en la tanda) lo pone en rojo.
- Diagnostico (`patologia`) se muestra al lado de HC/DNI en el header del panel del paciente.
