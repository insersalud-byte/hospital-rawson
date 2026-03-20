const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Try service role first, then anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables are missing (SUPABASE_URL, SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY)!');
}

let supabase;
try {
    if (supabaseUrl && supabaseKey) {
        supabase = createClient(supabaseUrl, supabaseKey);
    }
} catch (e) {
    console.error('❌ Error creating Supabase client:', e.message);
}

// Helper: parse ID to number or null
function parseId(id) {
    if (id === null || id === undefined || id === '') return null;
    const n = Number(id);
    return isNaN(n) ? null : n;
}

module.exports = { supabase, parseId };
