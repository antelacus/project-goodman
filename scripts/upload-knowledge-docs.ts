/**
 * Script to upload knowledge documents to the database
 *
 * Usage: ADMIN_PASSWORD="your_password" npx tsx scripts/upload-knowledge-docs.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';
const KNOWLEDGE_DOCS_DIR = path.join(process.cwd(), 'data', 'knowledge_documents');

interface UploadConfig {
  folder: string;
  docType: string;
  year?: string;
  period?: string;
}

// Configuration for each document folder
const UPLOAD_CONFIGS: UploadConfig[] = [
  { folder: '业务情况', docType: 'business_info' },
  { folder: '法律法规', docType: 'regulation' },
  { folder: '规章制度', docType: 'policy' },
  { folder: '财务报告', docType: 'financial_report', year: '2024', period: 'annual' },
  { folder: '会计准则', docType: 'accounting_standard' },
];

async function uploadFile(
  filePath: string,
  fileName: string,
  docType: string,
  adminPassword: string,
  year?: string,
  period?: string
): Promise<{ success: boolean; message: string; documentId?: string }> {
  try {
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Data = fileBuffer.toString('base64');

    // Build request body
    const body: Record<string, any> = {
      documentText: base64Data,
      fileName: fileName,
      documentType: docType,
      adminPassword: adminPassword,
      metadata: {
        size: fileBuffer.length,
        uploadTime: new Date().toISOString(),
        source: 'batch-upload-script',
      },
    };

    // Add year/period if provided
    if (year) body.year = year;
    if (period) body.period = period;

    console.log(`  Uploading ${fileName} (${(fileBuffer.length / 1024).toFixed(1)} KB) as ${docType}...`);

    const response = await fetch(`${BASE_URL}/api/admin/upload-database-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, message: result.message, documentId: result.documentId };
    } else {
      return { success: false, message: result.message || result.error || 'Unknown error' };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function uploadFolder(config: UploadConfig, adminPassword: string): Promise<{ total: number; success: number; failed: number }> {
  const folderPath = path.join(KNOWLEDGE_DOCS_DIR, config.folder);

  if (!fs.existsSync(folderPath)) {
    console.log(`  Folder not found: ${folderPath}`);
    return { total: 0, success: 0, failed: 0 };
  }

  const files = fs.readdirSync(folderPath).filter(f => {
    // Skip hidden files and directories
    if (f.startsWith('.')) return false;
    const fullPath = path.join(folderPath, f);
    return fs.statSync(fullPath).isFile();
  });

  if (files.length === 0) {
    console.log(`  No files to upload in ${config.folder}`);
    return { total: 0, success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const result = await uploadFile(
      filePath,
      file,
      config.docType,
      adminPassword,
      config.year,
      config.period
    );

    if (result.success) {
      console.log(`    ✅ ${file} -> ${result.documentId}`);
      successCount++;
    } else {
      console.log(`    ❌ ${file}: ${result.message}`);
      failedCount++;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return { total: files.length, success: successCount, failed: failedCount };
}

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('Error: ADMIN_PASSWORD environment variable is required');
    console.error('Usage: ADMIN_PASSWORD="your_password" npx tsx scripts/upload-knowledge-docs.ts');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('Knowledge Documents Batch Upload Script');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Documents Directory: ${KNOWLEDGE_DOCS_DIR}`);
  console.log('');

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalFiles = 0;

  for (const config of UPLOAD_CONFIGS) {
    console.log(`\n📁 Processing folder: ${config.folder} (type: ${config.docType})`);
    console.log('-'.repeat(50));

    const result = await uploadFolder(config, adminPassword);
    totalFiles += result.total;
    totalUploaded += result.success;
    totalFailed += result.failed;

    console.log(`  Summary: ${result.success}/${result.total} uploaded successfully`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Successfully uploaded: ${totalUploaded}`);
  console.log(`Failed: ${totalFailed}`);
  console.log('');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
