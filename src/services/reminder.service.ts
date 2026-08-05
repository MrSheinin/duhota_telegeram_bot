import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { reminders, reminderSchedule, users } from '../db/schema.js';
import {
  UserReminderSettingsDTO,
  PendingNotificationDTO,
} from '../types/reminder.types.js';

export class ReminderService {
  /**
   * Получает внутренний ID пользователя по jeho Telegram ID.
   * Если пользователя нет в базе — создаёт его.
   */
  private async getInternalUserId(telegramId: number): Promise<number> {
    let user = await db.query.users.findFirst({
      where: eq(users.telegramId, telegramId),
      columns: { id: true },
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({ telegramId })
        .returning({ id: users.id });
      return newUser.id;
    }

    return user.id;
  }

  /**
   * 1. Получение настроек пользователя по telegramId.
   */
  async getOrCreateUserSettings(telegramId: number): Promise<UserReminderSettingsDTO> {
    const userId = await this.getInternalUserId(telegramId);

    let reminder = await db.query.reminders.findFirst({
      where: eq(reminders.userId, userId),
      with: { schedule: true },
    });

    if (!reminder) {
      const [inserted] = await db
        .insert(reminders)
        .values({
          userId: userId,
          isEnabled: true,
          timezone: 'Europe/Riga',
        })
        .returning();

      return {
        id: inserted.id,
        userId: inserted.userId,
        isEnabled: inserted.isEnabled,
        timezone: inserted.timezone,
        schedules: [],
      };
    }

    return {
      id: reminder.id,
      userId: reminder.userId,
      isEnabled: reminder.isEnabled,
      timezone: reminder.timezone,
      schedules: reminder.schedule.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        time: s.time,
      })),
    };
  }

  /**
   * 2. Переключение главного тумблера
   */
  async toggleReminders(telegramId: number, isEnabled: boolean): Promise<void> {
    const userId = await this.getInternalUserId(telegramId);
    await db
      .update(reminders)
      .set({ isEnabled })
      .where(eq(reminders.userId, userId));
  }

  /**
   * 3. Добавление или обновление времени для конкретного дня (UPSERT)
   */
  async upsertSchedule(reminderId: number, dayOfWeek: number, time: string): Promise<void> {
    await db
      .insert(reminderSchedule)
      .values({
        reminderId,
        dayOfWeek,
        time,
      })
      .onConflictDoUpdate({
        target: [reminderSchedule.reminderId, reminderSchedule.dayOfWeek],
        set: { time },
      });
  }

  /**
   * 4. Удаление настройки для конкретного дня
   */
  async deleteSchedule(reminderId: number, dayOfWeek: number): Promise<void> {
    await db
      .delete(reminderSchedule)
      .where(
        and(
          eq(reminderSchedule.reminderId, reminderId),
          eq(reminderSchedule.dayOfWeek, dayOfWeek)
        )
      );
  }

  /**
   * 5. Выборка для Cron (работает с telegramId для отправки)
   */
  async getPendingNotifications(
    dayOfWeek: number,
    currentTime: string
  ): Promise<PendingNotificationDTO[]> {
    return await db
      .select({
        telegramId: users.telegramId,
        time: reminderSchedule.time,
      })
      .from(reminderSchedule)
      .innerJoin(reminders, eq(reminderSchedule.reminderId, reminders.id))
      .innerJoin(users, eq(reminders.userId, users.id))
      .where(
        and(
          eq(reminders.isEnabled, true),
          eq(reminderSchedule.dayOfWeek, dayOfWeek),
          eq(reminderSchedule.time, currentTime)
        )
      );
  }
}

export const reminderService = new ReminderService();