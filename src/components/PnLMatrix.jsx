import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";

export default function PnLMatrix({ rows, periods, indexes }) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const nodes = useMemo(() => {
    const stack = [];
    return rows.map((row) => {
      while (stack.length && stack[stack.length - 1].level >= row.level) stack.pop();
      const parentId = stack.length ? stack[stack.length - 1].id : null;
      stack.push(row);
      return { ...row, parentId };
    });
  }, [rows]);

  const parentMap = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => map.set(node.id, node.parentId));
    return map;
  }, [nodes]);

  const parents = useMemo(
    () => new Set(nodes.filter((node) => node.parentId).map((node) => node.parentId)),
    [nodes]
  );

  const visible = useMemo(
    () =>
      nodes.filter((node) => {
        let parent = parentMap.get(node.id);
        while (parent) {
          if (collapsed.has(parent)) return false;
          parent = parentMap.get(parent);
        }
        return true;
      }),
    [nodes, parentMap, collapsed]
  );

  const toggle = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const shown = indexes.map((index) => ({ index, label: periods[index] }));

  return (
    <table className="w-full min-w-max border-collapse text-[13px]">
      <thead>
        <tr>
          <th className="sticky left-0 top-0 z-20 min-w-[220px] border-b border-hairline bg-panel px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Account
          </th>
          {shown.map((column) => (
            <th
              key={column.index}
              className="sticky top-0 z-10 whitespace-nowrap border-b border-hairline bg-panel px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted"
            >
              {column.label}
            </th>
          ))}
          <th className="sticky top-0 z-10 whitespace-nowrap border-b border-l border-hairline bg-panel px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {visible.map((row) => {
          const hasChildren = parents.has(row.id);
          const open = !collapsed.has(row.id);
          return (
            <tr key={row.id}>
              <td
                className={cn(
                  "sticky left-0 z-10 border-b border-hairline bg-panel px-3 py-[7px]",
                  row.isTotal ? "font-semibold text-foreground" : "text-foreground/85",
                  row.isTotal && "border-t border-t-foreground/10"
                )}
              >
                <div className="flex items-center gap-1" style={{ paddingLeft: row.level * 14 }}>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.id)}
                      aria-label={open ? `Collapse ${row.label}` : `Expand ${row.label}`}
                      className="grid h-4 w-4 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
                    </button>
                  ) : (
                    <span className="h-4 w-4 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{row.label}</span>
                </div>
              </td>
              {shown.map((column) => {
                const value = row.values?.[column.index] ?? null;
                return (
                  <td
                    key={column.index}
                    className={cn(
                      "tnum whitespace-nowrap border-b border-hairline px-3 py-[7px] text-right",
                      value != null && value < 0 ? "text-negative" : "text-foreground/85",
                      row.isTotal && "border-t border-t-foreground/10 font-semibold",
                      row.isTotal && !(value != null && value < 0) && "text-foreground"
                    )}
                  >
                    {formatAmount(value)}
                  </td>
                );
              })}
              <td
                className={cn(
                  "tnum whitespace-nowrap border-b border-l border-hairline px-3 py-[7px] text-right font-semibold",
                  row.total < 0 ? "text-negative" : "text-foreground",
                  row.isTotal && "border-t border-t-foreground/10"
                )}
              >
                {formatAmount(row.total)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}