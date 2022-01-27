export function formatDateTime(dateTime: number): string {
  return Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateTime);
}
