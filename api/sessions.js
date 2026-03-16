const supabase = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = new URL(req.url, `http://${req.headers.host}`);
    const parts = url.pathname.replace('/api/sessions', '').split('/').filter(Boolean);
    // e.g. /api/sessions/patient/123 → parts = ['patient', '123']
    // e.g. /api/sessions/42         → parts = ['42']
    // e.g. /api/sessions/batch      → parts = ['batch']

    // GET /api/sessions/patient/:id
    if (req.method === 'GET' && parts[0] === 'patient' && parts[1]) {
        const { data, error } = await supabase
            .from('rawson_sesiones')
            .select('*, tratamiento:rawson_tratamientos(nombre)')
            .eq('paciente_id', parts[1])
            .order('fecha', { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data.map(s => ({ ...s, tratamiento_nombre: s.tratamiento?.nombre })));
    }

    // GET /api/sessions
    if (req.method === 'GET') {
        const { data, error } = await supabase
            .from('rawson_sesiones')
            .select('*, paciente:rawson_pacientes(nombre, apellido)');
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data.map(s => ({ ...s, nombre: s.paciente?.nombre, apellido: s.paciente?.apellido })));
    }

    // POST /api/sessions/batch
    if (req.method === 'POST' && parts[0] === 'batch') {
        const { sesiones } = req.body;
        if (!Array.isArray(sesiones) || sesiones.length === 0)
            return res.status(400).json({ error: 'Se requiere un array de sesiones' });
        const { error } = await supabase.from('rawson_sesiones').insert(
            sesiones.map(s => ({ ...s, estado: s.estado || 'programado', created_at: new Date().toISOString() }))
        );
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, created: sesiones.length });
    }

    // POST /api/sessions
    if (req.method === 'POST') {
        const { paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado, tratamiento_id, patologia_id, observaciones } = req.body;
        const { error } = await supabase.from('rawson_sesiones').insert({
            paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot,
            estado: estado || 'programado', tratamiento_id, patologia_id, observaciones,
            created_at: new Date().toISOString()
        });
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    // PUT /api/sessions/:id
    if (req.method === 'PUT' && parts[0]) {
        const { estado, tratamiento_id, observaciones, kinesiologo_nombre_snapshot } = req.body;
        const { error } = await supabase.from('rawson_sesiones').update({
            estado, tratamiento_id: tratamiento_id || null,
            observaciones: observaciones || null,
            kinesiologo_nombre_snapshot: kinesiologo_nombre_snapshot || null,
            updated_at: new Date().toISOString()
        }).eq('id', parts[0]);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    // DELETE /api/sessions/:id
    if (req.method === 'DELETE' && parts[0]) {
        const { error } = await supabase.from('rawson_sesiones').delete().eq('id', parts[0]);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
