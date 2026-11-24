import { useState } from "react";
import { Check, Copy, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "dax", label: "DAX" },
  { id: "tree", label: "Project tree" },
  { id: "model", label: "Model" },
];

export default function CodeDrawer({ dax = [], files = [], model }) {
  const [tab, setTab] = useState("dax");
  const [copied, setCopied] = useState(null);

  const copy = async (measure) => {
    try {
      await navigator.clipboard.writeText(`${measure.name} =\n${measure.expression}`);
      setCopied(measure.name);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex shrink-0 items-center gap-1 border-b border-hairline px-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "px-2.5 py-2 text-[11.5px] font-semibold transition-colors",
              tab === item.id
                ? "border-b-2 border-primary text-foreground"
                : "border-b-2 border-transparent text-ink-muted hover:text-foreground"
            )}
          >
            {item.label}
            {item.id === "dax" && (
              <span className="ml-1 font-mono text-[10px] font-normal text-ink-muted">{dax.length}</span>
            )}
            {item.id === "tree" && (
              <span className="ml-1 font-mono text-[10px] font-normal text-ink-muted">{files.length}</span>
            )}
          </button>
        ))}
        <span className="ml-auto hidden pr-1 text-[9.5px] uppercase tracking-[0.14em] text-ink-muted sm:block">
          Auto-generated
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "dax" && (
          <div className="bg-codebg">
            {dax.length === 0 && (
              <p className="px-3 py-4 font-mono text-[11.5px] text-codefg">
                -- Add a workbook and CSV to generate measures
              </p>
            )}
            {dax.map((measure) => (
              <div key={measure.name} className="border-b border-white/5 px-3 py-2 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11.5px] font-medium text-codestrong">{measure.name}</span>
                  <span className="rounded-sm bg-white/10 px-1 py-[1px] font-mono text-[9px] uppercase tracking-wider text-codefg">
                    {measure.kind}
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(measure)}
                    aria-label={`Copy ${measure.name}`}
                    className="ml-auto grid h-6 w-6 place-items-center rounded-sm text-codefg/60 transition-colors hover:bg-white/10 hover:text-codestrong"
                  >
                    {copied === measure.name ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-codefg">
                  {measure.expression}
                </pre>
                <div className="mt-0.5 font-mono text-[10px] text-codestrong/35">format: {measure.formatString}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "tree" && (
          <div className="px-3 py-2">
            {files.map((path) => {
              const parts = path.split("/");
              const depth = parts.length - 1;
              const name = parts[parts.length - 1];
              return (
                <div
                  key={path}
                  className="flex items-center gap-1.5 py-[3px] font-mono text-[11px]"
                  style={{ paddingLeft: depth * 12 }}
                >
                  <span className={depth === 0 ? "text-primary" : "text-ink-muted/70"}>
                    {depth === 0 ? "▸" : "·"}
                  </span>
                  <span
                    className={cn(
                      "truncate",
                      depth === 0 ? "font-semibold text-foreground" : "text-foreground/75"
                    )}
                    title={path}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {tab === "model" && model && (
          <div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {model.tables.map((table) => (
                <div key={table.name} className="rounded-md border border-hairline bg-surface px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[11.5px] font-semibold text-foreground">{table.name}</span>
                    <span className="ml-auto rounded-sm bg-panel px-1 py-[1px] text-[9px] uppercase tracking-wider text-ink-muted">
                      {table.kind}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-ink-muted">
                    {table.kind === "measures" ? `${table.measures} measures` : `${table.columns} columns`}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-hairline px-3 py-2">
              <div className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Relationships
              </div>
              <ul className="mt-1.5 space-y-1">
                {model.relationships.map((relationship) => (
                  <li
                    key={`${relationship.from}${relationship.to}`}
                    className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-foreground/80"
                  >
                    <GitBranch className="h-3 w-3 shrink-0 text-primary" />
                    <span>{relationship.from}</span>
                    <span className="text-ink-muted">→</span>
                    <span>{relationship.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}