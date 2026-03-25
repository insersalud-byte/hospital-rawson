const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Helper: throw on Supabase error
function check(error, context) {
    if (error) {
        console.error(`❌ Supabase error (${context}):`, error); // Log full error object
        throw new Error(error.message || JSON.stringify(error));
    }
}

// Helper: parse ID to number or null
function parseId(id) {
    if (id === null || id === undefined || id === '') return null;
    const n = Number(id);
    return isNaN(n) ? null : n;
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
    // Just test connection
    const { error } = await supabase.from('rawson_profesionales').select('id').limit(1);
    if (error) {
        console.error('❌ No se pudo conectar a Supabase:', error.message);
        throw error;
    }
    console.log('✅ Supabase conectado correctamente.');
}

// ─── PROFESIONALES ────────────────────────────────────────────────────────────
async function getProfesionales() {
    const { data, error } = await supabase.from('rawson_profesionales').select('*').order('id');
    check(error, 'getProfesionales');
    return data;
}

async function upsertProfesional({ id, nombre, matricula, especialidad }) {
    // If id is missing, generate one (for tables without IDENTITY)
    const recordId = parseId(id) || Date.now();
    const { error } = await supabase
        .from('rawson_profesionales')
        .upsert({ id: recordId, nombre, matricula, especialidad }, { onConflict: 'id' });
    check(error, 'upsertProfesional');
    return { success: true, id: recordId };
}

// ─── PATOLOGIAS ───────────────────────────────────────────────────────────────
async function getPatologias() {
    const { data, error } = await supabase.from('rawson_patologias').select('*').order('id');
    check(error, 'getPatologias');
    return data;
}

async function upsertPatologia({ id, nombre }) {
    const recordId = parseId(id) || Date.now();
    const { error } = await supabase
        .from('rawson_patologias')
        .upsert({ id: recordId, nombre }, { onConflict: 'id' });
    check(error, 'upsertPatologia');
    return { success: true, id: recordId };
}

// ─── TRATAMIENTOS ─────────────────────────────────────────────────────────────
async function getTratamientos() {
    const { data, error } = await supabase.from('rawson_tratamientos').select('*').order('id');
    check(error, 'getTratamientos');
    return data;
}

async function upsertTratamiento({ id, nombre }) {
    const recordId = parseId(id) || Date.now();
    const { error } = await supabase
        .from('rawson_tratamientos')
        .upsert({ id: recordId, nombre }, { onConflict: 'id' });
    check(error, 'upsertTratamiento');
    return { success: true, id: recordId };
}

// ─── PACIENTES ────────────────────────────────────────────────────────────────
async function getPacientes() {
    const { data, error } = await supabase.from('rawson_pacientes').select('*').order('id');
    check(error, 'getPacientes');
    return data;
}

async function upsertPaciente(body) {
    const {
        id, nombre, apellido, historia_clinica, telefono,
        email, estado_paciente, observaciones,
        medico_derivante_nombre, medico_derivante_telefono,
        medico_derivante_institucion
    } = body;

    const recordId = parseId(id) || Date.now();
    const record = {
        id: recordId,
        nombre,
        apellido,
        historia_clinica,
        telefono,
        email,
        estado_paciente: estado_paciente || 'activo',
        observaciones,
        medico_derivante_nombre,
        medico_derivante_telefono,
        medico_derivante_institucion,
        patologia: body.patologia || null
    };

    const { error } = await supabase
        .from('rawson_pacientes')
        .upsert(record, { onConflict: 'id' });
    check(error, 'upsertPaciente');
    return { success: true, id: recordId };
}

// ─── SESIONES ─────────────────────────────────────────────────────────────────
async function getSesionesByPaciente(pacienteId) {
    const { data, error } = await supabase
        .from('rawson_sesiones')
        .select('*, rawson_tratamientos(nombre)')
        .eq('paciente_id', parseId(pacienteId))
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false });
    check(error, 'getSesionesByPaciente');
    // Flatten the join
    return data.map(s => ({
        ...s,
        tratamiento_nombre: s.rawson_tratamientos?.nombre || null,
        rawson_tratamientos: undefined
    }));
}

async function getSesiones() {
    const { data, error } = await supabase
        .from('rawson_sesiones')
        .select('*, rawson_pacientes(nombre, apellido)');
    check(error, 'getSesiones');
    return data.map(s => ({
        ...s,
        nombre: s.rawson_pacientes?.nombre || null,
        apellido: s.rawson_pacientes?.apellido || null,
        rawson_pacientes: undefined
    }));
}

async function createSesion(body) {
    const {
        paciente_id, fecha, hora, kinesiologo_id,
        kinesiologo_nombre_snapshot, estado, tratamiento_id,
        patologia_id, observaciones
    } = body;

    const { error } = await supabase.from('rawson_sesiones').insert({
        paciente_id: parseId(paciente_id),
        fecha,
        hora,
        kinesiologo_id: parseId(kinesiologo_id),
        kinesiologo_nombre_snapshot,
        estado: estado || 'programado',
        tratamiento_id: parseId(tratamiento_id),
        patologia_id: parseId(patologia_id),
        observaciones
    });
    check(error, 'createSesion');
    return { success: true };
}

async function createSesionesBatch(sesiones) {
    const rows = sesiones.map(s => ({
        paciente_id: parseId(s.paciente_id),
        fecha: s.fecha,
        hora: s.hora,
        estado: s.estado || 'programado'
    }));
    const { error } = await supabase.from('rawson_sesiones').insert(rows);
    check(error, 'createSesionesBatch');
    return { success: true, created: rows.length };
}

async function updateSesion(id, { estado, tratamiento_id, observaciones, kinesiologo_nombre_snapshot }) {
    const { error } = await supabase
        .from('rawson_sesiones')
        .update({
            estado,
            tratamiento_id: parseId(tratamiento_id),
            observaciones,
            kinesiologo_nombre_snapshot,
            updated_at: new Date().toISOString()
        })
        .eq('id', parseId(id));
    check(error, 'updateSesion');
    return { success: true };
}

async function deleteSesion(id) {
    const { error } = await supabase.from('rawson_sesiones').delete().eq('id', parseId(id));
    check(error, 'deleteSesion');
    return { success: true };
}

// ─── BORRAR PROFESIONAL / PATOLOGÍA / TRATAMIENTO ────────────────────────────
async function deleteProfesional(id) {
    const { error } = await supabase.from('rawson_profesionales').delete().eq('id', parseId(id));
    check(error, 'deleteProfesional');
    return { success: true };
}

async function deletePatologia(id) {
    const { error } = await supabase.from('rawson_patologias').delete().eq('id', parseId(id));
    check(error, 'deletePatologia');
    return { success: true };
}

async function deleteTratamiento(id) {
    const { error } = await supabase.from('rawson_tratamientos').delete().eq('id', parseId(id));
    check(error, 'deleteTratamiento');
    return { success: true };
}

// ─── BORRAR PACIENTE (solo si no fue atendido) ────────────────────────────────
async function deletePaciente(id) {
    const { data: attended, error: errCheck } = await supabase
        .from('rawson_sesiones')
        .select('id')
        .eq('paciente_id', parseId(id))
        .eq('estado', 'asistió')
        .limit(1);
    check(errCheck, 'deletePaciente-check');

    if (attended && attended.length > 0) {
        throw new Error('No se puede eliminar: el paciente ya fue atendido en al menos una sesión.');
    }

    // Borrar todas las sesiones del paciente primero
    const { error: errSes } = await supabase
        .from('rawson_sesiones')
        .delete()
        .eq('paciente_id', parseId(id));
    check(errSes, 'deletePaciente-sesiones');

    const { error } = await supabase.from('rawson_pacientes').delete().eq('id', parseId(id));
    check(error, 'deletePaciente');
    return { success: true };
}

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
async function getStats({ start, end } = {}) {
    let sesionesQuery = supabase
        .from('rawson_sesiones')
        .select('estado, kinesiologo_nombre_snapshot, tratamiento_id, rawson_tratamientos(nombre)');
    if (start && end) sesionesQuery = sesionesQuery.gte('fecha', start).lte('fecha', end);

    const { data: sesiones, error: errS } = await sesionesQuery;
    check(errS, 'getStats-sesiones');

    let pacientesQuery = supabase
        .from('rawson_pacientes')
        .select('id, medico_derivante_nombre, medico_derivante_institucion');
    if (start && end) {
        // Patients who had a session in the range
        const { data: ps } = await supabase
            .from('rawson_sesiones')
            .select('paciente_id')
            .gte('fecha', start)
            .lte('fecha', end);
        if (ps && ps.length > 0) {
            const ids = [...new Set(ps.map(p => p.paciente_id))];
            pacientesQuery = pacientesQuery.in('id', ids);
        }
    }
    const { data: pacientes, error: errP } = await pacientesQuery;
    check(errP, 'getStats-pacientes');

    const stats = {
        asistencias: { asistio: 0, no_asistio: 0, total: 0 },
        patologias: {},
        tratamientos: {},
        medicos: {},
        instituciones: {},
        kinesiologos: {}
    };

    sesiones.forEach(s => {
        if (s.estado === 'asistió') stats.asistencias.asistio++;
        if (s.estado === 'no asistió') stats.asistencias.no_asistio++;
        stats.asistencias.total++;

        if (s.estado === 'asistió' && s.kinesiologo_nombre_snapshot)
            stats.kinesiologos[s.kinesiologo_nombre_snapshot] = (stats.kinesiologos[s.kinesiologo_nombre_snapshot] || 0) + 1;

        const trNombre = s.rawson_tratamientos?.nombre;
        if (s.estado === 'asistió' && trNombre)
            stats.tratamientos[trNombre] = (stats.tratamientos[trNombre] || 0) + 1;
    });

    (pacientes || []).forEach(p => {
        if (p.medico_derivante_nombre) stats.medicos[p.medico_derivante_nombre] = (stats.medicos[p.medico_derivante_nombre] || 0) + 1;
        if (p.medico_derivante_institucion) stats.instituciones[p.medico_derivante_institucion] = (stats.instituciones[p.medico_derivante_institucion] || 0) + 1;
    });

    return stats;
}

module.exports = {
    init,
    getProfesionales, upsertProfesional, deleteProfesional,
    getPatologias, upsertPatologia, deletePatologia,
    getTratamientos, upsertTratamiento, deleteTratamiento,
    getPacientes, upsertPaciente, deletePaciente,
    getSesionesByPaciente, getSesiones,
    createSesion, createSesionesBatch, updateSesion, deleteSesion,
    getStats
};
