"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { LAST_UPLOAD_KEY } from "@/lib/constants";
import type { Upload } from "@/types";

export function useUploads() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    api.getUploads().then((r) => {
      if (!r.success) {
        setLoading(false);
        return;
      }
      const list = (r.data as Upload[]) || [];
      setUploads(list);
      const saved = localStorage.getItem(LAST_UPLOAD_KEY);
      if (saved && list.some((u) => u.id === saved)) {
        setSelectedId(saved);
      } else if (list.length === 1) {
        setSelectedId(list[0].id);
      }
      setLoading(false);
    });
  }, []);

  const selectUpload = (id: string) => {
    setSelectedId(id);
    if (id) localStorage.setItem(LAST_UPLOAD_KEY, id);
  };

  return { uploads, loading, selectedId, setSelectedId: selectUpload };
}
