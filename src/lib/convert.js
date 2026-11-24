import { parseCsv, profileColumns } from "@/lib/csv";
import { buildPnl } from "@/lib/pnl";
import { buildMeasures } from "@/lib/dax";
import { buildPowerBiProject } from "@/lib/pbip";
import { parseTableauWorkbook } from "@/lib/tableau";
import { readPackagedWorkbook } from "@/lib/unzip";

export function buildConversion({ workbook, csvText, csvName, sheetName }) {
  const { headers, rows } = parseCsv(csvText);
  const pnl = buildPnl({ headers, rows, workbook, sheetName });
  const measures = buildMeasures(pnl);
  const project = buildPowerBiProject({ pnl, measures, csvText, csvName, workbook, sheetName });
  const profiles = profileColumns(headers, rows);

  return {
    workbook,
    csv: {
      fileName: csvName || "pnl.csv",
      rowCount: rows.length,
      columns: profiles.map((profile) => ({ name: profile.name, kind: profile.kind })),
    },
    pnl,
    dax: measures,
    model: project.model,
    files: project.files.map((file) => file.path),
    package: project.files,
    projectName: project.projectName,
  };
}

export async function readWorkbookFile(file) {
  const name = String(file.name || "workbook.twb");
  if (/\.twbx$/i.test(name)) {
    const buffer = await file.arrayBuffer();
    const xml = await readPackagedWorkbook(buffer);
    return parseTableauWorkbook(xml, name);
  }
  const text = await file.text();
  return parseTableauWorkbook(text, name);
}