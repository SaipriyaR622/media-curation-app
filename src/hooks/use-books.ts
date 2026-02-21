import { useCallback, useEffect, useState } from "react";
import { Book, BookDiaryEntry, BookStatus } from "@/lib/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "fragments-books";
const LEGACY_STORAGE_KEY = "cozy-book-tracker-books";
const MIGRATION_FLAG_PREFIX = "fragments-books-migrated";

const today = () => new Date().toISOString().split("T")[0];

interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_url: string;
  color: string | null;
  status: BookStatus;
  total_pages: number;
  current_page: number;
  rating: number;
  review: string;
  favorite_quote: string;
  tags: string[] | null;
  date_added: string;
  date_finished: string | null;
}

interface BookDiaryEntryRow {
  id: string;
  book_id: string;
  user_id: string;
  read_on: string;
  rating: number;
  review: string;
  reread: boolean;
  created_at: string;
}

function normalizeDiaryEntries(value: unknown): BookDiaryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const candidate = (entry ?? {}) as Partial<BookDiaryEntry>;
      return {
        id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
        readOn: typeof candidate.readOn === "string" ? candidate.readOn : today(),
        rating: typeof candidate.rating === "number" ? candidate.rating : 0,
        review: typeof candidate.review === "string" ? candidate.review : "",
        reread: Boolean(candidate.reread),
        createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date().toISOString(),
      };
    })
    .sort((a, b) => {
      const dateCompare = b.readOn.localeCompare(a.readOn);
      if (dateCompare !== 0) {
        return dateCompare;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}

function normalizeBook(value: unknown): Book {
  const candidate = (value ?? {}) as Partial<Book>;

  return {
    id: typeof candidate.id === "string" ? candidate.id : crypto.randomUUID(),
    title: typeof candidate.title === "string" ? candidate.title : "",
    author: typeof candidate.author === "string" ? candidate.author : "",
    coverUrl: typeof candidate.coverUrl === "string" ? candidate.coverUrl : "",
    color: typeof candidate.color === "string" ? candidate.color : undefined,
    status:
      candidate.status === "want-to-read" || candidate.status === "currently-reading" || candidate.status === "read"
        ? candidate.status
        : "want-to-read",
    totalPages: typeof candidate.totalPages === "number" ? candidate.totalPages : 0,
    currentPage: typeof candidate.currentPage === "number" ? candidate.currentPage : 0,
    rating: typeof candidate.rating === "number" ? candidate.rating : 0,
    review: typeof candidate.review === "string" ? candidate.review : "",
    favoriteQuote: typeof candidate.favoriteQuote === "string" ? candidate.favoriteQuote : "",
    tags: Array.isArray(candidate.tags) ? candidate.tags.filter((tag): tag is string => typeof tag === "string") : [],
    diaryEntries: normalizeDiaryEntries(candidate.diaryEntries),
    dateAdded: typeof candidate.dateAdded === "string" ? candidate.dateAdded : new Date().toISOString(),
    dateFinished: typeof candidate.dateFinished === "string" ? candidate.dateFinished : undefined,
  };
}

function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((book) => normalizeBook(book));
  } catch {
    return [];
  }
}

function saveBooks(books: Book[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function toDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().split("T")[0];
}

function mapBookRowToBook(row: BookRow, diaryEntries: BookDiaryEntry[]): Book {
  return {
    id: row.id,
    title: row.title ?? "",
    author: row.author ?? "",
    coverUrl: row.cover_url ?? "",
    color: row.color ?? undefined,
    status: row.status,
    totalPages: row.total_pages ?? 0,
    currentPage: row.current_page ?? 0,
    rating: row.rating ?? 0,
    review: row.review ?? "",
    favoriteQuote: row.favorite_quote ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    diaryEntries,
    dateAdded: row.date_added ?? new Date().toISOString(),
    dateFinished: row.date_finished ?? undefined,
  };
}

function mapBookToInsertRow(book: Book, userId: string) {
  return {
    id: book.id,
    user_id: userId,
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl ?? "",
    color: book.color ?? null,
    status: book.status,
    total_pages: Math.max(book.totalPages ?? 0, 0),
    current_page: Math.max(Math.min(book.currentPage ?? 0, book.totalPages ?? 0), 0),
    rating: Math.max(Math.min(book.rating ?? 0, 5), 0),
    review: book.review ?? "",
    favorite_quote: book.favoriteQuote ?? "",
    tags: Array.isArray(book.tags) ? book.tags : [],
    date_added: book.dateAdded || new Date().toISOString(),
    date_finished: toDateOnly(book.dateFinished),
  };
}

function mapBookToUpdateRow(book: Book) {
  return {
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl ?? "",
    color: book.color ?? null,
    status: book.status,
    total_pages: Math.max(book.totalPages ?? 0, 0),
    current_page: Math.max(Math.min(book.currentPage ?? 0, book.totalPages ?? 0), 0),
    rating: Math.max(Math.min(book.rating ?? 0, 5), 0),
    review: book.review ?? "",
    favorite_quote: book.favoriteQuote ?? "",
    tags: Array.isArray(book.tags) ? book.tags : [],
    date_added: book.dateAdded || new Date().toISOString(),
    date_finished: toDateOnly(book.dateFinished),
  };
}

function mapDiaryEntryToInsertRow(entry: BookDiaryEntry, bookId: string, userId: string) {
  return {
    id: entry.id,
    book_id: bookId,
    user_id: userId,
    read_on: toDateOnly(entry.readOn) ?? today(),
    rating: Math.max(Math.min(entry.rating ?? 0, 5), 0),
    review: entry.review ?? "",
    reread: Boolean(entry.reread),
    created_at: entry.createdAt || new Date().toISOString(),
  };
}

async function getCurrentUserId() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Unable to resolve Supabase user", error.message);
    return null;
  }

  return data.user?.id ?? null;
}

async function fetchBooksFromDatabase(userId: string): Promise<Book[]> {
  if (!supabase) {
    return [];
  }

  const { data: booksData, error: booksError } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .order("date_added", { ascending: false });

  if (booksError) {
    throw booksError;
  }

  const bookRows = (booksData ?? []) as BookRow[];
  if (bookRows.length === 0) {
    return [];
  }

  const bookIds = bookRows.map((book) => book.id);
  const { data: diaryData, error: diaryError } = await supabase
    .from("book_diary_entries")
    .select("*")
    .eq("user_id", userId)
    .in("book_id", bookIds)
    .order("read_on", { ascending: false })
    .order("created_at", { ascending: false });

  if (diaryError) {
    throw diaryError;
  }

  const diaryEntriesByBookId = new Map<string, BookDiaryEntry[]>();
  ((diaryData ?? []) as BookDiaryEntryRow[]).forEach((entry) => {
    const mapped: BookDiaryEntry = {
      id: entry.id,
      readOn: entry.read_on,
      rating: entry.rating ?? 0,
      review: entry.review ?? "",
      reread: Boolean(entry.reread),
      createdAt: entry.created_at ?? new Date().toISOString(),
    };

    const collection = diaryEntriesByBookId.get(entry.book_id) ?? [];
    collection.push(mapped);
    diaryEntriesByBookId.set(entry.book_id, collection);
  });

  return bookRows.map((row) => mapBookRowToBook(row, diaryEntriesByBookId.get(row.id) ?? []));
}

async function migrateBooksToDatabase(userId: string, books: Book[]) {
  if (!supabase || books.length === 0) {
    return;
  }

  const bookRows = books.map((book) => mapBookToInsertRow(book, userId));
  const { error: booksError } = await supabase.from("books").upsert(bookRows, { onConflict: "id" });
  if (booksError) {
    throw booksError;
  }

  const diaryRows = books.flatMap((book) =>
    normalizeDiaryEntries(book.diaryEntries).map((entry) => mapDiaryEntryToInsertRow(entry, book.id, userId))
  );

  if (diaryRows.length === 0) {
    return;
  }

  const { error: diaryError } = await supabase.from("book_diary_entries").upsert(diaryRows, { onConflict: "id" });
  if (diaryError) {
    throw diaryError;
  }
}

async function replaceDiaryEntriesInDatabase(userId: string, bookId: string, diaryEntries: BookDiaryEntry[]) {
  if (!supabase) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("book_diary_entries")
    .delete()
    .eq("user_id", userId)
    .eq("book_id", bookId);

  if (deleteError) {
    throw deleteError;
  }

  if (diaryEntries.length === 0) {
    return;
  }

  const diaryRows = normalizeDiaryEntries(diaryEntries).map((entry) => mapDiaryEntryToInsertRow(entry, bookId, userId));
  const { error: insertError } = await supabase.from("book_diary_entries").insert(diaryRows);
  if (insertError) {
    throw insertError;
  }
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>(loadBooks);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    let isActive = true;

    const hydrateUser = async () => {
      const userId = await getCurrentUserId();
      if (isActive) {
        setDbUserId(userId);
      }
    };

    void hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setDbUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !dbUserId) {
      return;
    }

    let isActive = true;

    const loadFromDatabase = async () => {
      try {
        const remoteBooks = await fetchBooksFromDatabase(dbUserId);
        if (!isActive) {
          return;
        }

        const migrationFlagKey = `${MIGRATION_FLAG_PREFIX}:${dbUserId}`;
        const isMigrated = localStorage.getItem(migrationFlagKey) === "1";

        if (remoteBooks.length === 0 && !isMigrated) {
          const localBooks = loadBooks();
          if (localBooks.length > 0) {
            await migrateBooksToDatabase(dbUserId, localBooks);
            if (!isActive) {
              return;
            }
            setBooks(localBooks);
          } else {
            setBooks([]);
          }
          localStorage.setItem(migrationFlagKey, "1");
          return;
        }

        setBooks(remoteBooks);
        localStorage.setItem(migrationFlagKey, "1");
      } catch (error) {
        console.error("Failed to load books from database", error);
      }
    };

    void loadFromDatabase();

    return () => {
      isActive = false;
    };
  }, [dbUserId]);

  useEffect(() => {
    if (dbUserId) {
      return;
    }

    saveBooks(books);
  }, [books, dbUserId]);

  const addBook = useCallback(
    (
      book: Omit<Book, "id" | "dateAdded" | "currentPage" | "rating" | "review" | "favoriteQuote" | "tags" | "diaryEntries">
    ) => {
      const newBook: Book = {
        ...book,
        id: crypto.randomUUID(),
        dateAdded: new Date().toISOString(),
        currentPage: 0,
        rating: 0,
        review: "",
        favoriteQuote: "",
        tags: [],
        diaryEntries: [],
      };

      setBooks((prev) => [newBook, ...prev]);

      if (supabase && dbUserId) {
        void supabase
          .from("books")
          .insert(mapBookToInsertRow(newBook, dbUserId))
          .then(({ error }) => {
            if (error) {
              console.error("Failed to insert book", error.message);
            }
          });
      }

      return newBook;
    },
    [dbUserId]
  );

  const updateBook = useCallback(
    (id: string, updates: Partial<Book>) => {
      let updatedBook: Book | null = null;

      setBooks((prev) =>
        prev.map((book) => {
          if (book.id !== id) {
            return book;
          }

          updatedBook = normalizeBook({ ...book, ...updates });
          return updatedBook;
        })
      );

      if (!supabase || !dbUserId || !updatedBook) {
        return;
      }

      const shouldReplaceDiaryEntries = Object.prototype.hasOwnProperty.call(updates, "diaryEntries");

      void supabase
        .from("books")
        .update(mapBookToUpdateRow(updatedBook))
        .eq("id", id)
        .eq("user_id", dbUserId)
        .then(async ({ error }) => {
          if (error) {
            console.error("Failed to update book", error.message);
            return;
          }

          if (!shouldReplaceDiaryEntries) {
            return;
          }

          try {
            await replaceDiaryEntriesInDatabase(dbUserId, id, updatedBook?.diaryEntries ?? []);
          } catch (diaryError) {
            console.error("Failed to sync diary entries", diaryError);
          }
        });
    },
    [dbUserId]
  );

  const deleteBook = useCallback(
    (id: string) => {
      setBooks((prev) => prev.filter((book) => book.id !== id));

      if (!supabase || !dbUserId) {
        return;
      }

      void supabase
        .from("books")
        .delete()
        .eq("id", id)
        .eq("user_id", dbUserId)
        .then(({ error }) => {
          if (error) {
            console.error("Failed to delete book", error.message);
          }
        });
    },
    [dbUserId]
  );

  const getBook = useCallback(
    (id: string) => {
      return books.find((book) => book.id === id);
    },
    [books]
  );

  const filterBooks = useCallback(
    (status: BookStatus | "all", search: string) => {
      return books.filter((book) => {
        const matchesStatus = status === "all" || book.status === status;
        const matchesSearch =
          !search ||
          book.title.toLowerCase().includes(search.toLowerCase()) ||
          book.author.toLowerCase().includes(search.toLowerCase());

        return matchesStatus && matchesSearch;
      });
    },
    [books]
  );

  return { books, addBook, updateBook, deleteBook, getBook, filterBooks };
}
