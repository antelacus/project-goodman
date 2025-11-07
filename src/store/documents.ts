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
  embedding: number[];
  chunkIndex: number;
};

export type Document = {
  id: string;
  name: string;
  type: "pdf" | "excel" | "txt" | "csv" | "knowledge" | "business";
  docCategory: "knowledge" | "business";
  uploadTime: string;
  status: "processing" | "ready" | "error";
  size: number;
  summary?: DocumentSummary;
  chunks?: DocumentChunk[];
};

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
      const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
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
  
  getDocumentsByCategory: (category) => get().documents.filter((doc) => doc.docCategory === category),
  
  clear: () => set(() => ({ documents: [] })),

  // 从Supabase数据库加载所有知识型文档
  loadDocumentsFromJsonDir: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/local-documents");
      if (!res.ok) throw new Error("无法加载本地文档");
      const data = await res.json();
      const knowledgeDocs = (data.documents || []).filter((doc: { docCategory: string; id: string }) => doc.docCategory === "knowledge");
      set((state) => {
        // 只保留业务型文档和未重复的知识型文档
        const businessDocs = state.documents.filter((doc) => doc.docCategory === "business");
        // knowledgeDocs去重（以id为主）
        const existingKnowledgeIds = new Set(businessDocs.map((doc) => doc.id));
        const mergedKnowledgeDocs = knowledgeDocs.filter((doc: { id: string }) => !existingKnowledgeIds.has(doc.id));
        return {
          documents: [...businessDocs, ...mergedKnowledgeDocs],
          isLoading: false
        };
      });
    } catch (error) {
      set({ error: 'Failed to load local documents', isLoading: false });
    }
  },
})); 