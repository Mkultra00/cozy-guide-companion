export function kg(value: number, digits = 0): string {
  return `${value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} kg-eq`;
}

export function num(value: number, digits = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function pct(fraction: number, digits = 0): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function signed(value: number, digits = 1, unit = ""): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${num(Math.abs(value), digits)}${unit ? ` ${unit}` : ""}`;
}

export function relativeTime(iso: string, now: number): string {
  const diffSec = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toISOString().slice(11, 19) + "Z";
}

export function dateTime(iso: string): string {
  return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + "Z";
}
