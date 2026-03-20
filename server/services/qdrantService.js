const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const client = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTIONS = ['professionals', 'pathologies', 'treatments', 'patients', 'sessions'];

class QdrantService {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        for (const collection of COLLECTIONS) {
            try {
                const collections = await client.getCollections();
                const exists = collections.collections.find(c => c.name === collection);
                
                if (!exists) {
                    await client.createCollection(collection, {
                        vectors: {
                            size: 1, // Dummy vector for non-vector storage
                            distance: 'Cosine',
                        },
                    });
                    console.log(`✅ Collection ${collection} created in Qdrant.`);
                }
            } catch (err) {
                console.error(`Error initializing collection ${collection}:`, err.message);
            }
        }
        this.initialized = true;
        console.log("🚀 Qdrant Service initialized.");
    }

    // Helper to map SQLite queries (very basic mapping)
    async all(query, params = []) {
        await this.init();
        const collection = this._getCollectionFromQuery(query);
        if (!collection) throw new Error("Could not determine collection from query: " + query);

        let filter = null;
        // Specific filter for stats with date range
        if (query.includes('WHERE 1=1  AND fecha BETWEEN ? AND ?')) {
             filter = {
                must: [
                    { key: 'fecha', range: { gte: params[0], lte: params[1] } }
                ]
            };
        }

        const scrollOptions = {
            with_payload: true,
            limit: 1000,
        };
        if (filter) scrollOptions.filter = filter;

        const response = await client.scroll(collection, scrollOptions);

        let results = response.points.map(p => ({ id: p.id, ...p.payload }));

        // Manual JOIN for sessions and treatments if needed
        if (collection === 'sessions' && query.includes('LEFT JOIN tratamientos')) {
            const treatments = await this.all('SELECT * FROM tratamientos');
            results = results.map(s => {
                const tr = treatments.find(t => t.id === s.tratamiento_id);
                return { ...s, tr_nombre: tr ? tr.nombre : null, tratamiento_nombre: tr ? tr.nombre : null };
            });
        }
        
        // Manual JOIN for sessions and patients
        if (collection === 'sessions' && query.includes('LEFT JOIN pacientes')) {
            const patients = await this.all('SELECT * FROM pacientes');
            results = results.map(s => {
                const p = patients.find(pat => pat.id === s.paciente_id);
                return { ...s, nombre: p ? p.nombre : null, apellido: p ? p.apellido : null };
            });
        }

        return results;
    }

    async run(query, params = []) {
        await this.init();
        const collection = this._getCollectionFromQuery(query);
        if (!collection) {
            // Check for ALTER TABLE or other non-CRUD
            if (query.includes('ALTER TABLE')) return { success: true };
            throw new Error("Could not determine collection from query: " + query);
        }

        if (query.includes('INSERT') || query.includes('REPLACE')) {
            const payload = this._mapParamsToPayload(query, params);
            const id = payload.id || uuidv4();
            delete payload.id; // Store ID as point ID

            await client.upsert(collection, {
                points: [{
                    id: id,
                    vector: [0], // Dummy vector
                    payload: payload
                }]
            });
            return { lastID: id };
        }

        if (query.includes('UPDATE')) {
            const id = params[params.length - 1];
            let payload = {};
            
            if (q.includes('set estado = ?, tratamiento_id = ?, observaciones = ?, kinesiologo_nombre_snapshot = ?, updated_at = ?')) {
                payload = {
                    estado: params[0],
                    tratamiento_id: params[1],
                    observaciones: params[2],
                    kinesiologo_nombre_snapshot: params[3],
                    updated_at: params[4]
                };
            }

            await client.setPayload(collection, {
                payload: payload,
                points: [id]
            });
            return { success: true };
        }

        if (query.includes('DELETE')) {
            const id = params[0];
            await client.delete(collection, {
                points: [id]
            });
            return { success: true };
        }
    }

    async get(query, params = []) {
        const results = await this.all(query, params);
        return results[0] || null;
    }

    // DISCLAIMER: This is a hacky query parser for a quick migration.
    // In a real app, we should refactor the DAO layer to call specific methods.
    _getCollectionFromQuery(query) {
        const q = query.toLowerCase();
        if (q.includes('profesionales')) return 'professionals';
        if (q.includes('patologias')) return 'pathologies';
        if (q.includes('tratamientos')) return 'treatments';
        if (q.includes('pacientes')) return 'patients';
        if (q.includes('sesiones')) return 'sessions';
        return null;
    }

    _mapParamsToPayload(query, params) {
        const q = query.toLowerCase();
        if (q.includes('pacientes')) {
             // [id, nombre, apellido, historia_clinica, telefono, whatsapp, email, created_at, estado_paciente, observaciones, medico_derivante_nombre, medico_derivante_telefono, medico_derivante_institucion, patologia]
            return {
                id: params[0],
                nombre: params[1],
                apellido: params[2],
                historia_clinica: params[3],
                telefono: params[4],
                whatsapp: params[5],
                email: params[6],
                created_at: params[7],
                estado_paciente: params[8],
                observaciones: params[9],
                medico_derivante_nombre: params[10],
                medico_derivante_telefono: params[11],
                medico_derivante_institucion: params[12],
                patologia: params[13]
            };
        }
        if (q.includes('sesiones')) {
            if (q.includes('insert into sesiones (paciente_id, fecha, hora, kinesiologo_id')) {
                return {
                    paciente_id: params[0],
                    fecha: params[1],
                    hora: params[2],
                    kinesiologo_id: params[3],
                    kinesiologo_nombre_snapshot: params[4],
                    estado: params[5],
                    tratamiento_id: params[6],
                    patologia_id: params[7],
                    observaciones: params[8],
                    created_at: params[9]
                };
            }
            if (q.includes('insert into sesiones (paciente_id, fecha, hora, estado, created_at)')) {
                return {
                    paciente_id: params[0],
                    fecha: params[1],
                    hora: params[2],
                    estado: params[3],
                    created_at: params[4]
                };
            }
        }
        if (q.includes('profesionales')) {
            return { id: params[0], nombre: params[1], matricula: params[2], especialidad: params[3] };
        }
        if (q.includes('patologias') || q.includes('tratamientos')) {
            return { id: params[0], nombre: params[1] };
        }
        return {};
    }
}

const service = new QdrantService();
service.client = client;

module.exports = service;
