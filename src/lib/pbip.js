const PBIP_SCHEMA = "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json";
const PLATFORM_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json";
const MODEL_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json";
const REPORT_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/1.0.0/schema.json";
const REPORT_DEFINITION_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/1.0.0/schema.json";
const PAGES_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json";
const PAGE_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/1.0.0/schema.json";
const VISUAL_SCHEMA =
  "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/1.0.0/schema.json";

function fnv(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hex(value, length) {
  return value.toString(16).padStart(length, "0").slice(-length);
}

function guid(seed) {
  return [
    hex(fnv(`${seed}|1`), 8),
    hex(fnv(`${seed}|2`), 4),
    `4${hex(fnv(`${seed}|3`), 3)}`,
    `a${hex(fnv(`${seed}|4`), 3)}`,
    `${hex(fnv(`${seed}|5`), 8)}${hex(fnv(`${seed}|6`), 4)}`,
  ].join("-");
}

function mString(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function mTable(columns, rows) {
  const lines = ["let", "    Source = Table.FromRows(", "        {"];
  rows.forEach((row, index) => {
    const cells = row.map((cell) => (typeof cell === "number" ? String(cell) : mString(cell)));
    lines.push(`            {${cells.join(", ")}}${index === rows.length - 1 ? "" : ","}`);
  });
  lines.push("        },");
  lines.push(`        {${columns.map((column) => mString(column.name)).join(", ")}}`);
  lines.push("    ),");
  lines.push(
    `    #"Changed Type" = Table.TransformColumnTypes(Source, {${columns
      .map((column) => `{${mString(column.name)}, ${column.mType}}`)
      .join(", ")}})`
  );
  lines.push("in");
  lines.push('    #"Changed Type"');
  return lines;
}

function tmslTable(name, columns, rows, options = {}) {
  return {
    name,
    lineageTag: guid(`table:${name}`),
    columns: columns.map((column) => {
      const entry = {
        name: column.name,
        dataType: column.dataType,
        sourceColumn: column.name,
        lineageTag: guid(`column:${name}:${column.name}`),
        summarizeBy: column.dataType === "double" ? "sum" : "none",
      };
      if (column.sortBy) entry.sortByColumn = column.sortBy;
      if (column.formatString) entry.formatString = column.formatString;
      return entry;
    }),
    partitions: [
      {
        name,
        mode: "import",
        source: { type: "m", expression: mTable(columns, rows) },
      },
    ],
    ...options,
  };
}

const columnField = (entity, property) => ({
  field: { Column: { Expression: { SourceRef: { Entity: entity } }, Property: property } },
  queryRef: `${entity}.${property}`,
  nativeQueryRef: property,
});

const measureField = (entity, property) => ({
  field: { Measure: { Expression: { SourceRef: { Entity: entity } }, Property: property } },
  queryRef: `${entity}.${property}`,
  nativeQueryRef: property,
});

const titleObject = (text) => [
  { properties: { text: { expr: { Literal: { Value: `'${String(text).replace(/'/g, "''")}'` } } } } },
];

function slicerVisual({ name, entity, property, title, x, y, z }) {
  return {
    $schema: VISUAL_SCHEMA,
    name,
    position: { x, y, z, width: 240, height: 56, tabOrder: z },
    visual: {
      visualType: "slicer",
      query: { queryState: { Values: { projections: [columnField(entity, property)] } } },
      objects: { data: [{ properties: { mode: { expr: { Literal: { Value: "'Dropdown'" } } } } }] },
      visualContainerObjects: { title: titleObject(title) },
    },
  };
}

function matrixVisual(title) {
  return {
    $schema: VISUAL_SCHEMA,
    name: "pnlMatrix",
    position: { x: 16, y: 88, z: 3, width: 1248, height: 600, tabOrder: 3 },
    visual: {
      visualType: "pivotTable",
      query: {
        queryState: {
          Rows: { projections: [columnField("Dim Account", "Account")] },
          Columns: { projections: [columnField("Dim Period", "Period")] },
          Values: { projections: [measureField("Measures", "Total Amount")] },
        },
      },
      objects: { rowHeaders: [{ properties: { stepped: { expr: { Literal: { Value: "true" } } } } }] },
      visualContainerObjects: { title: titleObject(title) },
    },
  };
}

function sanitizeProjectName(fileName) {
  const base = String(fileName || "PnL Bridge")
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim();
  return base || "PnL Bridge";
}

export function buildPowerBiProject({ pnl, measures, csvText, csvName, workbook, sheetName }) {
  const projectName = sanitizeProjectName(workbook?.fileName || "PnL Bridge");
  const pageTitle = pnl.sourceSheet || sheetName || "P&L Statement";

  const factRows = [];
  for (const row of pnl.rows) {
    pnl.periods.forEach((period, index) => {
      const value = row.values[index];
      if (value == null) return;
      factRows.push([row.label, period, Math.round(value * 100) / 100]);
    });
  }
  const factData = factRows.slice(0, 5000);

  const factColumns = [
    { name: "Account", dataType: "string", mType: "type text" },
    { name: "Period", dataType: "string", mType: "type text" },
    { name: "Amount", dataType: "double", mType: "type number", formatString: "#,0.00" },
  ];

  const accountColumns = [
    { name: "Account", dataType: "string", mType: "type text", sortBy: "Sort Order" },
    { name: "Sort Order", dataType: "int64", mType: "Int64.Type" },
    { name: "Level", dataType: "int64", mType: "Int64.Type" },
    { name: "Is Total", dataType: "boolean", mType: "type logical" },
  ];
  const accountData = pnl.rows.map((row, index) => [row.label, index + 1, row.level, row.isTotal]);

  const periodColumns = [
    { name: "Period", dataType: "string", mType: "type text", sortBy: "Sort Order" },
    { name: "Sort Order", dataType: "int64", mType: "Int64.Type" },
    { name: "Year", dataType: "int64", mType: "Int64.Type" },
    { name: "Period Number", dataType: "int64", mType: "Int64.Type" },
  ];
  const periodData = pnl.periodInfo.map((info) => [
    info.label,
    Math.round(info.sort),
    info.year ?? 0,
    info.bucket ?? 0,
  ]);

  const measureTable = {
    name: "Measures",
    lineageTag: guid("table:Measures"),
    columns: [
      {
        name: "Value",
        dataType: "int64",
        sourceColumn: "[Value]",
        lineageTag: guid("column:Measures:Value"),
        summarizeBy: "sum",
      },
    ],
    partitions: [
      {
        name: "Measures",
        mode: "import",
        source: { type: "calculated", expression: 'ROW("Value", 0)' },
      },
    ],
    measures: measures.map((measure) => ({
      name: measure.name,
      expression: measure.expression,
      formatString: measure.formatString,
      lineageTag: guid(`measure:${measure.name}`),
    })),
  };

  const relationships = [
    {
      name: guid("rel:account"),
      fromTable: "Fact P&L",
      fromColumn: "Account",
      toTable: "Dim Account",
      toColumn: "Account",
      fromCardinality: "many",
      toCardinality: "one",
    },
    {
      name: guid("rel:period"),
      fromTable: "Fact P&L",
      fromColumn: "Period",
      toTable: "Dim Period",
      toColumn: "Period",
      fromCardinality: "many",
      toCardinality: "one",
    },
  ];

  const modelBim = {
    name: projectName,
    compatibilityLevel: 1567,
    model: {
      culture: "en-US",
      defaultPowerBIDataSourceVersion: "powerBI_V3",
      sourceQueryCulture: "en-US",
      tables: [
        tmslTable("Fact P&L", factColumns, factData),
        tmslTable("Dim Account", accountColumns, accountData),
        tmslTable("Dim Period", periodColumns, periodData),
        measureTable,
      ],
      relationships,
    },
  };

  const reportFolder = `${projectName}.Report`;
  const modelFolder = `${projectName}.SemanticModel`;
  const pageFolder = "pnl";

  const readme = [
    `# ${projectName}`,
    "",
    "Power BI project generated by P&L Bridge from a Tableau P&L.",
    "",
    "## Open it",
    "",
    "1. In Power BI Desktop go to File > Options > Preview features and enable **Power BI Project (.pbip) save option**.",
    "2. Unzip this folder, then open the `.pbip` file.",
    `3. The report opens on the **${pageTitle}** page with the P&L matrix and the ${pnl.periods.length} period slicers.`,
    "",
    "## What is inside",
    "",
    `- Semantic model: Fact P&L, Dim Account (${pnl.rows.length} lines), Dim Period (${pnl.periods.length} periods) and ${measures.length} DAX measures.`,
    "- Report: a matrix on Account x Period with Total Amount, plus dropdown slicers for period and account line.",
    `- Data: the ${factData.length} aggregated P&L values are embedded in the model so it opens without a connection. The source extract is in Data/ for reference.`,
    "",
    "## Point it at your warehouse",
    "",
    "In Power Query, replace the `Table.FromRows` step of **Fact P&L** with your own source, for example:",
    "",
    "```m",
    'let',
    '    Source = Csv.Document(File.Contents("C:\\finance\\pnl_export.csv"), [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),',
    '    Promoted = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),',
    '    Typed = Table.TransformColumnTypes(Promoted, {{"Period", type text}, {"Account", type text}, {"Amount", type number}})',
    "in",
    "    Typed",
    "```",
    "",
    "Keep the Account and Period keys aligned with Dim Account and Dim Period so the relationships stay intact.",
    "",
  ].join("\n");

  const files = [
    {
      path: `${projectName}.pbip`,
      content: JSON.stringify(
        {
          $schema: PBIP_SCHEMA,
          version: "1.0",
          artifacts: [{ report: { path: reportFolder } }],
          settings: { enableAutoRecovery: true },
        },
        null,
        2
      ),
    },
    {
      path: `${modelFolder}/.platform`,
      content: JSON.stringify(
        {
          $schema: PLATFORM_SCHEMA,
          metadata: { type: "SemanticModel", displayName: projectName },
          config: { version: "2.0", logicalId: guid("platform:model") },
        },
        null,
        2
      ),
    },
    {
      path: `${modelFolder}/definition.pbism`,
      content: JSON.stringify({ $schema: MODEL_SCHEMA, version: "1.0", settings: {} }, null, 2),
    },
    { path: `${modelFolder}/model.bim`, content: JSON.stringify(modelBim, null, 2) },
    {
      path: `${reportFolder}/.platform`,
      content: JSON.stringify(
        {
          $schema: PLATFORM_SCHEMA,
          metadata: { type: "Report", displayName: projectName },
          config: { version: "2.0", logicalId: guid("platform:report") },
        },
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition.pbir`,
      content: JSON.stringify(
        {
          $schema: REPORT_SCHEMA,
          version: "4.0",
          datasetReference: { byPath: { path: `../${modelFolder}` } },
        },
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/report.json`,
      content: JSON.stringify(
        {
          $schema: REPORT_DEFINITION_SCHEMA,
          themeCollection: { baseTheme: { name: "CY24SU06" } },
          reportId: guid("report:id"),
        },
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/pages/pages.json`,
      content: JSON.stringify(
        { $schema: PAGES_SCHEMA, pageOrder: [pageFolder], activePageName: pageFolder },
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/pages/${pageFolder}/page.json`,
      content: JSON.stringify(
        {
          $schema: PAGE_SCHEMA,
          name: pageFolder,
          displayName: pageTitle,
          displayOption: "FitToPage",
          height: 720,
          width: 1280,
        },
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/pages/${pageFolder}/visuals/slicer-period/visual.json`,
      content: JSON.stringify(
        slicerVisual({
          name: "slicerPeriod",
          entity: "Dim Period",
          property: "Period",
          title: "Period",
          x: 16,
          y: 16,
          z: 0,
        }),
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/pages/${pageFolder}/visuals/slicer-account/visual.json`,
      content: JSON.stringify(
        slicerVisual({
          name: "slicerAccount",
          entity: "Dim Account",
          property: "Account",
          title: "Account line",
          x: 268,
          y: 16,
          z: 1,
        }),
        null,
        2
      ),
    },
    {
      path: `${reportFolder}/definition/pages/${pageFolder}/visuals/pnl-matrix/visual.json`,
      content: JSON.stringify(matrixVisual(pageTitle), null, 2),
    },
    { path: `Data/${csvName || "pnl.csv"}`, content: csvText },
    { path: "README.md", content: readme },
  ];

  return {
    projectName,
    files,
    model: {
      tables: [
        { name: "Fact P&L", kind: "fact", columns: factColumns.length },
        { name: "Dim Account", kind: "dimension", columns: accountColumns.length },
        { name: "Dim Period", kind: "dimension", columns: periodColumns.length },
        { name: "Measures", kind: "measures", columns: 1, measures: measures.length },
      ],
      relationships: [
        { from: "Fact P&L[Account]", to: "Dim Account[Account]" },
        { from: "Fact P&L[Period]", to: "Dim Period[Period]" },
      ],
    },
  };
}