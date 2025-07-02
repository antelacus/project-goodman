export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, STORAGE_BUCKET, TABLES } from "../../../lib/supabase";

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

    // 关键：将 file 转为 ArrayBuffer/Buffer
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${documentId}_${(file as File).name}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: (file as File).type || undefined,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    // 创建文档记录
    const { data: docData, error: docError } = await supabaseAdmin
      .from(TABLES.DOCUMENTS)
      .insert({
        id: documentId,
        name: (file as File).name,
        type: fileExtension,
        doc_category: docCategory,
        status: 'processing',
        size: (file as File).size,
        storage_path: uploadData.path,
      })
      .select()
      .single();

    if (docError) {
      console.error('Document creation error:', docError);
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([uploadData.path]);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId,
      fileName: (file as File).name,
      fileSize: (file as File).size,
      storagePath: uploadData.path,
      message: "File uploaded successfully"
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

    // 获取文档信息
    const { data: document, error: docError } = await supabaseAdmin
      .from(TABLES.DOCUMENTS)
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // 删除存储中的文件
    if (document.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove([document.storage_path]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // 删除数据库记录（级联删除会处理相关数据）
    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.DOCUMENTS)
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Document deletion error:', deleteError);
      return NextResponse.json(
        { error: "Failed to delete document" },
        { status: 500 }
      );
    }

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