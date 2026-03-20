const { supabase, parseId } = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.');

        if (req.method === 'GET') {
            const { data, error } = await supabase.from('rawson_pacientes').select('*').order('apellido');
            if (error) throw error;
            return res.json(data);
        }

        if (req.method === 'POST') {
            const { id, nombre, apellido, historia_clinica, telefono, whatsapp, email, created_at, estado_paciente, observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion, patologia } = req.body;
            const recordId = parseId(id) || Date.now();
            const { error } = await supabase.from('rawson_pacientes').upsert({
                id: recordId,
                nombre, apellido, historia_clinica, telefono,
                whatsapp: whatsapp || null,
                email,
                created_at: created_at || new Date().toISOString(),
                estado_paciente: estado_paciente || 'activo',
                observaciones,
                medico_derivante_nombre,
                medico_derivante_telefono,
                medico_derivante_institucion,
                patologia: patologia || null
            });
            if (error) throw error;
            return res.json({ success: true, id: recordId });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: error.message || 'Internal Server Error',
            details: error
        });
    }
};
