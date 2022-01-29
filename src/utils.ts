export function formatDateTime(dateTime: number): string {
  return Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateTime);
}

export function testWhitespace(text?: string): boolean {
  return text?.trim().length === 0;
}
