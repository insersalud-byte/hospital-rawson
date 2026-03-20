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
    console.log('\n--- TEST 1: GET /api/professionals ---');
    const profs = await apiRequest('GET', '/api/professionals');
    console.log('Profesionales:', JSON.stringify(profs));

    console.log('\n--- TEST 2: GET /api/patients ---');
    const patients = await apiRequest('GET', '/api/patients');
    console.log(`Pacientes cargados: ${patients.length}`);
    if (patients.length > 0) console.log('Primer paciente:', JSON.stringify(patients[0]));

    console.log('\n--- TEST 3: POST /api/patients (guardar nuevo paciente) ---');
    const newPatient = {
        id: Date.now(),
        nombre: 'Juan',
        apellido: 'Prueba',
        historia_clinica: 'TEST-001',
        telefono: '01112345678',
        estado_paciente: 'activo',
        observaciones: 'Paciente de prueba de guardado'
    };
    const saveResult = await apiRequest('POST', '/api/patients', newPatient);
    console.log('Resultado guardar:', JSON.stringify(saveResult));

    console.log('\n--- TEST 4: GET /api/patients (verificar que se guardó) ---');
    const patientsAfter = await apiRequest('GET', '/api/patients');
    const saved = patientsAfter.find(p => p.historia_clinica === 'TEST-001');
    if (saved) {
        console.log('✅ GUARDADO EXITOSO - Paciente encontrado en DB:', JSON.stringify(saved));
    } else {
        console.log('❌ ERROR - El paciente no aparece después de guardar. Pacientes:', JSON.stringify(patientsAfter));
    }

    console.log('\n--- TEST 5: POST /api/professionals (guardar kinesiologo) ---');
    const saveKine = await apiRequest('POST', '/api/professionals', {id: 99, nombre: 'Dr Test', matricula: '0001', especialidad: 'Kinesiologia'});
    console.log('Resultado guardar kinesiologo:', JSON.stringify(saveKine));

    console.log('\n--- TEST 6: GET /api/professionals (verificar kinesiologo) ---');
    const profsAfter = await apiRequest('GET', '/api/professionals');
    const savedKine = profsAfter.find(p => p.matricula === '0001');
    if (savedKine) {
        console.log('✅ GUARDADO EXITOSO - Kinesiologo encontrado:', JSON.stringify(savedKine));
    } else {
        console.log('❌ ERROR - El kinesiologo no aparece.');
    }
    
    console.log('\n✅ Todos los tests completados.\n');
}

runTests().catch(err => console.error('Error fatal:', err.message));
