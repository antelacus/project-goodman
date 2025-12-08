/**
 * Integration Test for Phase 6 Features
 * Tests full upload workflow with year/period fields
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;
const BASE_URL = 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

async function cleanup(documentId: string) {
  log('Cleaning up test data...');

  // Delete from storage
  try {
    const { data: files } = await supabase.storage
      .from('document-files')
      .list(documentId);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${documentId}/${f.name}`);
      await supabase.storage.from('document-files').remove(filePaths);
    }
  } catch (e) {
    // Ignore storage errors
  }

  // Delete from database
  await supabase.from('financial_data').delete().eq('document_id', documentId);
  await supabase.from('document_chunks').delete().eq('document_id', documentId);
  await supabase.from('documents').delete().eq('id', documentId);

  log('Cleanup complete');
}

async function testFullUploadWorkflow() {
  console.log('='.repeat(60));
  console.log('Phase 6 Integration Test - Full Upload Workflow');
  console.log('='.repeat(60));
  console.log('');

  const testDocId = `test-phase6-${Date.now()}`;

  try {
    // 1. Test upload with year/period
    log('Step 1: Uploading document with year/period...');

    // Create test Excel file content (base64)
    // Using a minimal valid xlsx-like content for testing
    const testContent = `资产负债表测试
资产合计: 1000000
负债合计: 500000
所有者权益: 500000`;

    const base64Content = Buffer.from(testContent).toString('base64');

    const uploadResponse = await fetch(`${BASE_URL}/api/admin/upload-database-document`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentText: base64Content,
        fileName: 'test-balance-sheet.txt',
        documentType: 'balance_sheet',
        year: '2024',
        period: 'Q4',
        adminPassword: ADMIN_PASSWORD
      })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      throw new Error(`Upload failed: ${uploadResult.error}`);
    }

    const documentId = uploadResult.documentId;
    logSuccess(`Document uploaded: ${documentId}`);

    // 2. Verify database record has year/period
    log('Step 2: Verifying database record...');

    const { data: dbDoc, error: dbError } = await supabase
      .from('documents')
      .select('id, name, doc_type, year, period, file_url')
      .eq('id', documentId)
      .single();

    if (dbError) {
      throw new Error(`Database query failed: ${dbError.message}`);
    }

    if (dbDoc.year !== '2024') {
      throw new Error(`Year mismatch: expected '2024', got '${dbDoc.year}'`);
    }

    if (dbDoc.period !== 'Q4') {
      throw new Error(`Period mismatch: expected 'Q4', got '${dbDoc.period}'`);
    }

    if (dbDoc.doc_type !== 'balance_sheet') {
      throw new Error(`Doc type mismatch: expected 'balance_sheet', got '${dbDoc.doc_type}'`);
    }

    logSuccess(`Database record verified: year=${dbDoc.year}, period=${dbDoc.period}, doc_type=${dbDoc.doc_type}`);

    // 3. Check if file_url is set (file stored)
    log('Step 3: Checking file storage...');

    if (dbDoc.file_url) {
      logSuccess(`File stored at: ${dbDoc.file_url}`);

      // 4. Test preview URL API
      log('Step 4: Testing preview URL API...');

      const previewResponse = await fetch(
        `${BASE_URL}/api/documents/preview-url?fileUrl=${encodeURIComponent(dbDoc.file_url)}`
      );

      if (!previewResponse.ok) {
        throw new Error(`Preview URL API failed: ${previewResponse.status}`);
      }

      const previewResult = await previewResponse.json();

      if (previewResult.success && previewResult.signedUrl) {
        logSuccess(`Preview URL generated: ${previewResult.signedUrl.substring(0, 80)}...`);
      } else {
        throw new Error(`Preview URL generation failed: ${previewResult.error}`);
      }
    } else {
      log('Note: file_url is null (file not stored in this test)');
    }

    // 5. Test PATCH API
    log('Step 5: Testing document PATCH API...');

    const patchResponse = await fetch(`${BASE_URL}/api/documents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        adminPassword: ADMIN_PASSWORD,
        updates: {
          year: '2023',
          period: 'Q3'
        }
      })
    });

    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      throw new Error(`PATCH failed: ${patchResponse.status} - ${errorText}`);
    }

    const patchResult = await patchResponse.json();

    if (!patchResult.success) {
      throw new Error(`PATCH failed: ${patchResult.error}`);
    }

    // Verify the update
    const { data: updatedDoc } = await supabase
      .from('documents')
      .select('year, period')
      .eq('id', documentId)
      .single();

    if (updatedDoc?.year !== '2023' || updatedDoc?.period !== 'Q3') {
      throw new Error(`PATCH verification failed: year=${updatedDoc?.year}, period=${updatedDoc?.period}`);
    }

    logSuccess(`PATCH verified: year=${updatedDoc.year}, period=${updatedDoc.period}`);

    // 6. Test local documents API returns new fields
    log('Step 6: Testing local documents API...');

    const localDocsResponse = await fetch(`${BASE_URL}/api/local-documents`);
    const localDocsResult = await localDocsResponse.json();

    const testDoc = localDocsResult.documents?.find((d: any) => d.id === documentId);

    if (!testDoc) {
      throw new Error('Document not found in local documents API');
    }

    const hasAllFields =
      'docType' in testDoc &&
      'year' in testDoc &&
      'period' in testDoc &&
      'fileUrl' in testDoc;

    if (!hasAllFields) {
      throw new Error(`Missing fields in API response: ${Object.keys(testDoc).join(', ')}`);
    }

    logSuccess(`Local documents API returns all new fields`);

    // 7. Cleanup
    await cleanup(documentId);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ All integration tests passed!');
    console.log('='.repeat(60));

  } catch (error: any) {
    logError(`Test failed: ${error.message}`);
    console.log('');

    // Try to cleanup anyway
    try {
      const { data: docs } = await supabase
        .from('documents')
        .select('id')
        .like('id', 'test-phase6-%');

      if (docs && docs.length > 0) {
        for (const doc of docs) {
          await cleanup(doc.id);
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(1);
  }
}

testFullUploadWorkflow();
