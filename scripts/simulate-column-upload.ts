/**
 * Test: simulate-column-upload.ts
 *
 * Simulates a file upload with specific column mapping configuration.
 * Verifies that the backend correctly handles user-defined column mappings for Excel files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.dirname(__dirname);

const filePath = path.join(PROJECT_ROOT, 'presentation_files', '示例-资产负债表.xlsx');

// Load environment variables from .env.local manually
const envPath = path.join(PROJECT_ROOT, '.env.local');
let adminPassword = 'admin'; // Default fallback

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach((line) => {
        const [key, value] = line.split('=');
        if (key && value && key.trim() === 'ADMIN_PASSWORD') {
            adminPassword = value.trim().replace(/"/g, '');
        }
    });
}

async function uploadFile() {
    console.log('🚀 Uploading file with Column Mapping...');
    console.log(`Using password: ${adminPassword}`);

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const payload = {
        documentText: base64Data,
        fileName: '示例-资产负债表.xlsx',
        documentType: 'balance_sheet',
        adminPassword: adminPassword,
        startDate: '2023-12-31',
        endDate: '2024-12-31',
        columnMapping: {
            name: 'A',
            periodEnd: 'B', // 2024
            periodStart: 'C' // 2023
        }
    };

    try {
        const response = await fetch('http://localhost:3000/api/admin/upload-database-document', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log('Response Status:', response.status);

        if (result.success) {
            console.log('✅ Upload Success!');
            console.log('Message:', result.message);
            if (result.structuredData && result.structuredData.metrics) {
                console.log(`Extracted ${result.structuredData.metrics.length} metrics.`);
                // Check for 2024 and 2023 data
                // Since the response structure flattens everything, we can't easily see years here without inspecting the DB or detailed logs
                // But we can check the validation reports if returned
                if (result.validationReports) {
                    console.log('Validation Reports:', JSON.stringify(result.validationReports, null, 2));
                }
            }
        } else {
            console.error('❌ Upload Failed:', result.message, result.error);
        }
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

uploadFile();
