import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import * as XLSX from 'xlsx';
import { performAIExtraction } from './src/lib/ai-extraction';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function extractTextFromExcel(buffer: Buffer): Promise<string> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    return jsonData
        .filter(row => row.some(cell => cell != null && cell !== ''))
        .map(row => row.map(cell => cell ?? '').join('\t'))
        .join('\n');
}

async function main() {
    if (!process.env.OPENAI_API_KEY) {
        console.error('Error: OPENAI_API_KEY not found in .env.local');
        process.exit(1);
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const fileName = 'presentation_files/示例-资产负债表-20241231.xlsx';
    const filePath = path.join(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) {
        console.error(`Error: File not found at ${filePath}`);
        console.log("Please place '示例-资产负债表.xlsx' in the project root to run this test.");
        process.exit(1);
    }

    const buffer = fs.readFileSync(filePath);

    console.log('Extracting text from Excel...');
    const text = await extractTextFromExcel(buffer);
    console.log('--- Text Preview Start ---');
    console.log(text.slice(0, 500));
    console.log('--- Text Preview End ---');

    console.log('Running AI Extraction...');
    try {
        const result = await performAIExtraction(text, fileName, openai);
        console.log('Extraction Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Extraction Failed:', error);
    }
}

main().catch(console.error);
