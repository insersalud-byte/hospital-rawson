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

async function runTests() {
    console.log('\n--- TEST: POST /api/professionals ---');
    // Note: Since I didn't set ID as identity, I must check if ID is required
    const newProf = {
        id: Date.now(), // Generate a unique ID if it's not identity
        nombre: 'Dr. Test Debug',
        matricula: 'DEBUG-123',
        especialidad: 'Debug'
    };
    const profResult = await apiRequest('POST', '/api/professionals', newProf);
    console.log('Result:', JSON.stringify(profResult));

    console.log('\n--- TEST: POST /api/sessions ---');
    // Need a valid patient_id. (I know 1773087860432 exists)
    const newSession = {
        paciente_id: 1773087860432,
        fecha: '2026-03-20',
        hora: '10:00',
        kinesiologo_id: newProf.id,
        kinesiologo_nombre_snapshot: 'Dr. Test Debug',
        estado: 'programado',
        observaciones: 'Test session'
    };
    const sesResult = await apiRequest('POST', '/api/sessions', newSession);
    console.log('Result:', JSON.stringify(sesResult));
    
    console.log('\n--- VERIFYING ---');
    const profs = await apiRequest('GET', '/api/professionals');
    const foundProf = profs.find(p => p.matricula === 'DEBUG-123');
    console.log('Prof found:', !!foundProf);

    const sessions = await apiRequest('GET', '/api/sessions');
    const foundSes = sessions.find(s => s.paciente_id == 1773087860432 && s.fecha == '2026-03-20');
    console.log('Session found:', !!foundSes);
}

runTests().catch(err => console.error('Error fatal:', err.message));
