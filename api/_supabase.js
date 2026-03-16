const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.');
}

const supabase = createClient(supabaseUrl, supabaseKey);
module.exports = supabase;
