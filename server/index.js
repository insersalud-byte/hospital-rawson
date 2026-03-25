const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const db = require('./services/supabaseService');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log('Body:', JSON.stringify(req.body));
    }
    next();
});

// --- INICIALIZACIÓN ---
async function startServer() {
    try {
        await db.init();
        app.listen(PORT, () => {
            console.log(`🚀 Hospital Rawson Backend funcionando en puerto ${PORT}`);
            console.log(`✅ Base de datos Supabase conectada.`);
        });
    } catch (err) {
        console.error("Fallo crítico en el inicio del servidor:", err);
    }
}

// --- PROFESIONALES ---
app.get('/api/professionals', async (req, res) => {
    try {
        res.json(await db.getProfesionales());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/professionals', async (req, res) => {
    try {
        res.json(await db.upsertProfesional(req.body));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/professionals/:id', async (req, res) => {
    try {
        res.json(await db.deleteProfesional(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PATOLOGIAS ---
app.get('/api/pathologies', async (req, res) => {
    try {
        res.json(await db.getPatologias());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pathologies', async (req, res) => {
    try {
        res.json(await db.upsertPatologia(req.body));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/pathologies/:id', async (req, res) => {
    try {
        res.json(await db.deletePatologia(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TRATAMIENTOS ---
app.get('/api/treatments', async (req, res) => {
    try {
        res.json(await db.getTratamientos());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/treatments', async (req, res) => {
    try {
        res.json(await db.upsertTratamiento(req.body));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/treatments/:id', async (req, res) => {
    try {
        res.json(await db.deleteTratamiento(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PACIENTES ---
app.get('/api/patients', async (req, res) => {
    try {
        res.json(await db.getPacientes());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/patients', async (req, res) => {
    try {
        const result = await db.upsertPaciente(req.body);
        res.json(result);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/patients/:id', async (req, res) => {
    try {
        res.json(await db.deletePaciente(req.params.id));
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// --- SESIONES ---
app.get('/api/sessions/patient/:id', async (req, res) => {
    try {
        res.json(await db.getSesionesByPaciente(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions', async (req, res) => {
    try {
        res.json(await db.getSesiones());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', async (req, res) => {
    try {
        res.json(await db.createSesion(req.body));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions/batch', async (req, res) => {
    try {
        const { sesiones } = req.body;
        if (!Array.isArray(sesiones) || sesiones.length === 0) {
            return res.status(400).json({ error: 'Se requiere un array de sesiones' });
        }
        res.json(await db.createSesionesBatch(sesiones));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/sessions/:id', async (req, res) => {
    try {
        res.json(await db.updateSesion(req.params.id, req.body));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/sessions/:id', async (req, res) => {
    try {
        res.json(await db.deleteSesion(req.params.id));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ESTADÍSTICAS ---
app.get('/api/stats/summary', async (req, res) => {
    try {
        const { start, end } = req.query;
        res.json(await db.getStats({ start, end }));
    } catch (err) {
        console.error("Stats Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- SERVIR FRONTEND ---
app.use('/consultorio/assets', express.static(path.join(__dirname, '../client/dist/assets')));
app.use('/consultorio', express.static(path.join(__dirname, '../client/dist')));
app.use('/assets', express.static(path.join(__dirname, '../client/dist/assets')));
app.use('/vite.svg', express.static(path.join(__dirname, '../client/dist/vite.svg')));

app.get(/^\/consultorio(\/.*)?$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

app.get('/', (req, res) => {
    res.redirect('/consultorio');
});

startServer();
