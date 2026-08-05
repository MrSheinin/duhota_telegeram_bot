// 1. Одиночная запись расписания (один день)
export interface ScheduleItemDTO {
  id: number;
  dayOfWeek: number; // 1 (Пн) - 7 (Вс)
  time: string;      // Формат "HH:mm", например "18:30"
}

// 2. Полные настройки пользователя для передачи в Handler / Formatter
export interface UserReminderSettingsDTO {
  id: number;          // ID из таблицы reminders
  userId: number;      // ID пользователя из базы (users.id)
  isEnabled: boolean;  // Включены ли напоминания вообще
  timezone: string;    // Часовой пояс
  schedules: ScheduleItemDTO[]; // Список настроенных дней
}

// 3. Данные для Cron-сервиса (кому и куда отправить сообщение)
export interface PendingNotificationDTO {
  telegramId: number;  // Telegram ID для bot.api.sendMessage
  time: string;        // "18:30"
  firstName?: string;
}