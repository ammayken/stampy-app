export const STAMPS_PER_PAGE = 12;

/** Split stamps into logbook pages. There is always at least one (possibly empty) page. */
export function pagesOf<T>(items: T[], size = STAMPS_PER_PAGE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}
