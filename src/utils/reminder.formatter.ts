import { UserReminderSettingsDTO } from '../types/reminder.types.js'
import { escapeMarkdown } from './markdown.js'; // Твоя утилита экранирования

export class ReminderFormatter {
  private static readonly DAYS_MAP: Record<number, string> = {
    1: 'Понедельник',
    2: 'Вторник',
    3: 'Среда',
    4: 'Четверг',
    5: 'Пятница',
    6: 'Суббота',
    7: 'Воскресенье',
  };

  /**
   * Форматирует главный экран настроек
   */
  static formatMainMenu(settings: UserReminderSettingsDTO): string {
    const statusEmoji = settings.isEnabled ? '🔔' : '🔕';
    const statusText = settings.isEnabled ? 'Включены' : 'Выключены';

    let text = `${statusEmoji} *Настройки напоминаний*\n\n`;
    text += `Статус: *${statusText}*\n`;
    text += `Часовой пояс: \`${escapeMarkdown(settings.timezone)}\`\n\n`;
    text += `Выберите день недели для настройки или изменения времени:`;

    return text;
  }

  /**
   * Форматирует экран управления конкретным днем
   */
  static formatDayManage(dayOfWeek: number, time: string): string {
    const dayName = this.DAYS_MAP[dayOfWeek] || '';
    return `📅 *${escapeMarkdown(dayName)}*\n\nТекущее время напоминания: *${escapeMarkdown(time)}*`;
  }
}