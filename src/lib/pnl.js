import { parseNumber, parsePeriod, profileColumns } from "@/lib/csv";

const TOTAL_PATTERN =
  /^(total|subtotal|grand total|net (income|revenue|sales|profit)|gross (profit|margin)|ebitda|ebit|operating (income|profit|expenses?)|contribution)/i;

const clampLevel = (value) => Math.max(0, Math.min(6, Math.round(Number(value) || 0)));

export function buildPnl({ headers, rows, workbook, sheetName }) {
  const profiles = profileColumns(headers, rows);
  const indexOf = new Map(headers.map((name, index) => [name, index]));
  const sheet = workbook?.sheets?.find((item) => item.name === sheetName) || workbook?.sheets?.[0] || null;

  const matchColumn = (caption) =>
    profiles.find((profile) => profile.name.toLowerCase() === String(caption || "").toLowerCase());

  const hintRow = (sheet?.rows || []).map(matchColumn).find((profile) => profile && profile.kind === "dimension") || null;
  const hintCol = (sheet?.cols || []).map(matchColumn).find((profile) => profile && profile.kind === "dimension") || null;
  const hintMeasure =
    (workbook?.columns || [])
      .filter((column) => column.role === "measure")
      .map((column) => matchColumn(column.caption))
      .find((profile) => profile && profile.kind === "measure") || null;

  const dimensions = profiles.filter((profile) => profile.kind === "dimension");
  const measures = profiles.filter((profile) => profile.kind === "measure");

  let rowDim = hintRow;
  if (!rowDim) {
    rowDim = dimensions.find((profile) =>
      /account|line|gl|category|item|description|label|name/i.test(profile.name)
    );
  }
  if (!rowDim) rowDim = [...dimensions].sort((a, b) => b.distinct - a.distinct)[0];
  if (!rowDim) throw new Error("No text column was found to use as the P&L line items.");

  let colDim = hintCol && hintCol.name !== rowDim.name ? hintCol : null;
  if (!colDim) {
    colDim = dimensions.find(
      (profile) =>
        profile.name !== rowDim.name &&
        profile.periodRatio >= 0.8 &&
        profile.distinct >= 2 &&
        profile.distinct <= 40
    );
  }
  if (!colDim) {
    colDim = dimensions.find(
      (profile) =>
        profile.name !== rowDim.name &&
        /period|month|quarter|year|date|week/i.test(profile.name) &&
        profile.distinct >= 2 &&
        profile.distinct <= 40
    );
  }

  let measure = hintMeasure;
  if (!measure) {
    measure = measures.find((profile) =>
      /amount|value|total|net|actual|billed|amt|usd|revenue|cost/i.test(profile.name)
    );
  }
  if (!measure) measure = measures[0];

  const wide = !colDim;
  if (wide && measures.length === 0) {
    throw new Error("No numeric column was found to use as the P&L values.");
  }
  if (!wide && !measure) {
    throw new Error("No numeric column was found to use as the P&L values.");
  }

  const levelDim = dimensions.find((profile) => /^(level|depth|indent|hierarchy level)$/i.test(profile.name));
  const warnings = [];
  if (!workbook) warnings.push("No workbook loaded — the layout was inferred from the CSV alone.");
  if (wide) warnings.push("The CSV is already a cross-tab, so its numeric columns became the periods.");

  const rowIdx = indexOf.get(rowDim.name);
  const levelIdx = levelDim ? indexOf.get(levelDim.name) : -1;
  const outRows = [];
  const seen = new Set();
  let periodLabels = [];

  const levelFor = (record, rawLabel) => {
    if (levelIdx >= 0) {
      const parsed = parseNumber(record[levelIdx]);
      if (parsed != null) return clampLevel(parsed);
    }
    return Math.min(3, Math.floor((rawLabel.length - rawLabel.trimStart().length) / 2));
  };

  const makeRow = (label, level) => {
    let finalLabel = label;
    let counter = 2;
    while (seen.has(finalLabel)) {
      finalLabel = `${label} (${counter})`;
      counter += 1;
    }
    seen.add(finalLabel);
    const row = {
      id: finalLabel,
      label: finalLabel,
      level,
      isTotal: TOTAL_PATTERN.test(label),
      values: [],
      total: 0,
    };
    outRows.push(row);
    return row;
  };

  if (wide) {
    periodLabels = measures.map((profile) => profile.name);
    for (const record of rows) {
      const rawLabel = String(record[rowIdx] ?? "");
      const label = rawLabel.trim();
      if (!label) continue;
      const row = makeRow(label, levelFor(record, rawLabel));
      row.values = measures.map((profile) => parseNumber(record[profile.index]));
      row.total = row.values.reduce((acc, value) => acc + (value ?? 0), 0);
    }
  } else {
    const colIdx = indexOf.get(colDim.name);
    const measureIdx = indexOf.get(measure.name);
    const rowByLabel = new Map();
    const periodSeen = new Set();

    for (const record of rows) {
      const rawLabel = String(record[rowIdx] ?? "");
      const label = rawLabel.trim();
      if (!label) continue;
      const periodLabel = String(record[colIdx] ?? "").trim();
      if (!periodLabel) continue;
      const value = parseNumber(record[measureIdx]);
      if (value == null) continue;

      let row = rowByLabel.get(label);
      if (!row) {
        row = makeRow(label, levelFor(record, rawLabel));
        rowByLabel.set(label, row);
        row.byPeriod = new Map();
      }
      row.byPeriod.set(periodLabel, (row.byPeriod.get(periodLabel) || 0) + value);
      periodSeen.add(periodLabel);
    }

    const parsed = [...periodSeen].map((label) => ({ label, parsed: parsePeriod(label) }));
    const allParsed = parsed.every((item) => item.parsed);
    parsed.sort((a, b) => {
      if (allParsed) return a.parsed.sort - b.parsed.sort;
      return a.label.localeCompare(b.label, "en", { numeric: true });
    });
    periodLabels = parsed.map((item) => item.label);

    for (const row of outRows) {
      row.values = periodLabels.map((label) =>
        row.byPeriod && row.byPeriod.has(label) ? row.byPeriod.get(label) : null
      );
      row.total = row.values.reduce((acc, value) => acc + (value ?? 0), 0);
      delete row.byPeriod;
    }
  }

  if (!outRows.length) {
    throw new Error("No P&L lines could be read from that CSV.");
  }

  const parsedPeriods = periodLabels.map((label) => ({ label, parsed: parsePeriod(label) }));
  const grains = new Set(parsedPeriods.map((item) => item.parsed?.grain).filter(Boolean));
  const grain = grains.size === 1 ? [...grains][0] : null;
  const lag = grain === "quarter" ? 4 : grain === "month" ? 12 : grain === "year" ? 1 : null;

  const periodInfo = parsedPeriods.map((item, index) => {
    let year = null;
    let bucket = null;
    const info = item.parsed;
    if (info) {
      if (info.grain === "quarter") {
        year = Math.floor(info.sort / 10);
        bucket = info.sort % 10;
      } else if (info.grain === "month") {
        year = Math.floor(info.sort / 100);
        bucket = info.sort % 100;
      } else if (info.grain === "year") {
        year = info.sort;
      } else if (info.grain === "date") {
        const date = new Date(info.sort);
        year = date.getUTCFullYear();
        bucket = date.getUTCMonth() + 1;
      }
    }
    return { label: item.label, sort: info?.sort ?? index + 1, year, bucket, grain: info?.grain ?? null };
  });

  const checks = [];
  for (let i = 0; i < outRows.length; i += 1) {
    const row = outRows[i];
    if (!/^(total|subtotal|grand total)/i.test(row.label)) continue;
    const children = [];
    for (let j = i + 1; j < outRows.length; j += 1) {
      if (outRows[j].level <= row.level) break;
      children.push(outRows[j]);
    }
    if (!children.length) continue;

    let mismatches = 0;
    let worst = 0;
    periodLabels.forEach((period, p) => {
      const actual = row.values[p];
      if (actual == null) return;
      const expected = children.reduce((acc, child) => acc + (child.values[p] ?? 0), 0);
      const diff = actual - expected;
      if (Math.abs(diff) > Math.max(1, Math.abs(actual) * 0.001)) {
        mismatches += 1;
        worst = Math.max(worst, Math.abs(diff));
      }
    });
    if (mismatches) {
      checks.push({ row: row.label, periods: mismatches, worst });
    }
  }

  return {
    shape: wide ? "wide" : "long",
    rowDim: rowDim.name,
    colDim: wide ? null : colDim.name,
    measure: wide ? "Measure columns" : measure.name,
    levelDim: levelDim?.name ?? null,
    sourceSheet: sheet?.name ?? null,
    periods: periodLabels,
    periodInfo,
    grain,
    lag,
    hasDate: grain === "date",
    rows: outRows,
    checks,
    warnings,
  };
}