const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gvharyztavhugqiaihjq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2aGFyeXp0YXZodWdxaWFpaGpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQzNDAsImV4cCI6MjA4NTYyMDM0MH0.mKMhRmF48zKd-maESh2g2gYNxPc4gSFfoVjjshnH-eI';

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
