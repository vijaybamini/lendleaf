// Open Library API helpers — https://openlibrary.org/developers/api
// No API key required.

export interface OLBook {
  id: string; // open library work or edition key, e.g. "OL12345W"
  title: string;
  authors: string[];
  isbn: string | null;
  coverUrl: string | null;
}

interface OLSearchDoc {
  key: string; // "/works/OL12345W"
  title?: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  cover_edition_key?: string;
  edition_key?: string[];
}

interface OLSearchResponse {
  docs: OLSearchDoc[];
}

const SEARCH_URL = "https://openlibrary.org/search.json";

const pickIsbn = (doc: OLSearchDoc): string | null => {
  if (!doc.isbn?.length) return null;
  // Prefer ISBN-13
  const isbn13 = doc.isbn.find((i) => i.replace(/-/g, "").length === 13);
  return isbn13 ?? doc.isbn[0];
};

const coverFromDoc = (doc: OLSearchDoc): string | null => {
  if (doc.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }
  if (doc.cover_edition_key) {
    return `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`;
  }
  const isbn = pickIsbn(doc);
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  return null;
};

const looksLikeIsbn = (q: string): boolean => /^[0-9-]{10,17}$/.test(q.trim());

export async function searchOpenLibrary(query: string, limit = 12): Promise<OLBook[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({ limit: String(limit) });
  if (looksLikeIsbn(q)) {
    params.set("isbn", q.replace(/-/g, ""));
  } else {
    params.set("q", q);
  }
  const res = await fetch(`${SEARCH_URL}?${params.toString()}`);
  if (!res.ok) throw new Error("Open Library search failed");
  const data = (await res.json()) as OLSearchResponse;

  return (data.docs ?? []).slice(0, limit).map((doc) => ({
    id: doc.key, // e.g. "/works/OL12345W"
    title: doc.title ?? "Untitled",
    authors: doc.author_name ?? [],
    isbn: pickIsbn(doc),
    coverUrl: coverFromDoc(doc),
  }));
}
