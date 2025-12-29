/**
 * API Route: GET /api/documents/pdf-preview
 *
 * Renders PDF pages as images for secure preview (no download capability).
 * Uses pdfjs-dist with canvas to render PDF pages server-side.
 *
 * Query Parameters:
 * - fileUrl: The storage path of the PDF file
 * - page: Page number to render (1-indexed, default: 1)
 * - scale: Render scale (default: 1.5 for good quality)
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/database";
import { generateRequestId, createErrorResponse } from "@/lib/security";

// Dynamic imports for server-side PDF rendering
let pdfjs: typeof import("pdfjs-dist") | null = null;
let createCanvas: typeof import("canvas").createCanvas | null = null;

async function initPdfJs() {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist");
    // Set up the worker for Node.js environment
    const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
  if (!createCanvas) {
    const canvas = await import("canvas");
    createCanvas = canvas.createCanvas;
  }
  return { pdfjs, createCanvas };
}

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("fileUrl");
    const pageNum = parseInt(searchParams.get("page") || "1", 10);
    const scale = parseFloat(searchParams.get("scale") || "1.5");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl parameter is required" },
        { status: 400 }
      );
    }

    // Initialize PDF.js and canvas
    const { pdfjs: pdf, createCanvas: canvas } = await initPdfJs();
    if (!pdf || !canvas) {
      return NextResponse.json(
        { error: "Failed to initialize PDF renderer" },
        { status: 500 }
      );
    }

    // Get the PDF file from Supabase storage
    const supabase = createServerSupabaseClient();

    // Extract bucket and path from fileUrl
    // fileUrl format: "document-files/path/to/file.pdf" or just the path
    let bucketName = "document-files";
    let filePath = fileUrl;

    if (fileUrl.startsWith("document-files/")) {
      filePath = fileUrl.substring("document-files/".length);
    }

    // Download the PDF file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Failed to download PDF:", downloadError);
      return NextResponse.json(
        { error: "Failed to download PDF file" },
        { status: 404 }
      );
    }

    // Convert blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load the PDF document
    const loadingTask = pdf.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });
    const pdfDocument = await loadingTask.promise;

    // Validate page number
    const numPages = pdfDocument.numPages;
    if (pageNum < 1 || pageNum > numPages) {
      return NextResponse.json(
        { error: `Invalid page number. PDF has ${numPages} pages.`, numPages },
        { status: 400 }
      );
    }

    // Get the requested page
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    // Create canvas with the page dimensions
    const canvasInstance = canvas(viewport.width, viewport.height);
    const context = canvasInstance.getContext("2d");

    // Render the page to canvas
    // @ts-expect-error - pdfjs-dist types are not fully compatible with node-canvas
    await page.render({
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    // Convert canvas to PNG buffer
    const pngBuffer = canvasInstance.toBuffer("image/png");

    // Return the image with appropriate headers
    return new NextResponse(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
        "X-Total-Pages": numPages.toString(),
        // Prevent download by disabling content-disposition
        "Content-Disposition": "inline",
      },
    });
  } catch (error: unknown) {
    console.error("PDF preview error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}

// Also provide page count endpoint
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: "fileUrl is required" },
        { status: 400 }
      );
    }

    // Initialize PDF.js
    const { pdfjs: pdf } = await initPdfJs();
    if (!pdf) {
      return NextResponse.json(
        { error: "Failed to initialize PDF renderer" },
        { status: 500 }
      );
    }

    // Get the PDF file from Supabase storage
    const supabase = createServerSupabaseClient();

    let bucketName = "document-files";
    let filePath = fileUrl;

    if (fileUrl.startsWith("document-files/")) {
      filePath = fileUrl.substring("document-files/".length);
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Failed to download PDF file" },
        { status: 404 }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const loadingTask = pdf.getDocument({
      data: uint8Array,
      useSystemFonts: true,
    });
    const pdfDocument = await loadingTask.promise;

    return NextResponse.json({
      numPages: pdfDocument.numPages,
    });
  } catch (error: unknown) {
    console.error("PDF page count error:", error);
    return createErrorResponse(error, requestId, 500);
  }
}
