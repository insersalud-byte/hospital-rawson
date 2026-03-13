const axios = require('axios');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function testPersistence() {
    const dbPath = path.join(__dirname, '../db/hospital_rawson_kinesiologia.xlsx');

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(dbPath);
        console.log('✅ Excel read successfully');

        const patients = workbook.getWorksheet('Pacientes');
        console.log(`Current patients: ${patients.rowCount - 1}`);

    } catch (err) {
        console.error('❌ Excel persistence error:', err.message);
    }
}

testPersistence();
