/**
 * Script to upload remaining 会计准则 documents
 * Skips files that are already in the database
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const FOLDER_PATH = path.join(process.cwd(), 'data', 'knowledge_documents', '会计准则');

// Files already uploaded (will be skipped)
const ALREADY_UPLOADED = [
  '企业会计准则-基本准则-2014.pdf',
  '企业会计准则第1号-存货-2007.pdf',
  '企业会计准则第2号-长期股权投资-2014.pdf',
  '企业会计准则第10号-企业年金基金-2007.pdf',
  '企业会计准则第11号-股份支付-2007.pdf',
  '企业会计准则第12号-债务重组-2019.pdf',
  '企业会计准则第13号-或有事项-2007.pdf',
  '企业会计准则第14号-收入-2018.pdf',
  '企业会计准则第15号-建造合同-2007.pdf',
  '企业会计准则第16号-政府补助-2017.pdf',
  '企业会计准则第17号-借款费用-2007.pdf',
  '企业会计准则第18号-所得税-2007.pdf',
  '企业会计准则第19号-外币折算-2007.pdf',
  '企业会计准则第20号-企业合并-2007.pdf',
  '企业会计准则第21号-租赁-2019.pdf',
];

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
