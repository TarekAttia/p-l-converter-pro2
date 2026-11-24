import { Check, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Extract & map", "Export .pbip"];

export default function AppShell({ step = 1, canDownload = true, onDownload, children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-40 shrink-0 border-b border-hairline bg-panel/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-3 md:px-5">
          <div className="leading-none">
            <div className="font-display text-[16px] font-extrabold tracking-tight text-foreground">
              P&amp;L Bridge
            </div>
            <div className="mt-1 hidden text-[10px] uppercase tracking-[0.18em] text-ink-muted sm:block">
              Tableau → Power BI
            </div>
          </div>

          <div className="ml-5 hidden items-center gap-1 lg:flex">
            {STEPS.map((label, i) => {
              const index = i + 1;
              const done = index < step;
              const active = index === step;
              return (
                <div key={label} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-ink-muted/40" />}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px]",
                      active ? "bg-accent text-accent-foreground" : "text-ink-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold",
                        done || active
                          ? "bg-primary text-primary-foreground"
                          : "border border-hairline text-ink-muted"
                      )}
                    >
                      {done ? <Check className="h-2.5 w-2.5" /> : index}
                    </span>
                    <span className="font-medium">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={onDownload}
              disabled={!canDownload}
              className="h-9 gap-1.5 bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download .pbip Project</span>
              <span className="sm:hidden">.pbip</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}