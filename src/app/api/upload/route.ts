export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const docCategory = formData.get('docCategory') as string;
    const documentId = formData.get('documentId') as string;

    if (!file || !docCategory || !documentId) {
      return NextResponse.json(
        { error: "Missing required fields: file, docCategory, documentId" },
        { status: 400 }
      );
    }

    // 只允许前端上传业务型文档
    if (docCategory !== 'business') {
      return NextResponse.json(
        { error: "前端只允许上传业务型文档" },
        { status: 400 }
      );
    }

    // 文件类型校验
    const allowedTypes = ['pdf', 'xlsx', 'txt', 'csv'];
    const fileExtension = (file as File).name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Unsupported file type. Only PDF, XLSX, TXT, and CSV files are allowed." },
        { status: 400 }
      );
    }

    // 简单验证通过，返回成功响应
    // 实际的文件处理将在前端进行，不存储到服务器
    return NextResponse.json({
      success: true,
      documentId,
      fileName: (file as File).name,
      fileSize: (file as File).size,
      message: "File validation successful"
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    // 由于文件不存储在服务器，直接返回成功
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });

  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 