const http = require('http');

function apiRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : '';
        const opts = {
            hostname: 'localhost',
            port: 3005,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr)
            }
        };
        const req = http.request(opts, res => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function runFinalTests() {
    console.log('\n--- TEST: Save Professional NO ID ---');
    const prof = { nombre: 'Dr. No ID', matricula: 'NOID-001', especialidad: 'Kinesio' };
    const res1 = await apiRequest('POST', '/api/professionals', prof);
    console.log('Result:', JSON.stringify(res1));

    console.log('\n--- TEST: Save Session with EMPTY STRINGS in IDs ---');
    const session = {
        paciente_id: '', // Empty string should become null
        fecha: '2026-04-01',
        hora: '12:00',
        kinesiologo_id: '', // Empty string should become null
        kinesiologo_nombre_snapshot: 'Test Robust',
        estado: 'programado'
    };
    const res2 = await apiRequest('POST', '/api/sessions', session);
    console.log('Result:', JSON.stringify(res2));

    console.log('\n--- VERIFICATION ---');
    const profs = await apiRequest('GET', '/api/professionals');
    const foundProf = profs.find(p => p.nombre === 'Dr. No ID');
    console.log('Prof found (with auto ID):', !!foundProf && typeof foundProf.id === 'number');

    const sessions = await apiRequest('GET', '/api/sessions');
    const foundSes = sessions.find(s => s.kinesiologo_nombre_snapshot === 'Test Robust');
    console.log('Session found (with null IDs):', !!foundSes);
}

runFinalTests().catch(err => console.error('Error fatal:', err.message));
