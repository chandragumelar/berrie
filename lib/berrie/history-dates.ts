/** Calendar dates in the shop's timezone; never use the browser's timezone. */
export function storeDate(time: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(time));
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

/** Both endpoints include the entire calendar day. Empty endpoints are unbounded. */
export function withinStoreDates(time: number, zone: string, from: string, to: string): boolean {
  if (from && to && to < from) return false;
  const date = storeDate(time, zone);
  return (!from || date >= from) && (!to || date <= to);
}
