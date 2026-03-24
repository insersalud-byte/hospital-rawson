const { supabase, parseId } = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY.');

        const url = new URL(req.url, `http://${req.headers.host}`);
        const parts = url.pathname.replace('/api/treatments', '').split('/').filter(Boolean);

        if (req.method === 'GET') {
            const { data, error } = await supabase.from('rawson_tratamientos').select('*').order('nombre');
            if (error) throw error;
            return res.json(data);
        }

        if (req.method === 'POST') {
            const { id, nombre } = req.body;
            const recordId = parseId(id) || Date.now();
            const { error } = await supabase.from('rawson_tratamientos').upsert({ id: recordId, nombre }, { onConflict: 'id' });
            if (error) throw error;
            return res.json({ success: true, id: recordId });
        }

        if (req.method === 'DELETE' && parts[0]) {
            const { error } = await supabase.from('rawson_tratamientos').delete().eq('id', parseId(parts[0]));
            if (error) throw error;
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
