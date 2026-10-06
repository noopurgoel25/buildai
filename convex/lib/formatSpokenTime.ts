// Format only explicit clock times. Never infer a meridiem or a date.
export function formatSpokenTime(text: string): string {
  const hours = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|1[0-2]|[1-9])\s*([ap])\s*\.?\s*m\b\.?/gi,
    (_match, hour: string, meridiem: string) => `${hours.includes(hour.toLowerCase()) ? hours.indexOf(hour.toLowerCase()) + 1 : hour} ${meridiem.toLowerCase()}.m.`);
}
