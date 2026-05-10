export function clampDurationMinutes(value: number, min = 1, max = 600): number {
  return Math.min(max, Math.max(min, value || min));
}
