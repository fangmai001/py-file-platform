import { del, getJSON, patchJSON, postJSON } from "./client";
import type { LinkCardItem } from "./types";

export interface CreateLinkCardInput {
  title: string;
  description?: string | null;
  url: string;
  folder_id?: number | null;
  is_public?: boolean;
}

export interface UpdateLinkCardInput {
  title?: string;
  description?: string | null;
  url?: string;
  folder_id?: number | null;
  is_public?: boolean;
}

export interface ListLinkCardsOptions {
  folderId?: number | null;
}

export function listLinkCards(options: ListLinkCardsOptions = {}): Promise<LinkCardItem[]> {
  const params = new URLSearchParams();
  if (options.folderId != null) {
    params.set("folder_id", String(options.folderId));
  }
  const query = params.toString();
  return getJSON<LinkCardItem[]>(query ? `/link-cards?${query}` : "/link-cards");
}

export function createLinkCard(input: CreateLinkCardInput): Promise<LinkCardItem> {
  return postJSON<LinkCardItem>("/link-cards", input);
}

export function updateLinkCard(linkCardId: number, input: UpdateLinkCardInput): Promise<LinkCardItem> {
  return patchJSON<LinkCardItem>(`/link-cards/${linkCardId}`, input);
}

export function deleteLinkCard(linkCardId: number): Promise<void> {
  return del(`/link-cards/${linkCardId}`);
}
