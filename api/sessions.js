const { supabase, parseId } = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (!supabase) throw new Error('Supabase client not initialized.');

        const url = new URL(req.url, `http://${req.headers.host}`);
        const parts = url.pathname.replace('/api/sessions', '').split('/').filter(Boolean);

        // GET /api/sessions/patient/:id
        if (req.method === 'GET' && parts[0] === 'patient' && parts[1]) {
            const { data, error } = await supabase
                .from('rawson_sesiones')
                .select('*, tratamiento:rawson_tratamientos(nombre)')
                .eq('paciente_id', parseId(parts[1]))
                .order('fecha', { ascending: false });
            if (error) throw error;
            return res.json(data.map(s => ({ ...s, tratamiento_nombre: s.tratamientos_texto || s.tratamiento?.nombre || null })));
        }

        // GET /api/sessions
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('rawson_sesiones')
                .select('*, paciente:rawson_pacientes(nombre, apellido)');
            if (error) throw error;
            return res.json(data.map(s => ({ ...s, nombre: s.paciente?.nombre, apellido: s.paciente?.apellido })));
        }

        // DELETE /api/sessions/:id
        if (req.method === 'DELETE' && parts[0]) {
            const sessionId = parseId(parts[0]);
            if (!sessionId) return res.status(400).json({ error: 'ID requerido' });
            const { error } = await supabase.from('rawson_sesiones').delete().eq('id', sessionId);
            if (error) throw error;
            return res.json({ success: true });
        }

        if (req.method === 'POST') {
            const { _action, id } = req.body;

            // POST { _action: 'delete', id } → DELETE session
            if (_action === 'delete') {
                const sessionId = parseId(id);
                if (!sessionId) return res.status(400).json({ error: 'ID requerido' });
                const { error } = await supabase.from('rawson_sesiones').delete().eq('id', sessionId);
                if (error) throw error;
                return res.json({ success: true });
            }

            // POST { _action: 'update', id, ...fields } → UPDATE session
            if (_action === 'update') {
                const sessionId = parseId(id);
                if (!sessionId) return res.status(400).json({ error: 'ID requerido' });
                const { estado, tratamiento_id, observaciones, kinesiologo_nombre_snapshot, tratamientos_texto } = req.body;
                const { error } = await supabase.from('rawson_sesiones').update({
                    estado,
                    tratamiento_id: parseId(tratamiento_id),
                    observaciones: observaciones || null,
                    kinesiologo_nombre_snapshot: kinesiologo_nombre_snapshot || null,
                    tratamientos_texto: tratamientos_texto || null,
                }).eq('id', sessionId);
                if (error) throw error;
                return res.json({ success: true });
            }

            // POST { sesiones: [...] } → batch create
            if (req.body.sesiones) {
                const { sesiones } = req.body;
                if (!Array.isArray(sesiones) || sesiones.length === 0)
                    return res.status(400).json({ error: 'Se requiere un array de sesiones' });
                const { error } = await supabase.from('rawson_sesiones').insert(
                    sesiones.map(s => ({
                        ...s,
                        paciente_id: parseId(s.paciente_id),
                        estado: s.estado || 'programado',
                        created_at: new Date().toISOString()
                    }))
                );
                if (error) throw error;
                return res.json({ success: true, created: sesiones.length });
            }

            // POST → CREATE session
            const { paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado, tratamiento_id, patologia_id, observaciones, tratamientos_texto } = req.body;
            const { error } = await supabase.from('rawson_sesiones').insert({
                paciente_id: parseId(paciente_id),
                fecha,
                hora,
                kinesiologo_id: parseId(kinesiologo_id),
                kinesiologo_nombre_snapshot,
                estado: estado || 'programado',
                tratamiento_id: parseId(tratamiento_id),
                patologia_id: parseId(patologia_id),
                observaciones,
                tratamientos_texto: tratamientos_texto || null,
                created_at: new Date().toISOString()
            });
            if (error) throw error;
            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed', method: req.method });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
