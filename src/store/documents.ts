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
  
  setDocuments: (docs) => set(() => ({ documents: docs })),
  
  getDocumentsByCategory: (category) => get().documents.filter((doc) => doc.docCategory === category),
  
  clear: () => set(() => ({ documents: [] })),
  
  // 加载本地data/documents目录下所有JSON文档
  loadDocumentsFromJsonDir: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/local-documents");
      if (!res.ok) throw new Error("无法加载本地文档");
      const data = await res.json();
      set({ documents: data.documents || [], isLoading: false });
    } catch (error) {
      set({ error: 'Failed to load local documents', isLoading: false });
    }
  },
})); 