import { create } from "zustand";

export type DocumentSummary = {
  document_type: string;
  summary: string;
  key_metrics: string[];
  time_period: string;
};

export type DocumentChunk = {
  id: string;
  text: string;
  chunkIndex: number;
};

export type Document = {
  id: string;
  name: string;
  type: "pdf" | "excel" | "txt" | "csv" | "knowledge" | "business";
  docCategory: "knowledge" | "business";
  docType?: string | null;      // Database column (source of truth)
  year?: string | null;          // Database column (source of truth)
  period?: string | null;        // Database column (source of truth)
  fileUrl?: string | null;       // Storage path for original file
  uploadTime: string;
  status: "processing" | "ready" | "error";
  size: number;
  summary?: DocumentSummary;
  chunks?: DocumentChunk[];
  is_temp?: boolean;
};

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf');
  if (!response.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = await response.json() as { success?: boolean; token?: string };
  if (!data?.success || !data.token) {
    throw new Error('Failed to fetch CSRF token');
  }

  return data.token;
}

interface DocumentStore {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  addDocument: (doc: Document) => void;
  updateDocument: (id: string, update: Partial<Document>) => void;
  removeDocument: (id: string) => void;
  deleteDocument: (id: string) => Promise<void>;
  setDocuments: (docs: Document[]) => void;
  getDocumentsByCategory: (category: "knowledge" | "business") => Document[];
  clear: () => void;
  loadDocumentsFromJsonDir: () => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  isLoading: false,
  error: null,

  addDocument: (doc) => set((state) => ({ documents: [...state.documents, doc] })),

  updateDocument: (id, update) => set((state) => ({
    documents: state.documents.map((doc) =>
      doc.id === id ? { ...doc, ...update } : doc
    ),
  })),

  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter((doc) => doc.id !== id),
  })),

  deleteDocument: async (id) => {
    try {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
        headers: {
          'x-csrf-token': csrfToken,
        },
      });
      if (!res.ok) throw new Error('Failed to delete document');
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting document:', error);
      set({ error: 'Failed to delete document' });
      throw error;
    }
  },

  setDocuments: (docs) => set(() => ({ documents: docs })),

  getDocumentsByCategory: (category) => get().documents.filter((doc) => {
    if (category === "business") {
      // Business category includes both persistent business docs and temp docs
      return doc.docCategory === "business" || doc.is_temp;
    }
    return doc.docCategory === category;
  }),

  clear: () => set(() => ({ documents: [] })),

  // 从Supabase数据库加载所有文档
  loadDocumentsFromJsonDir: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/local-documents");
      if (!res.ok) throw new Error("无法加载文档");
      const data = await res.json();
      const allDocs = data.documents || [];
      set({
        documents: allDocs,
        isLoading: false
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      set({ error: 'Failed to load documents', isLoading: false });
    }
  },
})); 
