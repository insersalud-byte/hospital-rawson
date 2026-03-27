const { supabase, parseId } = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

        if (req.method === 'DELETE') {
            console.log('DELETE /api/patients requested:', req.url);
            const url = new URL(req.url, `http://${req.headers.host}`);
            // Más robusto: extraer el ID independientemente de la ruta base
            const pathParts = url.pathname.split('/').filter(Boolean);
            const patId = parseId(pathParts[pathParts.length - 1]);
            
            console.log('Parsed patient ID to delete:', patId);
            if (!patId) return res.status(400).json({ error: 'ID requerido o inválido' });

            // Verificar si el paciente fue atendido
            const { data: attended, error: errCheck } = await supabase
                .from('rawson_sesiones')
                .select('id, estado')
                .eq('paciente_id', patId)
                .eq('estado', 'asistió')
                .limit(1);
            if (errCheck) throw errCheck;
            
            if (attended && attended.length > 0) {
                console.warn(`Attempt to delete patient ${patId} with attended sessions.`);
                return res.status(400).json({ error: 'No se puede eliminar: el paciente ya tiene sesiones marcadas como "asistió". 🏥 Por seguridad no se permiten borrar pacientes con historial activo.' });
            }

            // Borrar TODAS las sesiones del paciente (incluyendo "programado" y "no asistió")
            console.log(`Deleting sessions for patient ${patId}...`);
            const { error: errSes } = await supabase.from('rawson_sesiones').delete().eq('paciente_id', patId);
            if (errSes) {
                console.error('Error deleting sessions:', errSes);
                throw errSes;
            }

            // Borrar paciente
            console.log(`Deleting patient record ${patId}...`);
            const { error } = await supabase.from('rawson_pacientes').delete().eq('id', patId);
            if (error) {
                console.error('Error deleting patient:', error);
                throw error;
            }
            
            console.log(`Patient ${patId} deleted successfully.`);
            return res.json({ success: true });
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
