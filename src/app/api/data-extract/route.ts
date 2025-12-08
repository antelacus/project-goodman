export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import * as XLSX from "xlsx";
import { getDataExtractPrompt } from "../../../lib/prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Supported file types
const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
];

const SUPPORTED_PDF_TYPE = 'application/pdf';
const SUPPORTED_EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, SUPPORTED_PDF_TYPE, SUPPORTED_EXCEL_TYPE];

// Max file size: 2MB (Base64 is ~1.37x larger)
const MAX_BASE64_SIZE = 2 * 1024 * 1024 * 1.4;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileData, fileType, fileName } = body;

    // Validate required fields
    if (!fileData || !fileType) {
      return NextResponse.json({
        success: false,
        error: 'missing_fields',
        message: '缺少必要参数'
      }, { status: 400 });
    }

    // Validate file type
    if (!ALL_SUPPORTED_TYPES.includes(fileType)) {
      return NextResponse.json({
        success: false,
        error: 'invalid_file_type',
        message: '不支持的文件格式，请上传 PDF、PNG、JPG、JPEG、WEBP、GIF 或 Excel(.xlsx) 文件'
      }, { status: 400 });
    }

    // Validate file size
    if (fileData.length > MAX_BASE64_SIZE) {
      return NextResponse.json({
        success: false,
        error: 'file_too_large',
        message: '文件大小超过 2MB 限制'
      }, { status: 400 });
    }

    const prompt = getDataExtractPrompt();

    let result: string | null = null;

    // Handle different file types
    if (SUPPORTED_IMAGE_TYPES.includes(fileType)) {
      // Image processing with Vision API
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${fileType};base64,${fileData}`,
                detail: "auto"
              }
            }
          ]
        }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096
      });

      result = response.choices[0]?.message?.content;
    } else if (fileType === SUPPORTED_PDF_TYPE) {
      // PDF processing using Responses API with file input
      // Chat completions API doesn't support PDF, must use responses API
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_file",
                filename: fileName || "document.pdf",
                file_data: `data:${fileType};base64,${fileData}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        }
      });

      result = response.output_text;
    } else if (fileType === SUPPORTED_EXCEL_TYPE) {
      // Excel processing - parse with xlsx library then send to LLM
      const buffer = Buffer.from(fileData, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Get first sheet only (single sheet support)
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // Convert to array of arrays for better structure
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      // Format as text for LLM processing
      const textContent = (jsonData as any[][])
        .filter(row => row.some(cell => cell != null && cell !== ''))
        .map(row => row.map(cell => cell ?? '').join('\t'))
        .join('\n');

      // Send to LLM for structured extraction
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "user",
          content: `${prompt}\n\n以下是Excel表格内容（制表符分隔）：\n\n${textContent}`
        }],
        response_format: { type: "json_object" },
        max_tokens: 4096
      });

      result = response.choices[0]?.message?.content;
    }

    if (!result) {
      throw new Error("AI extraction returned no result");
    }

    // Parse and return the result
    const parsedResult = JSON.parse(result);

    return NextResponse.json({
      success: true,
      data: parsedResult,
      fileType: fileType,
      fileName: fileName || 'unknown'
    });

  } catch (err: unknown) {
    console.error("Data Extract API Error:", err);

    const errorMessage = err instanceof Error ? err.message : "未知错误";

    // Check for specific OpenAI errors
    if (errorMessage.includes('Could not process image')) {
      return NextResponse.json({
        success: false,
        error: 'image_processing_failed',
        message: '图片处理失败，请确保上传的是清晰的图片或PDF文件'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'extraction_failed',
      message: 'AI 提取失败，请重试',
      details: errorMessage
    }, { status: 500 });
  }
}
