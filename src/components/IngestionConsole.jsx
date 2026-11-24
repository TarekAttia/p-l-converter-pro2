import { ChevronDown, FileText, Sigma, Sparkles, Table } from "lucide-react";
import Dropzone from "@/components/Dropzone";

function SectionLabel({ index, title }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="font-mono text-[10px] font-medium text-primary">{index}</span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{title}</span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

export default function IngestionConsole({
  workbook,
  csv,
  sheetName,
  onSheetChange,
  onWorkbookFile,
  onCsvFile,
  onLoadDemo,
}) {
  const activeSheet = workbook?.sheets?.find((s) => s.name === sheetName) || workbook?.sheets?.[0];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline px-4 py-3.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Ingestion console
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
          Convert your Tableau P&amp;L to Power BI. Files are parsed in this browser tab and never leave it.
        </p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <SectionLabel index="01" title="Tableau workbook" />
          <Dropzone
            icon={FileText}
            accept=".twb,.twbx"
            title="Drop .twb or .twbx"
            hint="Workbook XML or packaged workbook"
            fileName={workbook?.fileName}
            meta={workbook ? `${workbook.sheetCount} sheet${workbook.sheetCount === 1 ? "" : "s"} · ${workbook.datasource}` : null}
            onFile={onWorkbookFile}
          />

          {workbook?.sheets?.length > 0 && (
            <div className="mt-2.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                P&amp;L sheet
              </label>
              <div className="relative mt-1">
                <select
                  value={sheetName}
                  onChange={(e) => onSheetChange(e.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-hairline bg-panel pl-2.5 pr-8 text-[12.5px] font-medium text-foreground focus:border-primary focus:outline-none"
                >
                  {workbook.sheets.map((sheet) => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              </div>
              {activeSheet && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {activeSheet.rows.map((f) => (
                    <span key={`r-${f}`} className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                      rows: {f}
                    </span>
                  ))}
                  {activeSheet.cols.map((f) => (
                    <span key={`c-${f}`} className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                      cols: {f}
                    </span>
                  ))}
                  <span className="rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">
                    mark: {activeSheet.mark}
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <SectionLabel index="02" title="P&L data source" />
          <Dropzone
            icon={Table}
            accept=".csv,text/csv"
            title="Drop the P&L .csv"
            hint="The same extract the workbook is reading"
            fileName={csv?.fileName}
            meta={csv ? `${csv.rowCount.toLocaleString("en-US")} rows · ${csv.columns.length} columns` : null}
            onFile={onCsvFile}
          />
          {csv?.columns?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {csv.columns.map((col) => (
                <span
                  key={col.name}
                  className={
                    col.kind === "measure"
                      ? "rounded-sm border border-primary/25 bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground"
                      : "rounded-sm border border-hairline bg-panel px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                  }
                >
                  {col.name}
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel index="03" title="Tableau calculations" />
          {workbook?.calculations?.length ? (
            <ul className="space-y-1">
              {workbook.calculations.map((calc) => (
                <li
                  key={calc.caption}
                  className="flex items-start gap-2 rounded-md border border-hairline bg-surface px-2 py-1.5"
                >
                  <Sigma className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="truncate text-[11.5px] font-semibold text-foreground">{calc.caption}</div>
                    <div className="truncate font-mono text-[10px] text-ink-muted" title={calc.formula}>
                      {calc.formula}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed border-hairline px-2.5 py-3 text-[11.5px] text-ink-muted">
              No calculated fields detected in this workbook.
            </p>
          )}
        </section>
      </div>

      <div className="border-t border-hairline px-4 py-3">
        <button
          onClick={onLoadDemo}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-hairline bg-panel px-3 py-2 text-[12px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Load the professional services sample
        </button>
      </div>
    </div>
  );
}