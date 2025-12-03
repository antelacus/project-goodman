
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
    console.log('🚀 Uploading file...');
    console.log(`Using password: ${adminPassword}`);

    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    const payload = {
        documentText: base64Data,
        fileName: '示例-资产负债表.xlsx',
        documentType: 'balance_sheet',
        adminPassword: adminPassword,
        year: '2021',
        period: 'annual'
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
        // console.log('Response Body:', JSON.stringify(result, null, 2));
        if (result.success) {
            console.log('✅ Upload Success!');
            console.log('Message:', result.message);
            if (result.structuredData && result.structuredData.metrics) {
                console.log(`Extracted ${result.structuredData.metrics.length} metrics.`);
                console.log('Sample Metrics:', result.structuredData.metrics.slice(0, 3));
            }
        } else {
            console.error('❌ Upload Failed:', result.message, result.error);
        }
    } catch (error) {
        console.error('Upload failed:', error);
    }
}

uploadFile();
