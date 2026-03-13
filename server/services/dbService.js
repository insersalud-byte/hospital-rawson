const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../db/hospital_rawson.sqlite');

class DatabaseService {
    constructor() {
        this.db = null;
    }

    async getDb() {
        if (!this.db) {
            const dbDir = path.dirname(DB_PATH);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
                console.log("📂 Carpeta de base de datos creada:", dbDir);
            }
            this.db = await open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });
            console.log("📁 Archivo de base de datos abierto en:", DB_PATH);
            await this.init();
        }
        return this.db;
    }

    async init() {
        if (!this.db) return; // Se llamará desde getDb
        const db = this.db;

        // Crear tablas si no existen
        await db.exec(`
            CREATE TABLE IF NOT EXISTS profesionales (
                id INTEGER PRIMARY KEY,
                nombre TEXT,
                matricula TEXT,
                especialidad TEXT
            );
            
            CREATE TABLE IF NOT EXISTS patologias (
                id INTEGER PRIMARY KEY,
                nombre TEXT
            );
            
            CREATE TABLE IF NOT EXISTS tratamientos (
                id INTEGER PRIMARY KEY,
                nombre TEXT
            );
            
            CREATE TABLE IF NOT EXISTS pacientes (
                id INTEGER PRIMARY KEY,
                nombre TEXT,
                apellido TEXT,
                historia_clinica TEXT,
                telefono TEXT,
                email TEXT,
                created_at TEXT,
                estado_paciente TEXT,
                observaciones TEXT,
                medico_derivante_nombre TEXT,
                medico_derivante_telefono TEXT,
                medico_derivante_institucion TEXT
            );
            
            CREATE TABLE IF NOT EXISTS sesiones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                paciente_id INTEGER,
                fecha TEXT,
                hora TEXT,
                kinesiologo_id INTEGER,
                kinesiologo_nombre_snapshot TEXT,
                estado TEXT,
                motivo_no_asistio TEXT,
                perdida INTEGER DEFAULT 0,
                whatsapp_enviado INTEGER DEFAULT 0,
                fecha_envio TEXT,
                created_at TEXT,
                updated_at TEXT,
                tratamiento_id INTEGER,
                patologia_id INTEGER,
                observaciones TEXT
            );
        `);
        console.log("🚀 Sistema de tablas SQLite verificado y listo.");
    }

    // Métodos Genéricos
    async all(query, params = []) {
        const db = await this.getDb();
        return db.all(query, params);
    }

    async run(query, params = []) {
        const db = await this.getDb();
        return db.run(query, params);
    }

    async get(query, params = []) {
        const db = await this.getDb();
        return db.get(query, params);
    }
}

module.exports = new DatabaseService();
