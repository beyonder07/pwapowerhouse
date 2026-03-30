export type ListQuery = {
  query: string;
  page: number;
  pageSize: number;
};

export function parseListQuery(request: Request, defaultPageSize = 10): ListQuery {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1) || 1);
  const requestedPageSize = Number(searchParams.get('pageSize') || defaultPageSize) || defaultPageSize;
  const pageSize = Math.max(1, Math.min(requestedPageSize, 50));

  return { query, page, pageSize };
}

export function filterAndPaginate<T>(
  items: T[],
  params: ListQuery,
  predicate: (item: T, normalizedQuery: string) => boolean
) {
  const normalized = params.query.trim().toLowerCase();
  const filteredItems = normalized ? items.filter((item) => predicate(item, normalized)) : items;
  const totalCount = items.length;
  const filteredCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / params.pageSize));
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.pageSize;

  return {
    items: filteredItems.slice(start, start + params.pageSize),
    totalCount,
    filteredCount,
    page,
    pageSize: params.pageSize,
    totalPages
  };
}
