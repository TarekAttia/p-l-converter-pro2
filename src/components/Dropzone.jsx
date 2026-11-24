import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function Dropzone({ accept, icon: Icon, title, hint, fileName, meta, onFile }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const loaded = Boolean(fileName);

  const pick = () => inputRef.current?.click();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "cursor-pointer rounded-md border border-dashed px-3 py-3 transition-colors",
        over
          ? "border-primary bg-accent"
          : loaded
            ? "border-primary/35 bg-accent/40"
            : "border-hairline bg-surface hover:border-primary/45 hover:bg-panel"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border",
            loaded ? "border-primary/25 bg-panel text-primary" : "border-hairline bg-panel text-ink-muted"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-semibold text-foreground">{fileName || title}</div>
          <div className="mt-0.5 truncate text-[11px] text-ink-muted">{meta || hint}</div>
        </div>
      </div>
    </div>
  );
}