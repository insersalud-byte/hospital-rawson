const excelService = require('./services/excelService');
const dbService = require('./services/dbService');

async function migrate() {
    try {
        console.log("📂 Iniciando migración de Excel a SQLite...");
        await dbService.init();

        const sheets = ['Patologias', 'Tratamientos', 'Pacientes', 'Profesionales', 'Sesiones'];

        for (const sheetName of sheets) {
            console.log(`- Migrando ${sheetName}...`);
            const data = await excelService.getData(sheetName);
            console.log(`  Encontrados ${data.length} registros en Excel.`);

            for (const item of data) {
                if (sheetName === 'Patologias') {
                    await dbService.run('INSERT OR REPLACE INTO patologias (id, nombre) VALUES (?, ?)', [item.id, item.nombre]);
                } else if (sheetName === 'Tratamientos') {
                    await dbService.run('INSERT OR REPLACE INTO tratamientos (id, nombre) VALUES (?, ?)', [item.id, item.nombre]);
                } else if (sheetName === 'Profesionales') {
                    await dbService.run('INSERT OR REPLACE INTO profesionales (id, nombre, matricula, especialidad) VALUES (?, ?, ?, ?)', [item.id, item.nombre, item.matricula, item.especialidad]);
                } else if (sheetName === 'Pacientes') {
                    await dbService.run(`INSERT OR REPLACE INTO pacientes (id, nombre, apellido, historia_clinica, telefono, email, created_at, estado_paciente, observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.id, item.nombre, item.apellido, item.historia_clinica, item.telefono, item.email, item.created_at, item.estado_paciente, item.observaciones, item.medico_derivante_nombre, item.medico_derivante_telefono, item.medico_derivante_institucion]);
                } else if (sheetName === 'Sesiones') {
                    await dbService.run(`INSERT INTO sesiones (paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado, tratamiento_id, patologia_id, observaciones, created_at)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [item.paciente_id, item.fecha, item.hora, item.kinesiologo_id, item.kinesiologo_nombre_snapshot, item.estado, item.tratamiento_id, item.patologia_id, item.observaciones, item.created_at]);
                }
            }
        }
        console.log("✅ Migración completada con éxito.");
    } catch (err) {
        console.error("❌ Error en la migración:", err.message);
    }
}

migrate();
