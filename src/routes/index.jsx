import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";
import IngestionConsole from "@/components/IngestionConsole";
import PnLMatrix from "@/components/PnLMatrix";
import SlicerBar from "@/components/SlicerBar";
import CodeDrawer from "@/components/CodeDrawer";
import { buildConversion, readWorkbookFile } from "@/lib/convert";
import { pickPnlSheet, parseTableauWorkbook } from "@/lib/tableau";
import { SAMPLE_CSV, SAMPLE_CSV_NAME, SAMPLE_TWB, SAMPLE_WORKBOOK_NAME } from "@/lib/sample";
import { createZip } from "@/lib/zip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "P&L Bridge — Tableau to Power BI" },
      {
        name: "description",
        content:
          "Convert your Tableau P&L to Power BI: a 1:1 table render plus a downloadable project with the semantic model, DAX measures and slicers.",
      },
    ],
  }),
  component: Workspace,
});

const SEGMENTS = [
  { id: "inputs", label: "Inputs" },
  { id: "pnl", label: "P&L view" },
  { id: "code", label: "DAX & export" },
];

function Workspace() {
  const [workbook, setWorkbook] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [csvName, setCsvName] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [conversion, setConversion] = useState(null);
  const [error, setError] = useState("");
  const [segment, setSegment] = useState("inputs");
  const [period, setPeriod] = useState("all");
  const [account, setAccount] = useState("all");

  useEffect(() => {
    if (!csvText) {
      setConversion(null);
      return;
    }
    try {
      const next = buildConversion({ workbook, csvText, csvName, sheetName });
      setConversion(next);
      setError("");
      setPeriod("all");
      setAccount("all");
    } catch (err) {
      setConversion(null);
      setError(err?.message || "That file could not be converted.");
    }
  }, [workbook, csvText, csvName, sheetName]);

  const pnl = conversion?.pnl ?? null;

  const indexes = useMemo(() => {
    if (!pnl) return [];
    return period === "all" ? pnl.periods.map((_, index) => index) : [Number(period)];
  }, [period, pnl]);

  const rows = useMemo(() => {
    if (!pnl) return [];
    if (account === "all") return pnl.rows;
    const start = pnl.rows.findIndex((row) => row.id === account);
    if (start < 0) return pnl.rows;
    const base = pnl.rows[start];
    const out = [base];
    for (let i = start + 1; i < pnl.rows.length; i += 1) {
      if (pnl.rows[i].level <= base.level) break;
      out.push(pnl.rows[i]);
    }
    return out;
  }, [account, pnl]);

  const step = conversion ? 3 : workbook || csvText ? 2 : 1;

  const handleWorkbookFile = async (file) => {
    try {
      const parsed = await readWorkbookFile(file);
      setWorkbook(parsed);
      setSheetName(pickPnlSheet(parsed));
      setError("");
      toast.success(`${parsed.sheets.length} sheet${parsed.sheets.length === 1 ? "" : "s"} read from ${file.name}`);
    } catch (err) {
      setWorkbook(null);
      setError(err?.message || "That workbook could not be read.");
    }
  };

  const handleCsvFile = async (file) => {
    try {
      const text = await file.text();
      setCsvText(text);
      setCsvName(file.name);
      setError("");
    } catch {
      setError("That CSV could not be read.");
    }
  };

  const handleLoadDemo = () => {
    try {
      const parsed = parseTableauWorkbook(SAMPLE_TWB, SAMPLE_WORKBOOK_NAME);
      setWorkbook(parsed);
      setSheetName(pickPnlSheet(parsed));
      setCsvText(SAMPLE_CSV);
      setCsvName(SAMPLE_CSV_NAME);
      setError("");
      setSegment("pnl");
      toast.success("Professional services sample loaded");
    } catch (err) {
      setError(err?.message || "The sample could not be loaded.");
    }
  };

  const handleDownload = () => {
    if (!conversion) {
      toast.info("Add a workbook and its CSV first");
      return;
    }
    const blob = createZip(conversion.package);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${conversion.projectName}-pbip.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success("Power BI project downloaded");
  };

  return (
    <AppShell step={step} canDownload={Boolean(conversion)} onDownload={handleDownload}>
      <div className="flex border-b border-hairline bg-panel lg:hidden">
        {SEGMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSegment(item.id)}
            className={cn(
              "flex-1 px-2 py-2.5 text-[12px] font-semibold transition-colors",
              segment === item.id
                ? "border-b-2 border-primary text-foreground"
                : "border-b-2 border-transparent text-ink-muted"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="pb-16 lg:grid lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[380px_1fr] lg:overflow-hidden lg:pb-0">
        <aside
          className={cn(
            "border-hairline bg-panel lg:block lg:h-full lg:overflow-hidden lg:border-r",
            segment !== "inputs" && "hidden"
          )}
        >
          <IngestionConsole
            workbook={workbook}
            csv={conversion?.csv || null}
            sheetName={sheetName}
            onSheetChange={setSheetName}
            onWorkbookFile={handleWorkbookFile}
            onCsvFile={handleCsvFile}
            onLoadDemo={handleLoadDemo}
          />
        </aside>

        <section className={cn("flex min-h-0 flex-col lg:h-full", segment === "inputs" && "hidden lg:flex")}>
          <div className={cn("flex min-h-0 flex-[7] flex-col", segment === "code" && "hidden lg:flex")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline bg-panel px-3 py-2">
              <h1 className="font-display text-[13px] font-bold text-foreground">
                P&amp;L · {pnl?.sourceSheet || "not loaded"}
              </h1>
              {pnl && (
                <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-accent-foreground">
                  1:1 render
                </span>
              )}
              {pnl && (
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em]",
                    pnl.checks.length ? "bg-amber-100 text-amber-800" : "bg-secondary text-ink-muted"
                  )}
                >
                  {pnl.checks.length ? `${pnl.checks.length} variance` : "ties to detail"}
                </span>
              )}
              {pnl && (
                <span className="text-[11px] text-ink-muted">
                  {pnl.rows.length} lines · {pnl.periods.length} periods · value: {pnl.measure}
                </span>
              )}
            </div>

            {error && (
              <div className="border-b border-hairline bg-destructive/5 px-3 py-2 text-[11.5px] text-destructive">
                {error}
              </div>
            )}

            {pnl && pnl.warnings.length > 0 && (
              <div className="border-b border-hairline bg-surface px-3 py-1.5 text-[11px] text-ink-muted">
                {pnl.warnings.join(" ")}
              </div>
            )}

            {pnl ? (
              <>
                <SlicerBar
                  periods={pnl.periods}
                  periodValue={period}
                  onPeriodChange={setPeriod}
                  accounts={pnl.rows}
                  accountValue={account}
                  onAccountChange={setAccount}
                />
                <div className="min-h-0 flex-1 overflow-auto bg-panel">
                  <PnLMatrix rows={rows} periods={pnl.periods} indexes={indexes} />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-10">
                <div className="max-w-sm text-center">
                  <h2 className="font-display text-[20px] font-extrabold tracking-tight text-foreground">
                    Convert your Tableau P&amp;L to Power BI
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                    Add the workbook and its CSV extract in the console. You get the P&amp;L table rendered 1:1,
                    the semantic model, the DAX measures and a downloadable .pbip project.
                  </p>
                  <button
                    type="button"
                    onClick={handleLoadDemo}
                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Open the professional services sample
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-[3] flex-col border-t border-hairline",
              segment === "pnl" && "hidden lg:flex"
            )}
          >
            <CodeDrawer
              dax={conversion?.dax || []}
              files={conversion?.files || []}
              model={conversion?.model || null}
            />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-hairline bg-panel/95 px-3 py-2 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setSegment("inputs")}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md border border-hairline bg-panel text-[12.5px] font-semibold text-foreground"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-[12.5px] font-semibold text-primary-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Generate .pbip
        </button>
      </div>
    </AppShell>
  );
}