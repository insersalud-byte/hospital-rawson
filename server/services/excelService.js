const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');

const DB_PATH = path.join(__dirname, '../db/hospital_rawson_kinesiologia.xlsx');
const BACKUP_DIR = path.join(__dirname, '../db/backups');

class ExcelService {
    constructor() {
        this.writeQueue = Promise.resolve();
    }

    async _getWorkbook() {
        const workbook = new ExcelJS.Workbook();
        if (fs.existsSync(DB_PATH)) {
            await workbook.xlsx.readFile(DB_PATH);
        } else {
            throw new Error('Base de datos no encontrada. Ejecute init-db primero.');
        }
        return workbook;
    }

    async _saveWorkbook(workbook) {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 10);
        const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}.xlsx`);
        if (fs.existsSync(DB_PATH) && !fs.existsSync(backupPath)) {
            fs.copyFileSync(DB_PATH, backupPath);
        }
        await workbook.xlsx.writeFile(DB_PATH);
    }

    async getData(sheetName) {
        const workbook = await this._getWorkbook();
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) return [];

        const data = [];
        const headers = [];
        sheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value;
        });

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const item = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber];
                if (header) {
                    item[header] = cell.value;
                }
            });
            if (Object.keys(item).length > 0) data.push(item);
        });
        return data;
    }

    async addRow(sheetName, item) {
        return this.writeQueue = this.writeQueue.then(async () => {
            const workbook = await this._getWorkbook();
            let sheet = workbook.getWorksheet(sheetName);

            if (!sheet) {
                sheet = workbook.addWorksheet(sheetName);
                const headerRow = Object.keys(item);
                sheet.getRow(1).values = headerRow;
                sheet.columns = headerRow.map(h => ({ header: h, key: h }));
            } else {
                const headers = [];
                sheet.getRow(1).eachCell((cell, colNumber) => {
                    headers.push(cell.value);
                });
                sheet.columns = headers.map(h => ({ header: h, key: h }));
            }

            sheet.addRow(item);
            await this._saveWorkbook(workbook);
            console.log(`Guardado en ${sheetName}:`, item);
            return item;
        });
    }

    async updateRow(sheetName, id, updates) {
        return this.writeQueue = this.writeQueue.then(async () => {
            const workbook = await this._getWorkbook();
            const sheet = workbook.getWorksheet(sheetName);
            if (!sheet) return false;

            let found = false;

            sheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return;
                const rowId = row.getCell(1).value;
                if (rowId == id) {
                    Object.keys(updates).forEach(key => {
                        const headers = [];
                        sheet.getRow(1).eachCell((cell, colNumber) => { headers[colNumber] = cell.value; });
                        const colIdx = headers.indexOf(key);
                        if (colIdx !== -1) {
                            row.getCell(colIdx).value = updates[key];
                        }
                    });
                    found = true;
                }
            });

            if (found) await this._saveWorkbook(workbook);
            return found;
        });
    }
}

module.exports = new ExcelService();
