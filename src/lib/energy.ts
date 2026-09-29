// 전력 측정값 표시용 포맷터. (클라이언트/서버 공용)

export function formatWatts(watts: number | null): string {
  if (watts === null) return "-";
  if (watts >= 1000) return `${(watts / 1000).toFixed(2)} kW`;
  return `${watts < 10 ? watts.toFixed(1) : Math.round(watts)} W`;
}

export function formatKwh(kwh: number | null): string {
  if (kwh === null) return "-";
  if (kwh < 1) return `${Math.round(kwh * 1000)} Wh`;
  return `${kwh.toFixed(kwh < 100 ? 2 : 1)} kWh`;
}

/** "128 W" → ["128", "W"]. 단위를 작게 분리해 표시할 때 사용. 단위가 없으면 두 번째는 "" */
export function splitUnit(formatted: string): [string, string] {
  const i = formatted.lastIndexOf(" ");
  return i === -1
    ? [formatted, ""]
    : [formatted.slice(0, i), formatted.slice(i + 1)];
}

export function formatVolts(volts: number | null): string {
  return volts === null ? "-" : `${volts.toFixed(0)} V`;
}

export function formatAmps(amps: number | null): string {
  return amps === null ? "-" : `${amps.toFixed(2)} A`;
}
