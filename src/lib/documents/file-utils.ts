/**
 * File Utility Functions
 *
 * Pure utility functions for file type detection.
 * These are safe to import in both client and server components.
 */

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() || '';
}

/**
 * Check if file type is previewable in browser
 */
export function isPreviewable(filename: string): boolean {
  const ext = getFileExtension(filename);
  const previewableTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
  return previewableTypes.includes(ext);
}

/**
 * Check if file is an image
 */
export function isImage(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
}

/**
 * Check if file is a PDF
 */
export function isPdf(filename: string): boolean {
  return getFileExtension(filename) === 'pdf';
}

/**
 * Check if file is an Excel file
 */
export function isExcel(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['xlsx', 'xls'].includes(ext);
}
