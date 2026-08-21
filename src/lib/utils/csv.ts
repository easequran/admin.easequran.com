function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  // Neutralize CSV formula injection: a cell starting with =, +, -, or @
  // is interpreted as a formula by Excel/Sheets when opened, and these
  // fields (lead name/notes/email, etc.) come from public-facing forms --
  // prefixing with a leading apostrophe forces it to render as plain text.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV string from row objects and triggers a browser download. */
export function downloadCsv<T extends object>(filename: string, columns: { key: keyof T & string; label: string }[], rows: T[]) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  const csv = [header, ...lines].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
