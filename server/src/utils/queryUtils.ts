import { Response } from "express";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const toDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateValue = (value: unknown) => {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : value;
};

export type Period = {
  from: string | null;
  to: string | null;
  label: string;
};

export const resolvePeriod = (query: Record<string, any>): Period => {
  const period = typeof query.period === "string" ? query.period : "all";
  const now = new Date();

  if (period === "today") {
    const today = toDateString(now);
    return { from: today, to: today, label: `Today (${today})` };
  }

  if (period === "week") {
    const start = new Date(now);
    const weekday = start.getDay() === 0 ? 7 : start.getDay();
    start.setDate(start.getDate() - weekday + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      from: toDateString(start),
      to: toDateString(end),
      label: `This Week (${toDateString(start)} to ${toDateString(end)})`,
    };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: toDateString(start),
      to: toDateString(end),
      label: `This Month (${toDateString(start)} to ${toDateString(end)})`,
    };
  }

  const from = parseDateValue(query.date_from);
  const to = parseDateValue(query.date_to);

  if (from || to) {
    const label =
      from && to
        ? `Custom Range (${from} to ${to})`
        : from
          ? `From ${from}`
          : `Up to ${to}`;
    return { from, to, label };
  }

  return { from: null, to: null, label: "All Dates" };
};

export const buildDateClause = (
  column: string,
  period: Period,
  params: any[],
) => {
  if (!period.from && !period.to) return "";
  if (period.from && period.to) {
    params.push(period.from, period.to);
    return ` AND DATE(${column}) BETWEEN ? AND ?`;
  }
  if (period.from) {
    params.push(period.from);
    return ` AND DATE(${column}) >= ?`;
  }
  params.push(period.to);
  return ` AND DATE(${column}) <= ?`;
};

export const parsePositiveInt = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

export const parseSort = (
  value: unknown,
  allowed: readonly string[],
  fallbackKey: string,
  fallbackDir: "asc" | "desc" = "asc",
) => {
  const raw = typeof value === "string" ? value : "";
  const [keyPart, dirPart] = raw.split(":");
  const key = allowed.includes(keyPart) ? keyPart : fallbackKey;
  const dir = dirPart?.toLowerCase() === "desc" ? "desc" : dirPart?.toLowerCase() === "asc" ? "asc" : fallbackDir;
  return { key, dir };
};

export const parseList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const escapeCsv = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const escapeHtml = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

export const sendTabularExport = (
  res: Response,
  filename: string,
  headers: string[],
  rows: unknown[][],
  format: "csv" | "xls" = "csv",
) => {
  if (format === "xls") {
    const table = [
      `<table><thead><tr>${headers
        .map((header) => `<th>${escapeHtml(header)}</th>`)
        .join("")}</tr></thead><tbody>`,
      ...rows.map(
        (row) =>
          `<tr>${row
            .map((value) => `<td>${escapeHtml(value)}</td>`)
            .join("")}</tr>`,
      ),
      "</tbody></table>",
    ].join("");
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(filename)}</title></head><body>${table}</body></html>`;
    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}.xls"`,
    );
    return res.send(html);
  }

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.csv"`,
  );
  return res.send(`\uFEFF${csv}`);
};

export const parseExportFormat = (value: unknown): "csv" | "xls" =>
  String(value ?? "").toLowerCase() === "xls" ? "xls" : "csv";

export const toFileToken = (value: string) =>
  value
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
