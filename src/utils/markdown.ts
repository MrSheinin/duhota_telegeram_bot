/**
 * Экранирует спецсимволы MarkdownV2 для обычного текста.
 * Безопасно принимает строки, числа, null и undefined.
 */
export function escapeMarkdown(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Экранирует текст ТОЛЬКО для использования внутри моноширинных блоков (`code`).
 */
export function escapeCodeMarkdown(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/[`\\]/g, '\\$&');
}