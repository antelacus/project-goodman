"use client";
import { useEffect } from "react";
import { useDocumentStore } from "../store/documents";

export function ClientOnlyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useDocumentStore.getState().loadDocumentsFromJsonDir();
  }, []);
  return <>{children}</>;
} 