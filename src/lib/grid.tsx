'use client';

import { useMemo, useState } from 'react';

export function useGridQuery<T>({
  items,
  pageSize,
  predicate
}: {
  items: T[];
  pageSize: number;
  predicate: (item: T, query: string) => boolean;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return items;
    }

    return items.filter((item) => predicate(item, normalized));
  }, [items, predicate, query]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const effectivePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [effectivePage, filteredItems, pageSize]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const handlePageChange = (next: number) => {
    setPage(Math.max(1, Math.min(next, totalPages)));
  };

  return {
    query,
    setQuery: handleQueryChange,
    page: effectivePage,
    setPage: handlePageChange,
    totalPages,
    totalItems: items.length,
    filteredCount: filteredItems.length,
    pageItems
  };
}
