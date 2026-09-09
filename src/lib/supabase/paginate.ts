/**
 * Utility for fetching all rows from a Supabase query builder across multiple pages,
 * bypassing the default PostgREST 1,000-row limit.
 */
export async function fetchAllSupabasePages<T = any>(
  queryBuilderFn: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await queryBuilderFn(from, to);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allRows.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}
