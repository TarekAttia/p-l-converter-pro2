const nf0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatAmount(value, { decimals = 0, currency = true, dashZero = true } = {}) {
  if (value == null || Number.isNaN(value)) return "–";
  if (dashZero && Math.abs(value) < 0.005) return "–";
  const negative = value < 0;
  const body = decimals === 2 ? nf2.format(Math.abs(value)) : nf0.format(Math.abs(value));
  const text = `${currency ? "$" : ""}${body}`;
  return negative ? `(${text})` : text;
}

export function formatCompact(value) {
  if (value == null || Number.isNaN(value)) return "–";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "–";
  return `${(value * 100).toFixed(digits)}%`;
}