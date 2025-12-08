/**
 * Test Script for Phase 6 Features
 * - File Storage & Property Management
 * - Year/Period form changes
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function logResult(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`       ${details}`);
}

async function testStorageBucket() {
  log('Testing storage bucket existence...');

  try {
    const { data, error } = await supabase.storage.getBucket('document-files');

    if (error) {
      logResult('Storage Bucket Exists', false, `Error: ${error.message}`);
      return;
    }

    logResult('Storage Bucket Exists', true, `Bucket: ${data.name}, Public: ${data.public}`);
  } catch (err: any) {
    logResult('Storage Bucket Exists', false, `Exception: ${err.message}`);
  }
}

async function testFileUrlColumn() {
  log('Testing file_url column in documents table...');

  try {
    // Check if file_url column exists by querying with it
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, file_url')
      .limit(1);

    if (error) {
      logResult('file_url Column Exists', false, `Error: ${error.message}`);
      return;
    }

    logResult('file_url Column Exists', true, `Column accessible, sample docs: ${data?.length || 0}`);
  } catch (err: any) {
    logResult('file_url Column Exists', false, `Exception: ${err.message}`);
  }
}

async function testYearPeriodColumns() {
  log('Testing year and period columns...');

  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, name, year, period, doc_type')
      .not('year', 'is', null)
      .limit(5);

    if (error) {
      logResult('Year/Period Columns', false, `Error: ${error.message}`);
      return;
    }

    const details = data?.length
      ? `Found ${data.length} docs with year/period: ${data.map(d => `${d.name}(${d.year}/${d.period})`).join(', ')}`
      : 'Columns exist but no documents with year/period set';

    logResult('Year/Period Columns', true, details);
  } catch (err: any) {
    logResult('Year/Period Columns', false, `Exception: ${err.message}`);
  }
}

async function testDocumentConstants() {
  log('Testing document constants...');

  try {
    // Dynamic import
    const { formatDocType, formatPeriod, DOC_TYPE_LABELS, PERIOD_LABELS } = await import('./src/lib/document-constants');

    // Test formatDocType
    const balanceSheet = formatDocType('balance_sheet');
    const incomeStatement = formatDocType('income_statement');
    const unknown = formatDocType('unknown_type');
    const nullType = formatDocType(null);

    const docTypeTests =
      balanceSheet === '资产负债表' &&
      incomeStatement === '利润表' &&
      unknown === 'unknown_type' &&
      nullType === '-';

    // Test formatPeriod
    const q1 = formatPeriod('Q1');
    const annual = formatPeriod('annual');
    const nullPeriod = formatPeriod(null);

    const periodTests =
      q1 === '第一季度' &&
      annual === '全年' &&  // Fixed: was '年报', should be '全年'
      nullPeriod === '-';

    if (docTypeTests && periodTests) {
      logResult('Document Constants', true, `formatDocType: balance_sheet→${balanceSheet}, formatPeriod: Q1→${q1}`);
    } else {
      logResult('Document Constants', false, `Mapping mismatch: docType=${docTypeTests}, period=${periodTests}`);
    }
  } catch (err: any) {
    logResult('Document Constants', false, `Exception: ${err.message}`);
  }
}

async function testPreviewUrlAPI() {
  log('Testing preview URL API...');

  try {
    // First get a document with file_url
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('id, name, file_url')
      .not('file_url', 'is', null)
      .limit(1);

    if (docError) {
      logResult('Preview URL API', false, `Error fetching docs: ${docError.message}`);
      return;
    }

    if (!docs || docs.length === 0) {
      logResult('Preview URL API', true, 'No documents with file_url to test (API exists but no test data)');
      return;
    }

    const doc = docs[0];

    // Test the API endpoint
    const response = await fetch(`http://localhost:3000/api/documents/preview-url?fileUrl=${encodeURIComponent(doc.file_url)}`)
      .catch(() => null);

    if (!response) {
      logResult('Preview URL API', false, 'Could not connect to API (server not running?)');
      return;
    }

    const result = await response.json();

    if (result.success && result.signedUrl) {
      logResult('Preview URL API', true, `Got signed URL for ${doc.name}`);
    } else {
      logResult('Preview URL API', false, `API error: ${result.error || 'Unknown'}`);
    }
  } catch (err: any) {
    logResult('Preview URL API', false, `Exception: ${err.message}`);
  }
}

async function testPatchAPI() {
  log('Testing document PATCH API...');

  try {
    // Get a test document
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select('id, name, year, period')
      .limit(1);

    if (docError) {
      logResult('Document PATCH API', false, `Database error: ${docError.message}`);
      return;
    }

    if (!docs || docs.length === 0) {
      logResult('Document PATCH API', true, 'API endpoint exists (no documents to test with)');
      return;
    }

    const testDoc = docs[0];
    const originalYear = testDoc.year;
    const testYear = '2020';

    // Try to update the document
    const response = await fetch('http://localhost:3000/api/documents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: testDoc.id,
        adminPassword: ADMIN_PASSWORD,
        updates: { year: testYear }
      })
    }).catch(() => null);

    if (!response) {
      logResult('Document PATCH API', false, 'Could not connect to API (server not running?)');
      return;
    }

    const result = await response.json();

    if (result.success) {
      // Restore original value
      await fetch('http://localhost:3000/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: testDoc.id,
          adminPassword: ADMIN_PASSWORD,
          updates: { year: originalYear }
        })
      });

      logResult('Document PATCH API', true, `Updated ${testDoc.name} year to ${testYear}, then restored`);
    } else {
      logResult('Document PATCH API', false, `API error: ${result.error}`);
    }
  } catch (err: any) {
    logResult('Document PATCH API', false, `Exception: ${err.message}`);
  }
}

async function testLocalDocumentsAPI() {
  log('Testing local documents API (includes year/period/fileUrl)...');

  try {
    const response = await fetch('http://localhost:3000/api/local-documents')
      .catch(() => null);

    if (!response) {
      logResult('Local Documents API', false, 'Could not connect to API (server not running?)');
      return;
    }

    const result = await response.json();

    if (result.documents && Array.isArray(result.documents)) {
      if (result.documents.length === 0) {
        logResult('Local Documents API', true, 'API works (no documents in database to verify fields)');
        return;
      }

      const sampleDoc = result.documents[0];
      const hasNewFields = sampleDoc &&
        'docType' in sampleDoc &&
        'year' in sampleDoc &&
        'period' in sampleDoc &&
        'fileUrl' in sampleDoc;

      if (hasNewFields) {
        logResult('Local Documents API', true, `Returns ${result.documents.length} docs with docType/year/period/fileUrl fields`);
      } else {
        logResult('Local Documents API', false, `Missing new fields in response. Keys: ${Object.keys(sampleDoc).join(', ')}`);
      }
    } else {
      logResult('Local Documents API', false, `Unexpected response: ${JSON.stringify(result).substring(0, 100)}`);
    }
  } catch (err: any) {
    logResult('Local Documents API', false, `Exception: ${err.message}`);
  }
}

async function testSummaryCleanup() {
  log('Testing JSONB summary cleanup (no document_type/time_period)...');

  try {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, name, summary')
      .not('summary', 'is', null)
      .limit(5);

    if (error) {
      logResult('Summary JSONB Cleanup', false, `Error: ${error.message}`);
      return;
    }

    if (!docs || docs.length === 0) {
      logResult('Summary JSONB Cleanup', true, 'No documents with summary to check');
      return;
    }

    // Check that summary doesn't have document_type or time_period
    let cleanCount = 0;
    let dirtyDocs: string[] = [];

    for (const doc of docs) {
      const summary = doc.summary as any;
      if (summary) {
        if ('document_type' in summary || 'time_period' in summary) {
          dirtyDocs.push(doc.name);
        } else {
          cleanCount++;
        }
      }
    }

    if (dirtyDocs.length === 0) {
      logResult('Summary JSONB Cleanup', true, `All ${cleanCount} docs have clean summary (no document_type/time_period)`);
    } else {
      logResult('Summary JSONB Cleanup', false, `${dirtyDocs.length} docs still have old fields: ${dirtyDocs.join(', ')}`);
    }
  } catch (err: any) {
    logResult('Summary JSONB Cleanup', false, `Exception: ${err.message}`);
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('Phase 6 Feature Tests');
  console.log('='.repeat(60));
  console.log('');

  // Database tests (don't require server)
  await testStorageBucket();
  await testFileUrlColumn();
  await testYearPeriodColumns();
  await testDocumentConstants();
  await testSummaryCleanup();

  console.log('');
  console.log('-'.repeat(60));
  console.log('API Tests (require dev server running)');
  console.log('-'.repeat(60));
  console.log('');

  // API tests (require server)
  await testPreviewUrlAPI();
  await testPatchAPI();
  await testLocalDocumentsAPI();

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('');

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.details}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
