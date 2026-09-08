export interface PaginationResult<T> {
  currentPage: number;
  totalPages: number;
  pageItems: T[];
}

export function paginateArray<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
  const safePageSize = Math.max(1, pageSize || 1);
  const totalPages = Math.max(1, Math.ceil((items?.length ?? 0) / safePageSize));
  const currentPage = Math.min(Math.max(1, page || 1), totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    currentPage,
    totalPages,
    pageItems: (items ?? []).slice(start, start + safePageSize),
  };
}