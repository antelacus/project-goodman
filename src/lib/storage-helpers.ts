/**
 * Storage Helpers for Supabase Storage
 *
 * Provides functions for uploading, downloading, and managing files
 * in the document-files bucket.
 *
 * Uses service role key for server-side operations (bypasses RLS).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'document-files';

// Signed URL expiration time (1 hour)
const SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Create a Supabase client with service role key for storage operations
 * This bypasses RLS and is used for server-side admin operations only
 */
function createStorageClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sanitize filename for Supabase Storage
 * Supabase Storage doesn't accept non-ASCII characters in file keys
 *
 * @param filename - Original filename (may contain Chinese characters)
 * @returns Safe filename with only ASCII characters
 */
function sanitizeFilename(filename: string): string {
  // Extract extension
  const lastDot = filename.lastIndexOf('.');
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';
  const baseName = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  // Check if filename contains non-ASCII characters
  const hasNonAscii = /[^\x00-\x7F]/.test(baseName);

  if (hasNonAscii) {
    // Generate a timestamp-based safe filename, preserving extension
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `file_${timestamp}_${randomSuffix}${ext}`;
  }

  // Replace any potentially problematic characters for ASCII filenames
  return baseName.replace(/[^a-zA-Z0-9._-]/g, '_') + ext;
}

/**
 * Upload a file to Supabase Storage
 *
 * @param documentId - The document ID (used as folder name)
 * @param filename - Original filename
 * @param base64Data - File content as base64 string
 * @returns The storage path (e.g., "document-id/filename.xlsx")
 */
export async function uploadFileToStorage(
  documentId: string,
  filename: string,
  base64Data: string
): Promise<string> {
  const supabase = createStorageClient();

  // Sanitize filename for Supabase Storage (doesn't accept non-ASCII)
  const safeFilename = sanitizeFilename(filename);

  // Construct storage path: {document_id}/{safe_filename}
  const storagePath = `${documentId}/${safeFilename}`;

  // Convert base64 to buffer
  const buffer = Buffer.from(base64Data, 'base64');

  // Detect content type from filename
  const contentType = getContentType(filename);

  console.log(`[Storage] Uploading file: ${storagePath}, size: ${buffer.length} bytes, type: ${contentType}`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error('[Storage] Upload error:', error);
    throw new Error(`Failed to upload file to storage: ${error.message}`);
  }

  console.log(`[Storage] File uploaded successfully: ${data.path}`);

  // Return the storage path (not full URL)
  return data.path;
}

/**
 * Delete a file from Supabase Storage
 *
 * @param storagePath - The storage path (e.g., "document-id/filename.xlsx")
 */
export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  if (!storagePath) {
    console.log('[Storage] No storage path provided, skipping delete');
    return;
  }

  const supabase = createStorageClient();

  console.log(`[Storage] Deleting file: ${storagePath}`);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error('[Storage] Delete error:', error);
    throw new Error(`Failed to delete file from storage: ${error.message}`);
  }

  console.log(`[Storage] File deleted successfully: ${storagePath}`);
}

/**
 * Delete all files for a document (entire folder)
 *
 * @param documentId - The document ID
 */
export async function deleteDocumentFiles(documentId: string): Promise<void> {
  const supabase = createStorageClient();

  console.log(`[Storage] Deleting all files for document: ${documentId}`);

  // List all files in the document folder
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(documentId);

  if (listError) {
    console.error('[Storage] List error:', listError);
    throw new Error(`Failed to list files: ${listError.message}`);
  }

  if (!files || files.length === 0) {
    console.log(`[Storage] No files found for document: ${documentId}`);
    return;
  }

  // Delete all files in the folder
  const filePaths = files.map(file => `${documentId}/${file.name}`);

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths);

  if (deleteError) {
    console.error('[Storage] Delete error:', deleteError);
    throw new Error(`Failed to delete files: ${deleteError.message}`);
  }

  console.log(`[Storage] Deleted ${files.length} files for document: ${documentId}`);
}

/**
 * Get a signed URL for downloading a file
 *
 * @param storagePath - The storage path (e.g., "document-id/filename.xlsx")
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL for downloading the file
 */
export async function getSignedFileUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!storagePath) {
    return null;
  }

  const supabase = createStorageClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('[Storage] Signed URL error:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Get multiple signed URLs at once (batch operation)
 *
 * @param storagePaths - Array of storage paths
 * @param expiresIn - URL expiration time in seconds
 * @returns Map of storage path to signed URL
 */
export async function getSignedFileUrls(
  storagePaths: string[],
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<Map<string, string>> {
  const supabase = createStorageClient();
  const urlMap = new Map<string, string>();

  // Filter out empty paths
  const validPaths = storagePaths.filter(p => p && p.length > 0);

  if (validPaths.length === 0) {
    return urlMap;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrls(validPaths, expiresIn);

  if (error) {
    console.error('[Storage] Batch signed URLs error:', error);
    return urlMap;
  }

  // Map results
  data.forEach((item, index) => {
    if (item.signedUrl) {
      urlMap.set(validPaths[index], item.signedUrl);
    }
  });

  return urlMap;
}

/**
 * Get content type from filename
 */
function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();

  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'txt': 'text/plain',
    'csv': 'text/csv',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

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

/**
 * Download a file from Supabase Storage as a Base64 string
 *
 * @param storagePath - The storage path or full URL (we'll extract the path)
 * @returns Base64 string of the file content
 */
export async function downloadFileAsBase64(storagePath: string): Promise<string> {
  const supabase = createStorageClient();

  // If a full URL is provided, extract the path
  // Assume standard Supabase storage URL format or just the path
  // If it's a full URL, we might need to handle it, but for now assume we get the path or relative path
  // Ideally, the caller provides the internal storage path (e.g., "doc_id/file.pdf")

  // Clean path just in case
  let cleanPath = storagePath;
  if (storagePath.includes(`${BUCKET_NAME}/`)) {
    cleanPath = storagePath.split(`${BUCKET_NAME}/`)[1];
  }

  console.log(`[Storage] Downloading file: ${cleanPath}`);

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(cleanPath);

  if (error) {
    console.error('[Storage] Download error:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data received from download');
  }

  // Convert Blob/File to ArrayBuffer then Buffer then Base64
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

/**
 * Get the first file found for a document ID
 * Used as a fallback when file_url is missing in database
 */
export async function getFirstFileForDocument(documentId: string): Promise<{ path: string; name: string } | null> {
  const supabase = createStorageClient();

  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(documentId, {
      limit: 1,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

  if (error) {
    console.error('[Storage] List files error:', error);
    return null;
  }

  if (!files || files.length === 0) {
    return null;
  }

  // Filter out .emptyFolderPlaceholder if it exists
  const validFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder');

  if (validFiles.length === 0) return null;

  const file = validFiles[0];
  return {
    path: `${documentId}/${file.name}`,
    name: file.name
  };
}
