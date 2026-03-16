const supabase = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const url = new URL(req.url, `http://${req.headers.host}`);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');

    let query = supabase.from('rawson_sesiones').select('*, tratamiento:rawson_tratamientos(nombre)');
    if (start && end) query = query.gte('fecha', start).lte('fecha', end);
    const { data: sesiones, error: sError } = await query;
    if (sError) return res.status(500).json({ error: sError.message });

    let pQuery = supabase.from('rawson_pacientes').select('*');
    if (start && end) {
        const pacienteIds = [...new Set(sesiones.map(s => s.paciente_id))];
        if (pacienteIds.length > 0) pQuery = pQuery.in('id', pacienteIds);
    }
    const { data: pacientes, error: pError } = await pQuery;
    if (pError) return res.status(500).json({ error: pError.message });

    const stats = {
        asistencias: { asistio: 0, no_asistio: 0, total: 0 },
        patologias: {}, tratamientos: {}, medicos: {}, instituciones: {}, kinesiologos: {}
    };

    sesiones.forEach(s => {
        if (s.estado === 'asistió') stats.asistencias.asistio++;
        if (s.estado === 'no asistió') stats.asistencias.no_asistio++;
        stats.asistencias.total++;
        if (s.estado === 'asistió' && s.kinesiologo_nombre_snapshot)
            stats.kinesiologos[s.kinesiologo_nombre_snapshot] = (stats.kinesiologos[s.kinesiologo_nombre_snapshot] || 0) + 1;
        const trName = s.tratamiento?.nombre;
        if (s.estado === 'asistió' && trName)
            stats.tratamientos[trName] = (stats.tratamientos[trName] || 0) + 1;
    });

    pacientes.forEach(p => {
        if (p.patologia) stats.patologias[p.patologia] = (stats.patologias[p.patologia] || 0) + 1;
        if (p.medico_derivante_nombre) stats.medicos[p.medico_derivante_nombre] = (stats.medicos[p.medico_derivante_nombre] || 0) + 1;
        if (p.medico_derivante_institucion) stats.instituciones[p.medico_derivante_institucion] = (stats.instituciones[p.medico_derivante_institucion] || 0) + 1;
    });

    return res.json(stats);
};
