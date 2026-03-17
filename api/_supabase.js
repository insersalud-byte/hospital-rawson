const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables are missing!');
}

let supabase;
try {
    supabase = createClient(supabaseUrl || '', supabaseKey || '');
} catch (e) {
    console.error('❌ Error creating Supabase client:', e.message);
}

module.exports = supabase;
