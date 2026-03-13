const ExcelJS = require('exceljs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db/hospital_rawson_kinesiologia.xlsx');

async function checkStructure() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(DB_PATH);

    console.log('--- EXCEL STRUCTURE ---');
    workbook.eachSheet((sheet, id) => {
        console.log(`Sheet: ${sheet.name}`);
        const headers = [];
        sheet.getRow(1).eachCell(cell => headers.push(cell.value));
        console.log(`Headers: ${headers.join(', ')}`);
    });
}

checkStructure().catch(err => console.error('Error:', err.message));
