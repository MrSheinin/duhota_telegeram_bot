export interface ParsedSet {
  weight: number;
  reps: number;
}

/**
 * Парсит строку с весом и повторениями.
 * Поддерживаемые форматы:
 * - 80x8, 80X8, 80х8 (кириллица), 80Х8
 * - 80*8, 80×8
 * - 80 x 8, 80 * 8 (с любым количеством пробелов)
 * - 80.5x8, 80,5х8 (дробные веса)
 */
export function parseWeightAndReps(input: string): ParsedSet | null {
  const trimmed = input.trim();

  // Регулярное выражение:
  // ^(\d+(?:[.,]\d+)?) — вес (целое или дробное с . или ,)
  // \s*[*xXхХ×]\s*     — разделитель (*, латинская/кириллическая x/х, символ умножения) с пробелами
  // (\d+)$             — количество повторений (целое число)
  const regex = /^(\d+(?:[.,]\d+)?)\s*[*xXхХ×]\s*(\d+)$/;

  const match = trimmed.match(regex);
  if (!match) return null;

  // Заменяем запятую на точку для правильного parseFloat
  const weight = parseFloat(match[1].replace(',', '.'));
  const reps = parseInt(match[2], 10);

  // Дополнительная проверка на адекватность значений
  if (isNaN(weight) || isNaN(reps) || reps <= 0 || weight < 0) {
    return null;
  }

  return { weight, reps };
}