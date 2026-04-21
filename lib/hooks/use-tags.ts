"use client";
import { useState, useEffect } from "react";
import type { Tag } from "@/lib/types";

let _tags: Tag[] | null = null;

export function useTags() {
  const [tags, setTags] = useState<Tag[]>(_tags ?? []);
  const [loading, setLoading] = useState(_tags === null);

  useEffect(() => {
    if (_tags !== null) { setLoading(false); return; }
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => { _tags = d.tags ?? []; setTags(_tags!); setLoading(false); });
  }, []);

  return { tags, loading };
}
