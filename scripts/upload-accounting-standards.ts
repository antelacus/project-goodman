/**
 * Script to upload remaining 会计准则 documents
 * Skips files that are already in the database
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const FOLDER_PATH = path.join(process.cwd(), 'data', '会计准则');

// Files already uploaded (will be skipped)
const ALREADY_UPLOADED: string[] = [];

async function uploadFile(filePath: string, fileName: string, adminPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    console.log(`  Uploading ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB)...`);

    const response = await fetch(`${BASE_URL}/api/admin/upload-database-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: base64Data,
        fileName: fileName,
        documentType: 'accounting_standard',
        adminPassword: adminPassword,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, message: `${result.documentId} - ${result.message}` };
    } else {
      return { success: false, message: result.message || result.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD required');
    process.exit(1);
  }

  const files = fs.readdirSync(FOLDER_PATH)
    .filter(f => f.endsWith('.pdf') && !f.startsWith('.'))
    .filter(f => !ALREADY_UPLOADED.includes(f))
    .sort();

  console.log(`Found ${files.length} files to upload (skipping ${ALREADY_UPLOADED.length} already uploaded)`);
  console.log('');

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(FOLDER_PATH, file);

    console.log(`[${i + 1}/${files.length}]`);
    const result = await uploadFile(filePath, file, adminPassword);

    if (result.success) {
      console.log(`    ✅ ${result.message}`);
      successCount++;
    } else {
      console.log(`    ❌ ${result.message}`);
      failedCount++;
    }

    // Delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Completed: ${successCount} success, ${failedCount} failed`);
}

main().catch(console.error);
