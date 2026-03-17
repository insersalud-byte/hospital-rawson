const supabase = require('./_supabase');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (!supabase) throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');

        if (req.method === 'GET') {
            const { data, error } = await supabase.from('rawson_patologias').select('*').order('nombre');
            if (error) throw error;
            return res.json(data);
        }

        if (req.method === 'POST') {
            const { id, nombre } = req.body;
            const { error } = await supabase.from('rawson_patologias').upsert({ id, nombre });
            if (error) throw error;
            return res.json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};
