const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const dbService = require('./services/dbService');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// --- INICIALIZACIÓN ---
async function startServer() {
    try {
        await dbService.init();
        app.listen(PORT, () => {
            console.log(`🚀 Hospital Rawson Backend profesional funcionando en puerto ${PORT}`);
            console.log(`✅ Base de datos SQLite conectada para máxima persistencia.`);
        });
    } catch (err) {
        console.error("Fallo crítico en el inicio del servidor:", err);
    }
}

// --- PROFESIONALES ---
app.get('/api/professionals', async (req, res) => {
    try {
        const data = await dbService.all('SELECT * FROM profesionales');
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/professionals', async (req, res) => {
    try {
        const { id, nombre, matricula, especialidad } = req.body;
        await dbService.run('INSERT OR REPLACE INTO profesionales (id, nombre, matricula, especialidad) VALUES (?, ?, ?, ?)',
            [id, nombre, matricula, especialidad]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PATOLOGIAS ---
app.get('/api/pathologies', async (req, res) => {
    try {
        const data = await dbService.all('SELECT * FROM patologias');
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pathologies', async (req, res) => {
    try {
        const { id, nombre } = req.body;
        await dbService.run('INSERT OR REPLACE INTO patologias (id, nombre) VALUES (?, ?)', [id, nombre]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TRATAMIENTOS ---
app.get('/api/treatments', async (req, res) => {
    try {
        const data = await dbService.all('SELECT * FROM tratamientos');
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/treatments', async (req, res) => {
    try {
        const { id, nombre } = req.body;
        await dbService.run('INSERT OR REPLACE INTO tratamientos (id, nombre) VALUES (?, ?)', [id, nombre]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PACIENTES ---
app.get('/api/patients', async (req, res) => {
    try {
        const data = await dbService.all('SELECT * FROM pacientes');
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients', async (req, res) => {
    try {
        const { id, nombre, apellido, historia_clinica, telefono, whatsapp, email, created_at, estado_paciente, observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion, patologia } = req.body;
        // Migración segura: agregar columnas si no existen
        try { await dbService.run('ALTER TABLE pacientes ADD COLUMN whatsapp TEXT'); } catch (e) { }
        try { await dbService.run('ALTER TABLE pacientes ADD COLUMN patologia TEXT'); } catch (e) { }
        await dbService.run(`INSERT OR REPLACE INTO pacientes (id, nombre, apellido, historia_clinica, telefono, whatsapp, email, created_at, estado_paciente, observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion, patologia) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, nombre, apellido, historia_clinica, telefono, whatsapp || null, email, created_at || new Date().toISOString(), estado_paciente || 'activo', observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion, patologia || null]);
        res.json({ success: true, id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SESIONES ---
// Historial de sesiones de un paciente
app.get('/api/sessions/patient/:id', async (req, res) => {
    try {
        const data = await dbService.all(`
            SELECT s.*, t.nombre as tratamiento_nombre
            FROM sesiones s
            LEFT JOIN tratamientos t ON s.tratamiento_id = t.id
            WHERE s.paciente_id = ?
            ORDER BY s.fecha DESC, s.hora DESC`,
            [req.params.id]
        );
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions', async (req, res) => {
    try {
        const data = await dbService.all(`
            SELECT s.*, p.nombre, p.apellido 
            FROM sesiones s 
            LEFT JOIN pacientes p ON s.paciente_id = p.id
        `);
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
    try {
        const { paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado, tratamiento_id, patologia_id, observaciones } = req.body;
        await dbService.run(`
            INSERT INTO sesiones (paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado, tratamiento_id, patologia_id, observaciones, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [paciente_id, fecha, hora, kinesiologo_id, kinesiologo_nombre_snapshot, estado || 'programado', tratamiento_id, patologia_id, observaciones, new Date().toISOString()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Crear múltiples sesiones de una vez (batch para calendario multi-fecha)
app.post('/api/sessions/batch', async (req, res) => {
    try {
        const { sesiones } = req.body; // Array de { paciente_id, fecha, hora, estado }
        if (!Array.isArray(sesiones) || sesiones.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de sesiones' });
        }
        for (const s of sesiones) {
            await dbService.run(`
                INSERT INTO sesiones (paciente_id, fecha, hora, estado, created_at)
                VALUES (?, ?, ?, ?, ?)`,
                [s.paciente_id, s.fecha, s.hora, s.estado || 'programado', new Date().toISOString()]
            );
        }
        res.json({ success: true, created: sesiones.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sessions/:id', async (req, res) => {
    try {
        const { estado, tratamiento_id, observaciones, kinesiologo_nombre_snapshot } = req.body;
        await dbService.run(`
            UPDATE sesiones SET estado = ?, tratamiento_id = ?, observaciones = ?, 
            kinesiologo_nombre_snapshot = ?, updated_at = ?
            WHERE id = ?`,
            [estado, tratamiento_id || null, observaciones || null, kinesiologo_nombre_snapshot || null, new Date().toISOString(), req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sessions/:id', async (req, res) => {
    try {
        await dbService.run('DELETE FROM sesiones WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ESTADÍSTICAS ---
app.get('/api/stats/summary', async (req, res) => {
    try {
        const { start, end } = req.query;
        let dateFilter = '';
        let params = [];

        if (start && end) {
            dateFilter = ' AND fecha BETWEEN ? AND ? ';
            params = [start, end];
        }

        const stats = {
            asistencias: { asistio: 0, no_asistio: 0, total: 0 },
            patologias: {},
            tratamientos: {},
            medicos: {},
            instituciones: {},
            kinesiologos: {}
        };

        // Asistencias y Kinesiólogos (Filtradas por fecha)
        const sesiones = await dbService.all(`
            SELECT estado, kinesiologo_nombre_snapshot, tratamiento_id, t.nombre as tr_nombre
            FROM sesiones s
            LEFT JOIN tratamientos t ON s.tratamiento_id = t.id
            WHERE 1=1 ${dateFilter}
        `, params);

        sesiones.forEach(s => {
            if (s.estado === 'asistió') stats.asistencias.asistio++;
            if (s.estado === 'no asistió') stats.asistencias.no_asistio++;
            stats.asistencias.total++;

            if (s.estado === 'asistió' && s.kinesiologo_nombre_snapshot) {
                stats.kinesiologos[s.kinesiologo_nombre_snapshot] = (stats.kinesiologos[s.kinesiologo_nombre_snapshot] || 0) + 1;
            }

            if (s.estado === 'asistió' && s.tr_nombre) {
                stats.tratamientos[s.tr_nombre] = (stats.tratamientos[s.tr_nombre] || 0) + 1;
            }
        });

        // Para patologías, médicos e instituciones, leemos de los pacientes para simplificar (global),
        // o si es con fecha, los pacientes creados en esa fecha. (Haremos global ya que es información del paciente per se, a menos que cruce con sesiones)
        // Pero filtramos mejor por los pacientes que tuvieron sesión en ese rango:
        const pacientesObj = await dbService.all(`
            SELECT DISTINCT p.id, p.patologia, p.medico_derivante_nombre, p.medico_derivante_institucion
            FROM pacientes p
            ${start && end ? `JOIN sesiones s ON s.paciente_id = p.id WHERE s.fecha BETWEEN ? AND ?` : ''}
        `, params);

        pacientesObj.forEach(p => {
            if (p.patologia) stats.patologias[p.patologia] = (stats.patologias[p.patologia] || 0) + 1;
            if (p.medico_derivante_nombre) stats.medicos[p.medico_derivante_nombre] = (stats.medicos[p.medico_derivante_nombre] || 0) + 1;
            if (p.medico_derivante_institucion) stats.instituciones[p.medico_derivante_institucion] = (stats.instituciones[p.medico_derivante_institucion] || 0) + 1;
        });

        res.json(stats);
    } catch (err) {
        console.error("Stats Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- SERVIR FRONTEND ---
app.use('/consultorio', express.static(path.join(__dirname, '../client/dist')));

// Fallback para React Router en el subdominio/subruta
app.get(/^\/consultorio(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

// Redirigir la raiz si caen ahí por error
app.get('/', (req, res) => {
    res.redirect('/consultorio');
});

startServer();
