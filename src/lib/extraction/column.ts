import ExcelJS from 'exceljs';
import {
    FinancialTable,
    getMetricDefinitions,
    resolveMetricKey,
} from '@/lib/financial/metric-registry';

const TABLE_BY_KEY = new Map(
    getMetricDefinitions().map((metric) => [metric.key, metric.table] as const)
);

const DOCUMENT_TYPE_TABLE: Record<string, FinancialTable> = {
    balance_sheet: 'balance_sheet',
    income_statement: 'income_statement',
    cash_flow: 'cash_flow',
};

export function normalizeMetricName(rawName: string): string | undefined {
    return resolveMetricKey(rawName);
}

function isKeyForDocumentType(key: string, documentType: string): boolean {
    const table = DOCUMENT_TYPE_TABLE[documentType];
    if (!table) return false;
    return TABLE_BY_KEY.get(key) === table;
}

export interface ColumnMapping {
    name: string;
    periodEnd: string;
    periodStart: string;
}

export interface ColumnExtractionOptions {
    year?: string;      // Year from form (e.g., "2024")
    period?: string;    // Period from form (e.g., "annual", "Q1")
    startDate?: string; // Optional start date for period comparison
    endDate?: string;   // Optional end date for current period
}

export async function performColumnBasedExtraction(
    fileBuffer: Buffer,
    mapping: ColumnMapping,
    startDate: string,
    endDate: string,
    documentType: string,
    options?: ColumnExtractionOptions
): Promise<{
    data: Array<{ year: string; period: string; content: Record<string, number> }>;
}> {
    console.log(`[Column Extraction] Starting with mapping:`, mapping);
    console.log(`[Column Extraction] Document Type:`, documentType);

    if (!DOCUMENT_TYPE_TABLE[documentType]) {
        console.warn(`[Column Extraction] Unknown document type: ${documentType}`);
    }

    const workbook = new ExcelJS.Workbook();
    // REASON: exceljs types expect Buffer but Node.js 22+ returns Buffer<ArrayBuffer>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
        throw new Error('Excel file has no worksheets');
    }

    // Convert worksheet to array of arrays (similar to xlsx header: 1)
    const rows: (string | number | null)[][] = [];
    worksheet.eachRow({ includeEmpty: true }, (row) => {
        const rowData: (string | number | null)[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            // Fill any gaps with null (exceljs may skip empty cells)
            while (rowData.length < colNumber - 1) {
                rowData.push(null);
            }
            const value = cell.value;
            if (value === null || value === undefined) {
                rowData.push(null);
            } else if (typeof value === 'object' && 'result' in value) {
                // Formula cell - get calculated result
                rowData.push(value.result as string | number | null);
            } else if (typeof value === 'object' && 'text' in value) {
                // Rich text cell - get text content
                rowData.push(value.text as string);
            } else {
                rowData.push(value as string | number);
            }
        });
        rows.push(rowData);
    });

    // Helper to get column index from letter (A -> 0, B -> 1)
    const getColIndex = (col: string) => {
        let index = 0;
        for (let i = 0; i < col.length; i++) {
            index = index * 26 + col.charCodeAt(i) - 64;
        }
        return index - 1;
    };

    const nameColIdx = getColIndex(mapping.name);
    const endColIdx = getColIndex(mapping.periodEnd);
    const startColIdx = getColIndex(mapping.periodStart);

    const contentEnd: Record<string, number> = {};
    const contentStart: Record<string, number> = {};

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawName = row[nameColIdx];

        if (!rawName || typeof rawName !== 'string' || rawName.trim() === '') continue;

        const canonicalKey = normalizeMetricName(rawName);
        if (!canonicalKey || !isKeyForDocumentType(canonicalKey, documentType)) continue;

        const valEnd = parseFloat(String(row[endColIdx]));
        const valStart = parseFloat(String(row[startColIdx]));

        if (!isNaN(valEnd)) contentEnd[canonicalKey] = valEnd;
        if (!isNaN(valStart)) contentStart[canonicalKey] = valStart;
    }

    // Determine years - use form values if provided, otherwise parse from dates
    let endYear: string;
    let startYear: string;
    const period = options?.period || 'annual';

    if (options?.year) {
        // Use year from form
        endYear = options.year;
        // For start year, try to parse from startDate or use previous year
        if (startDate && startDate.length > 0) {
            const parsedStart = new Date(startDate);
            startYear = !isNaN(parsedStart.getTime())
                ? parsedStart.getFullYear().toString()
                : (parseInt(endYear) - 1).toString();
        } else {
            startYear = (parseInt(endYear) - 1).toString();
        }
    } else if (endDate && endDate.length > 0) {
        // Parse from dates
        const parsedEnd = new Date(endDate);
        const parsedStart = new Date(startDate);

        if (isNaN(parsedEnd.getTime())) {
            throw new Error('Invalid end date provided. Please provide a valid date or select a year.');
        }

        endYear = parsedEnd.getFullYear().toString();
        startYear = !isNaN(parsedStart.getTime())
            ? parsedStart.getFullYear().toString()
            : (parseInt(endYear) - 1).toString();
    } else {
        throw new Error('Year is required. Please select a year for this financial document.');
    }

    console.log(`[Column Extraction] Using years: end=${endYear}, start=${startYear}, period=${period}`);

    // Build result - only include data that has content
    const result: Array<{ year: string; period: string; content: Record<string, number> }> = [];

    if (Object.keys(contentEnd).length > 0) {
        result.push({
            year: endYear,
            period: period,
            content: contentEnd
        });
    }

    if (Object.keys(contentStart).length > 0) {
        result.push({
            year: startYear,
            period: period,
            content: contentStart
        });
    }

    if (result.length === 0) {
        throw new Error('No financial data could be extracted from the document. Please check the column mapping.');
    }

    return { data: result };
}
