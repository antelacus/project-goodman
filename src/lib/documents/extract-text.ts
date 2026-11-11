import ExcelJS from "exceljs";
import { readDocumentText } from "@/lib/ai";

/**
 * The file's text, and its pages for the regulation splitter (REQ §5.6): a PDF's
 * text layer page by page with the PDF's own page count, which the splitter
 * checks against; any other text is one page. `pages` is null for a PDF read as
 * a scan, which has no pages to split by.
 */
export interface ExtractedFile {
  text: string;
  pages: { pages: string[]; pageCount: number } | null;
}

export async function extractTextFromFile(
  fileData: string,
  fileName: string
): Promise<ExtractedFile> {
  const onePage = (text: string): ExtractedFile => ({ text, pages: { pages: [text], pageCount: 1 } });
  // Detect file type from extension
  const ext = fileName.toLowerCase().split('.').pop();
  console.log(`[extractTextFromFile] Processing file: ${fileName}, extension: ${ext}, data length: ${fileData.length}`);

  if (ext === 'xlsx') {
    // Excel file - parse with exceljs library (async API)
    try {
      const buffer = Buffer.from(fileData, 'base64');
      console.log(`[extractTextFromFile] Buffer created, size: ${buffer.length} bytes`);

      const workbook = new ExcelJS.Workbook();
      // REASON: exceljs types expect Buffer but Node.js 22+ returns Buffer<ArrayBuffer>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await workbook.xlsx.load(buffer as any);
      console.log(`[extractTextFromFile] Workbook loaded, sheets: ${workbook.worksheets.map(ws => ws.name).join(', ')}`);

      // Find the sheet with the most data (skip metadata sheets)
      let bestSheet = workbook.worksheets[0];
      let bestRowCount = 0;

      for (const worksheet of workbook.worksheets) {
        let rowCount = 0;
        worksheet.eachRow(() => { rowCount++; });
        console.log(`[extractTextFromFile] Sheet "${worksheet.name}" has ${rowCount} rows`);

        if (rowCount > bestRowCount) {
          bestRowCount = rowCount;
          bestSheet = worksheet;
        }
      }

      console.log(`[extractTextFromFile] Using sheet: ${bestSheet.name} with ${bestRowCount} rows`);

      // Convert worksheet to array of arrays for text extraction
      const rows: (string | number | null)[][] = [];
      bestSheet.eachRow((row) => {
        const rowData: (string | number | null)[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Ensure array is large enough
          while (rowData.length < colNumber - 1) {
            rowData.push(null);
          }
          // Get cell value, handling different types
          const value = cell.value;
          if (value === null || value === undefined) {
            rowData.push(null);
          } else if (typeof value === 'object' && 'result' in value) {
            // Formula cell - use the result
            rowData.push(value.result as string | number | null);
          } else if (typeof value === 'object' && 'text' in value) {
            // Rich text cell
            rowData.push(value.text as string);
          } else {
            rowData.push(value as string | number);
          }
        });
        rows.push(rowData);
      });

      console.log(`[extractTextFromFile] Sheet parsed, rows: ${rows.length}`);

      // Format as text
      const text = rows
        .filter(row => row.some(cell => cell != null && cell !== ''))
        .map(row => row.map(cell => cell ?? '').join('\t'))
        .join('\n');

      console.log(`[extractTextFromFile] Text extracted, length: ${text.length}`);
      return onePage(text);
    } catch (err) {
      console.error(`[extractTextFromFile] Excel parsing error:`, err);
      throw new Error(`Excel parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  } else if (ext === 'pdf') {
    // Direct text extraction first (unpdf, serverless-friendly); a scan with little
    // or no text layer, or a file unpdf cannot parse, is read as a document image.
    let textContent = '';
    let pages: string[] = [];
    let pageCount = 0;
    try {
      const { extractText } = await import('unpdf');
      const result = await extractText(new Uint8Array(Buffer.from(fileData, 'base64')));
      pages = result.text;
      pageCount = result.totalPages;
      textContent = pages.join('\n\n');
      console.log(`[extractTextFromFile] PDF text extracted directly, length: ${textContent.length} chars, pages: ${pageCount}`);
    } catch (pdfError) {
      console.error(`[extractTextFromFile] PDF parse error:`, pdfError);
    }

    if (textContent.trim().length > 100) {
      return { text: textContent, pages: { pages, pageCount } };
    }
    console.log(`[extractTextFromFile] Reading the PDF as a scan...`);
    return { text: await readDocumentText({ fileName, mimeType: 'application/pdf', base64: fileData }), pages: null };
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) {
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    return onePage(await readDocumentText({ fileName, mimeType, base64: fileData }));
  } else if (ext === 'txt' || ext === 'md') {
    // Plain text - decode from base64
    return onePage(Buffer.from(fileData, 'base64').toString('utf-8'));
  }

  // If no extension match, assume it's already text
  return onePage(fileData);
}
