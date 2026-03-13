const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function createInitialDatabase() {
    const dbPath = path.join(__dirname, 'db/hospital_rawson_kinesiologia.xlsx');

    // Ensure db directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    const workbook = new ExcelJS.Workbook();

    // 1) Profesionales
    const professionals = workbook.addWorksheet('Profesionales');
    professionals.columns = [
        { header: 'id', key: 'id' },
        { header: 'nombre', key: 'nombre' },
        { header: 'apellido', key: 'apellido' },
        { header: 'activo', key: 'activo' }
    ];

    // 2) Patologias
    const pathologies = workbook.addWorksheet('Patologias');
    pathologies.columns = [
        { header: 'id', key: 'id' },
        { header: 'nombre', key: 'nombre' }
    ];

    // 3) Tratamientos
    const treatments = workbook.addWorksheet('Tratamientos');
    treatments.columns = [
        { header: 'id', key: 'id' },
        { header: 'nombre', key: 'nombre' }
    ];

    // 4) Pacientes
    const patients = workbook.addWorksheet('Pacientes');
    patients.columns = [
        { header: 'id', key: 'id' },
        { header: 'nombre', key: 'nombre' },
        { header: 'apellido', key: 'apellido' },
        { header: 'historia_clinica', key: 'historia_clinica' },
        { header: 'telefono', key: 'telefono' },
        { header: 'email', key: 'email' },
        { header: 'created_at', key: 'created_at' },
        { header: 'estado_paciente', key: 'estado_paciente' },
        { header: 'observaciones', key: 'observaciones' },
        { header: 'medico_derivante_nombre', key: 'medico_derivante_nombre' },
        { header: 'medico_derivante_telefono', key: 'medico_derivante_telefono' },
        { header: 'medico_derivante_institucion', key: 'medico_derivante_institucion' }
    ];

    // 5) TratamientosPaciente
    const patientTreatments = workbook.addWorksheet('TratamientosPaciente');
    patientTreatments.columns = [
        { header: 'id', key: 'id' },
        { header: 'paciente_id', key: 'paciente_id' },
        { header: 'tratamiento_id', key: 'tratamiento_id' },
        { header: 'patologia_id', key: 'patologia_id' },
        { header: 'estado', key: 'estado' },
        { header: 'fecha_inicio', key: 'fecha_inicio' },
        { header: 'fecha_fin', key: 'fecha_fin' },
        { header: 'sesiones_planificadas', key: 'sesiones_planificadas' },
        { header: 'sesiones_realizadas', key: 'sesiones_realizadas' },
        { header: 'sesiones_perdidas', key: 'sesiones_perdidas' },
        { header: 'creado_por', key: 'creado_por' },
        { header: 'fecha_cierre', key: 'fecha_cierre' },
        { header: 'observaciones', key: 'observaciones' }
    ];

    // 6) Sesiones
    const sessions = workbook.addWorksheet('Sesiones');
    sessions.columns = [
        { header: 'id', key: 'id' },
        { header: 'paciente_id', key: 'paciente_id' },
        { header: 'tratamiento_paciente_id', key: 'tratamiento_paciente_id' },
        { header: 'fecha', key: 'fecha' },
        { header: 'hora', key: 'hora' },
        { header: 'kinesiologo_id', key: 'kinesiologo_id' },
        { header: 'kinesiologo_nombre_snapshot', key: 'kinesiologo_nombre_snapshot' },
        { header: 'estado', key: 'estado' },
        { header: 'motivo_no_asistio', key: 'motivo_no_asistio' },
        { header: 'perdida', key: 'perdida' },
        { header: 'whatsapp_enviado', key: 'whatsapp_enviado' },
        { header: 'fecha_envio', key: 'fecha_envio' },
        { header: 'creado_por', key: 'creado_por' },
        { header: 'modificado_por', key: 'modificado_por' },
        { header: 'created_at', key: 'created_at' },
        { header: 'updated_at', key: 'updated_at' }
    ];

    // 7) Config
    const config = workbook.addWorksheet('Config');
    config.columns = [
        { header: 'clave', key: 'clave' },
        { header: 'valor', key: 'valor' }
    ];
    config.addRow({ clave: 'capacidad_slot', valor: 2 });
    config.addRow({ clave: 'duracion_sesion_min', valor: 45 });

    await workbook.xlsx.writeFile(dbPath);
    console.log(`✅ Base de datos Excel creada en: ${dbPath}`);
}

createInitialDatabase().catch(console.error);
