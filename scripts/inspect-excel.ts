
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(__dirname);

const filePath = path.join(PROJECT_ROOT, 'presentation_files', '示例-资产负债表.xlsx');

console.log(`Reading file: ${filePath}`);

if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    process.exit(1);
}

const buf = fs.readFileSync(filePath);
const workbook = XLSX.read(buf, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON array of arrays to see the layout
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`\n--- Sheet Content (${sheetName}) ---`);
// Print first 20 rows to get a sense of the structure
data.slice(0, 20).forEach((row: any, index) => {
    console.log(`Row ${index + 1}: ${JSON.stringify(row)}`);
});

console.log('\n--- Searching for Key Metrics ---');
const keyMetrics = ['货币资金', '资产总计', '负债合计', '所有者权益合计'];

data.forEach((row: any, rowIndex) => {
    const rowStr = JSON.stringify(row);
    keyMetrics.forEach(metric => {
        if (rowStr.includes(metric)) {
            console.log(`Found ${metric} at Row ${rowIndex + 1}: ${JSON.stringify(row)}`);
        }
    });
});
