import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List filters kept in the query string, so a filtered list can be refreshed, bookmarked
 * and shared. Changing any filter resets the page to 1.
 *
 * @param {string[]} keys - filter names read from the URL
 * @returns {{ filters: Record<string,string>, page: number, setFilters: Function, setPage: Function }}
 */
export function useListParams(keys) {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(keys.map((key) => [key, params.get(key) || '']));
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

  const setFilters = useCallback(
    (changes) => {
      const next = new URLSearchParams(params);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined || value === false) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  const setPage = useCallback(
    (value) => {
      const next = new URLSearchParams(params);
      if (value > 1) next.set('page', String(value));
      else next.delete('page');
      setParams(next);
    },
    [params, setParams]
  );

  return { filters, page, setFilters, setPage };
}
