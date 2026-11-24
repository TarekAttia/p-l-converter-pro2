import { ChevronDown, SlidersHorizontal } from "lucide-react";

function Filter({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface pl-2 pr-1">
      <span className="whitespace-nowrap text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 max-w-[180px] appearance-none bg-transparent pl-0 pr-5 text-[12px] font-medium text-foreground focus:outline-none"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0.5 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-muted" />
      </div>
    </label>
  );
}

export default function SlicerBar({
  periods,
  periodValue,
  onPeriodChange,
  accounts,
  accountValue,
  onAccountChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-panel px-3 py-2">
      <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      <Filter
        label="Period"
        value={periodValue}
        onChange={onPeriodChange}
        options={[
          { value: "all", label: "All periods" },
          ...periods.map((period, index) => ({ value: String(index), label: period })),
        ]}
      />
      <Filter
        label="Account"
        value={accountValue}
        onChange={onAccountChange}
        options={[
          { value: "all", label: "All lines" },
          ...accounts.map((account) => ({ value: account.id, label: account.label })),
        ]}
      />
      <span className="ml-auto hidden text-[10.5px] text-ink-muted sm:block">
        Each dropdown is generated as a Power BI slicer
      </span>
    </div>
  );
}