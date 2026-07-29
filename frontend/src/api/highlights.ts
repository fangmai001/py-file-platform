import { del, getJSON, patchJSON, postJSON } from "./client";
import type { HighlightItem } from "./types";

export interface CreateHighlightInput {
  icon: string;
  title: string;
  description?: string | null;
  sort_order?: number;
  is_public?: boolean;
}

export interface UpdateHighlightInput {
  icon?: string;
  title?: string;
  description?: string | null;
  sort_order?: number;
  is_public?: boolean;
}

export function listHighlights(): Promise<HighlightItem[]> {
  return getJSON<HighlightItem[]>("/highlights");
}

export function createHighlight(input: CreateHighlightInput): Promise<HighlightItem> {
  return postJSON<HighlightItem>("/highlights", input);
}

export function updateHighlight(highlightId: number, input: UpdateHighlightInput): Promise<HighlightItem> {
  return patchJSON<HighlightItem>(`/highlights/${highlightId}`, input);
}

export function deleteHighlight(highlightId: number): Promise<void> {
  return del(`/highlights/${highlightId}`);
}
