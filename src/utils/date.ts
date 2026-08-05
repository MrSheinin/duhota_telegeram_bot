// src/utils/date.ts

export function formatWorkoutHeaderDate(date: Date): string {
  // Настройка временной зоны Riga
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Riga',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };

  // Пример вывода: "29.07.2026 (Ср), 18:30"
  const formatter = new Intl.DateTimeFormat('ru-RU', options);
  const parts = formatter.formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const weekday = getPart('weekday');
  const hour = getPart('hour');
  const minute = getPart('minute');

  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  return `${day}.${month}.${year} (${capitalizedWeekday}), ${hour}:${minute}`;
}