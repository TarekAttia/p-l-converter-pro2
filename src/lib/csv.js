const DELIMITERS = [",", ";", "\t"];

function detectDelimiter(firstLine) {
  let best = ",";
  let bestCount = -1;
  for (const delimiter of DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }
  return best;
}

export function parseCsv(text) {
  const clean = String(text).replace(/^\uFEFF/, "");
  const firstBreak = clean.search(/\r?\n/);
  const firstLine = firstBreak >= 0 ? clean.slice(0, firstBreak) : clean;
  const delimiter = detectDelimiter(firstLine);

  const raw = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      raw.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    raw.push(row);
  }

  const cleaned = raw.filter((cells) => cells.some((cell) => String(cell).trim() !== ""));
  if (cleaned.length < 2) {
    throw new Error("That CSV needs a header row and at least one data row.");
  }

  const headers = cleaned[0].map((header, index) => String(header).trim() || `Column ${index + 1}`);
  const rows = cleaned.slice(1).map((cells) => headers.map((_, index) => cells[index] ?? ""));
  return { headers, rows };
}

export function parseNumber(value) {
  if (value == null) return null;
  let text = String(value).trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  text = text.replace(/[$€£¥\s,'’]/g, "").replace(/\u2212/g, "-");
  if (text.endsWith("%")) text = text.slice(0, -1);
  if (!text || !/^[-+]?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return negative ? -Math.abs(number) : number;
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function parsePeriod(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const quarterFirst = /^q([1-4])[\s\-/]?(\d{2,4})$/i.exec(text);
  if (quarterFirst) {
    const year = normalizeYear(Number(quarterFirst[2]));
    return { sort: year * 10 + Number(quarterFirst[1]), grain: "quarter" };
  }
  const yearFirst = /^(\d{4})[\s\-/]?q([1-4])$/i.exec(text);
  if (yearFirst) {
    return { sort: Number(yearFirst[1]) * 10 + Number(yearFirst[2]), grain: "quarter" };
  }
  const monthName = /^([A-Za-z]{3,9})[\s\-/]*(\d{2,4})$/.exec(text);
  if (monthName) {
    const month = MONTHS[monthName[1].slice(0, 3).toLowerCase()];
    if (month) {
      return { sort: normalizeYear(Number(monthName[2])) * 100 + month, grain: "month" };
    }
  }
  const yearMonth = /^(\d{4})[-/](\d{1,2})$/.exec(text);
  if (yearMonth) {
    return { sort: Number(yearMonth[1]) * 100 + Number(yearMonth[2]), grain: "month" };
  }
  const yearOnly = /^(19|20)\d{2}$/.exec(text);
  if (yearOnly) {
    return { sort: Number(text), grain: "year" };
  }
  const iso = /^\d{4}-\d{1,2}-\d{1,2}/.test(text);
  if (iso) {
    const time = Date.parse(text);
    if (!Number.isNaN(time)) return { sort: time, grain: "date" };
  }
  return null;
}

function normalizeYear(year) {
  if (year >= 100) return year;
  return 2000 + year;
}

const DIMENSION_LIKE = /(^|_)(level|depth|order|sort|rank|id|year|quarter|month|period)($|_)/i;

export function profileColumns(headers, rows) {
  return headers.map((name, index) => {
    const values = [];
    const limit = Math.min(rows.length, 400);
    for (let i = 0; i < limit; i += 1) {
      const cell = rows[i][index];
      if (cell != null && String(cell).trim() !== "") values.push(String(cell).trim());
    }
    const numeric = values.filter((value) => parseNumber(value) != null).length;
    const periods = values.filter((value) => parsePeriod(value) != null).length;
    const distinct = new Set(values).size;
    const numericRatio = values.length ? numeric / values.length : 0;
    const periodRatio = values.length ? periods / values.length : 0;
    const smallInteger = numericRatio >= 0.9 && distinct <= 12;
    const isDimension = numericRatio < 0.8 || (smallInteger && DIMENSION_LIKE.test(name));
    return {
      name,
      index,
      distinct,
      numericRatio,
      periodRatio,
      kind: isDimension ? "dimension" : "measure",
    };
  });
}