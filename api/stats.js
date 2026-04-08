const { supabase, parseId } = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.');

        const url = new URL(req.url, `http://${req.headers.host}`);
        const start = url.searchParams.get('start');
        const end = url.searchParams.get('end');

        let query = supabase.from('rawson_sesiones').select('*, tratamiento:rawson_tratamientos(nombre)');
        if (start && end) query = query.gte('fecha', start).lte('fecha', end);
        const { data: sesiones, error: sError } = await query;
        if (sError) throw sError;

        let pacientes = [];
        const uniquePacienteIds = [...new Set(sesiones.map(s => s.paciente_id))].filter(Boolean).map(id => parseId(id));
        
        if (uniquePacienteIds.length > 0) {
            const { data: pData, error: pError } = await supabase
                .from('rawson_pacientes')
                .select('*')
                .in('id', uniquePacienteIds);
            if (pError) throw pError;
            pacientes = pData || [];
        }

        const stats = {
            asistencias: { 
                asistio: 0, 
                no_asistio: 0, 
                total_sesiones: 0,
                pacientes_atendidos: uniquePacienteIds.length 
            },
            patologias: {}, tratamientos: {}, medicos: {}, instituciones: {}, kinesiologos: {}
        };

        // Función para normalizar nombres y agrupar (evita duplicados como "Hospital X" vs "X")
        const normalizeAndGroup = (obj, rawName, increment = 1) => {
            if (!rawName) return;
            const normalized = rawName.trim()
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                .replace(/\b(hospital|clinica|sanatorio|centro|instituto|dr|dra|medico|medica)\b/gi, "") // Quitar palabras comunes
                .replace(/[^a-z0-9]/gi, " ") // Quitar caracteres especiales
                .replace(/\s+/g, " ") // Quitar espacios múltiples
                .trim();
            
            if (!normalized) return;

            // Buscamos si ya existe una versión de este nombre normalizado
            const existingKey = Object.keys(obj).find(k => {
                const kNorm = k.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/\b(hospital|clinica|sanatorio|centro|instituto|dr|dra|medico|medica)\b/gi, "")
                    .replace(/[^a-z0-9]/gi, " ")
                    .replace(/\s+/g, " ")
                    .trim();
                return kNorm === normalized;
            });

            const key = existingKey || rawName.trim();
            obj[key] = (obj[key] || 0) + increment;
        };

        sesiones.forEach(s => {
            if (s.estado === 'asistió') stats.asistencias.asistio++;
            if (s.estado === 'no asistió') stats.asistencias.no_asistio++;
            stats.asistencias.total_sesiones++;
            
            if (s.estado === 'asistió' && s.kinesiologo_nombre_snapshot) {
                const kine = s.kinesiologo_nombre_snapshot;
                stats.kinesiologos[kine] = (stats.kinesiologos[kine] || 0) + 1;
            }

            const trTexto = s.tratamientos_texto || s.tratamiento?.nombre;
            if (s.estado === 'asistió' && trTexto) {
                trTexto.split(',').map(t => t.trim()).filter(Boolean).forEach(name => {
                    normalizeAndGroup(stats.tratamientos, name);
                });
            }
        });

        pacientes.forEach(p => {
            if (p.patologia) normalizeAndGroup(stats.patologias, p.patologia);
            if (p.medico_derivante_nombre) normalizeAndGroup(stats.medicos, p.medico_derivante_nombre);
            if (p.medico_derivante_institucion) normalizeAndGroup(stats.instituciones, p.medico_derivante_institucion);
        });

        return res.json(stats);
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
