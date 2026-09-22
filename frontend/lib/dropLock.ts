/** True from 1 hour before the run's Eastern start time onward. */
export function isLateDropWindow(date: string, startTime: string): boolean {
  if (!date || !startTime) return false;
  const startMs = easternWallTimeToUtcMs(date.split('T')[0], startTime.slice(0, 5));
  if (startMs === null) return false;
  return Date.now() >= startMs - 60 * 60 * 1000;
}

function easternWallTimeToUtcMs(date: string, time: string): number | null {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  if ([year, month, day, hour, minute].some((value) => Number.isNaN(value))) {
    return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcGuess));

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const zonedHour = map.hour === '24' ? 0 : Number(map.hour);
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    zonedHour,
    Number(map.minute),
    Number(map.second),
  );
  const offset = asUtc - utcGuess;
  return utcGuess - offset;
}
