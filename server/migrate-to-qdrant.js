const dbService = require('./services/dbService');
const qdrantService = require('./services/qdrantService');

async function migrate() {
    try {
        console.log("📂 Iniciando migración de SQLite a Qdrant...");
        
        // Inicializar ambos
        await dbService.init();
        await qdrantService.init();

        const tables = [
            { sqlite: 'profesionales', qdrant: 'professionals' },
            { sqlite: 'patologias', qdrant: 'pathologies' },
            { sqlite: 'tratamientos', qdrant: 'treatments' },
            { sqlite: 'pacientes', qdrant: 'patients' },
            { sqlite: 'sesiones', qdrant: 'sessions' }
        ];

        for (const table of tables) {
            console.log(`\n🔹 Migrando tabla: ${table.sqlite}...`);
            let rows = [];
            try {
                rows = await dbService.all(`SELECT * FROM ${table.sqlite}`);
                console.log(`📊 Filas encontradas: ${rows.length}`);
            } catch (err) {
                console.warn(`⚠️ Error al leer tabla ${table.sqlite}: ${err.message}`);
                continue;
            }
            
            if (rows.length === 0) continue;

            const points = rows.map(row => {
                const id = row.id;
                const payload = { ...row };
                delete payload.id;
                
                // Qdrant points must have a dummy vector
                return {
                    id: id,
                    vector: [0],
                    payload: payload
                };
            });

            // Upsert in batches
            try {
                await qdrantService.client.upsert(table.qdrant, {
                    points: points
                });
                console.log(`✅ ${points.length} puntos migrados a la colección ${table.qdrant}.`);
            } catch (err) {
                console.error(`❌ Error al subir puntos a Qdrant (${table.qdrant}): ${err.message}`);
            }
        }

        console.log("🏁 Migración completada con éxito.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error durante la migración:", err);
        process.exit(1);
    }
}

migrate();
