import cron, { ScheduledTask } from 'node-cron';
import { Bot, InlineKeyboard } from 'grammy';
import { CustomContext } from '../bot/context.js';
import { reminderService } from './reminder.service.js';
import { EasterEggService } from './easterEgg.service.js';

export class ReminderCronService {
  private static cronTask: ScheduledTask | null = null;

  static start(bot: Bot<CustomContext>): void {
    if (this.cronTask) {
      console.log('⚠️ Reminder Cron уже запущен.');
      return;
    }

    // Запуск каждую минуту
    this.cronTask = cron.schedule('* * * * *', async () => {
      await this.checkAndSendReminders(bot);
    });

    console.log('🚀 Reminder Cron успешно запущен (проверка каждую минуту).');
  }

  static stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      console.log('🛑 Reminder Cron остановлен.');
    }
  }

  private static async checkAndSendReminders(bot: Bot<CustomContext>): Promise<void> {
    try {
      const rigaDateStr = new Date().toLocaleString('en-US', { timeZone: 'Europe/Riga' });
      const rigaDate = new Date(rigaDateStr);

      const rawDay = rigaDate.getDay();
      const currentDayOfWeek = rawDay === 0 ? 7 : rawDay;

      const hours = String(rigaDate.getHours()).padStart(2, '0');
      const minutes = String(rigaDate.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      const pendingReminders = await reminderService.getPendingNotifications(
        currentDayOfWeek,
        currentTime
      );

      if (pendingReminders.length === 0) {
        return;
      }

      console.log(`⏰ Найдено ${pendingReminders.length} напоминаний на ${currentTime}`);

      const reminderKeyboard = new InlineKeyboard()
        .text('🚀 Начать тренировку', 'start_workout_from_reminder')
        .row()
        .text('⏭️ Пропустить', 'skip_reminder');

      for (const item of pendingReminders) {
        try {
          // 🔍 ЛОГ ДЛЯ ПРОВЕРКИ СТРУКТУРЫ ОБЪЕКТА ИЗ БД
          console.log('📦 Данные напоминания из БД:', item);

          // Проверяем все возможные варианты названий полей в записи
          const rawTelegramId = item.telegramId || (item as any).userTelegramId || (item as any).user_telegram_id;
          const firstName = item.firstName || (item as any).first_name || 'Атлет';

          if (!rawTelegramId) {
            console.error('❌ Не удалось найти telegramId в объекте напоминания:', item);
            continue;
          }

          const targetChatId = Number(rawTelegramId);

          // Генерируем текст с учетом пасхалок по строковому ID
          const reminderMessage = EasterEggService.getWorkoutReminderMessage(
            rawTelegramId,
            firstName
          );

          await bot.api.sendMessage(
            targetChatId,
            reminderMessage,
            {
              parse_mode: 'Markdown',
              reply_markup: reminderKeyboard,
            }
          );
          console.log(`✅ Напоминание с пасхалкой отправлено для ID ${rawTelegramId}`);
        } catch (sendError) {
          console.error(`❌ Ошибка отправки напоминания:`, sendError);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при выполнении Reminder Cron:', error);
    }
  }
}