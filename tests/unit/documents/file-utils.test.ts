import { describe, it, expect } from 'vitest';
import {
  getFileExtension,
  isPreviewable,
  isImage,
  isPdf,
  isExcel,
} from '@/lib/documents/file-utils';

describe('file utilities', () => {
  it('extracts file extensions in lowercase', () => {
    expect(getFileExtension('Report.PDF')).toBe('pdf');
    expect(getFileExtension('archive.tar.gz')).toBe('gz');
    expect(getFileExtension('noext')).toBe('noext');
  });

  it('detects previewable types', () => {
    expect(isPreviewable('chart.png')).toBe(true);
    expect(isPreviewable('report.pdf')).toBe(true);
    expect(isPreviewable('data.xlsx')).toBe(false);
  });

  it('detects image, pdf, and excel file types', () => {
    expect(isImage('photo.jpeg')).toBe(true);
    expect(isImage('sheet.xls')).toBe(false);
    expect(isPdf('scan.PDF')).toBe(true);
    expect(isPdf('scan.png')).toBe(false);
    expect(isExcel('sheet.xlsx')).toBe(true);
    expect(isExcel('sheet.xls')).toBe(true);
  });
});
