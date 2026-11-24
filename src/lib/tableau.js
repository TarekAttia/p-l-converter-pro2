function cleanName(value) {
  return String(value || "").replace(/^\[|\]$/g, "").trim();
}

function childColumns(datasource) {
  if (!datasource) return [];
  return [...datasource.children].filter((node) => node.tagName === "column");
}

export function parseTableauWorkbook(xml, fileName) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("That workbook is not valid Tableau XML.");
  }

  const datasources = [...doc.querySelectorAll("datasources > datasource")];
  if (!datasources.length) {
    throw new Error("No datasource was found in that Tableau workbook.");
  }
  const datasource = datasources.sort((a, b) => childColumns(b).length - childColumns(a).length)[0];

  const columns = childColumns(datasource).map((node) => ({
    caption: node.getAttribute("caption") || cleanName(node.getAttribute("name")),
    name: cleanName(node.getAttribute("name")),
    role: node.getAttribute("role") || "dimension",
    datatype: node.getAttribute("datatype") || "string",
    formula: node.querySelector("calculation")?.getAttribute("formula") || null,
  }));

  const byKey = new Map();
  columns.forEach((column) => {
    byKey.set(column.name.toLowerCase(), column);
    byKey.set(column.caption.toLowerCase(), column);
  });

  const resolve = (token) => byKey.get(String(token).toLowerCase());

  const fieldNames = (text) => {
    const found = [];
    const push = (token) => {
      const column = resolve(token);
      const label = column ? column.caption : token;
      if (label && !found.includes(label)) found.push(label);
    };
    for (const match of String(text).matchAll(/\[([^\]]+)\]/g)) {
      const token = match[1];
      const prefixed = /^(?:none|sum|avg|min|max|attr|usr|yr|qr|mn|dy):(.+?)(?::(?:nk|qk|ok|fk))?$/.exec(token);
      if (prefixed) push(prefixed[1]);
      else if (byKey.has(token.toLowerCase())) push(token);
    }
    return found;
  };

  const sheets = [...doc.querySelectorAll("worksheets > worksheet")].map((node) => {
    const rowsText = node.querySelector("table > rows")?.textContent || "";
    const colsText = node.querySelector("table > cols")?.textContent || "";
    const filters = [...node.querySelectorAll("table > view > filter")]
      .map((filter) => {
        const raw = filter.getAttribute("column") || "";
        const match = /^(?:none|sum|avg|min|max|attr):(.+?)(?::(?:nk|qk|ok|fk))?$/.exec(
          String(raw).replace(/^\[[^\]]+\]\./, "").replace(/^\[|\]$/g, "")
        );
        const field = match ? (resolve(match[1])?.caption ?? match[1]) : "";
        const members = [...filter.querySelectorAll("groupfilter")]
          .map((group) => String(group.getAttribute("member") || "").replace(/^"|"$/g, ""))
          .filter(Boolean);
        return { field, members };
      })
      .filter((filter) => filter.field);

    return {
      name: node.getAttribute("name") || "Sheet",
      mark: node.querySelector("panes pane mark")?.getAttribute("class") || "Automatic",
      rows: fieldNames(rowsText),
      cols: fieldNames(colsText),
      filters,
    };
  });

  return {
    fileName: fileName || "workbook.twb",
    datasource: datasource.getAttribute("caption") || cleanName(datasource.getAttribute("name")) || "Datasource",
    sheetCount: sheets.length,
    sheets,
    calculations: columns
      .filter((column) => column.formula)
      .map((column) => ({ caption: column.caption, role: column.role, formula: column.formula })),
    columns,
  };
}

export function pickPnlSheet(workbook) {
  if (!workbook?.sheets?.length) return "";
  const scored = workbook.sheets.map((sheet) => {
    let score = 0;
    if (/p\s*&?\s*l|profit|loss|income|statement|financial|margin/i.test(sheet.name)) score += 5;
    if (/text/i.test(sheet.mark)) score += 3;
    if (sheet.rows.length && sheet.cols.length) score += 2;
    score += Math.min(sheet.rows.length, 2);
    return { sheet, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].sheet.name;
}