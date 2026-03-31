import type { RequestHandler } from "./$types";

// extracts markdown tables from a message and converts to CSV
function markdown_table_to_csv(markdown: string): string {
  const lines = markdown.split("\n");
  const csv_rows: string[] = [];

  let in_table = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      if (in_table) break; // end of table
      continue;
    }
    in_table = true;

    // skip separator rows (|---|---|)
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;

    const cells = trimmed
      .split("|")
      .filter((c) => c.trim() !== "")
      .map((c) => {
        const val = c.trim();
        // quote values containing commas
        return val.includes(",") ? `"${val}"` : val;
      });

    csv_rows.push(cells.join(","));
  }

  return csv_rows.join("\n");
}

export const POST: RequestHandler = async ({ request }) => {
  const { content } = await request.json();
  const csv = markdown_table_to_csv(content);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="ga4-export.csv"',
    },
  });
};
