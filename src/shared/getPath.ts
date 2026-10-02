/**
 * Reads a dot-notated path (e.g. "borrower.address.city") out of a plain
 * object. Returns undefined if any segment along the path is missing —
 * never throws, since rule fields are data-driven and may not exist on
 * every extracted object.
 */
export function getPath(source: Record<string, unknown>, path: string): unknown {
  const segments = path.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}
