import { InlineKeyboard, Keyboard } from 'grammy';
import { UserReminderSettingsDTO } from '../../types/reminder.types.js';

export class ReminderKeyboard {
  private static readonly DAYS_SHORT = [
    { day: 1, label: 'Пн' },
    { day: 2, label: 'Вт' },
    { day: 3, label: 'Ср' },
    { day: 4, label: 'Чт' },
    { day: 5, label: 'Пт' },
    { day: 6, label: 'Сб' },
    { day: 7, label: 'Вс' },
  ];

  /**
   * Главное меню настроек напоминаний
   */
  static mainMenu(settings: UserReminderSettingsDTO): InlineKeyboard {
    const kb = new InlineKeyboard();

    const scheduleMap = new Map(settings.schedules.map((s) => [s.dayOfWeek, s.time]));

    this.DAYS_SHORT.forEach(({ day, label }, index) => {
      const time = scheduleMap.get(day);
      const buttonText = time ? `${label} ${time}` : `${label} —`;
      kb.text(buttonText, `remind_day:${day}`);

      if (index === 2 || index === 5 || index === 6) {
        kb.row();
      }
    });

    const toggleText = settings.isEnabled ? '🔕 Выключить все' : '🔔 Включить все';
    kb.row().text(toggleText, `remind_toggle:${!settings.isEnabled}`);

    // Добавляем кнопку выхода из раздела в главное меню бота
    kb.row().text('⬅️ Главное меню', 'remind_close');

    return kb;
  }

  /**
   * Меню управления конкретным днем
   */
  static dayManage(dayOfWeek: number): InlineKeyboard {
    return new InlineKeyboard()
      .text('✏️ Изменить время', `remind_set_time:${dayOfWeek}`)
      .text('🗑 Удалить', `remind_delete_day:${dayOfWeek}`)
      .row()
      .text('⬅️ Назад', 'remind_main');
  }

  /**
   * Inline-кнопка отмены при вводе времени
   */
  static cancelInput(): InlineKeyboard {
    return new InlineKeyboard().text('❌ Отмена', 'remind_cancel_input');
  }

  /**
   * Текстовая нижняя кнопка отмены (Reply)
   */
  static cancelInputReply(): Keyboard {
    return new Keyboard().text('❌ Отмена').resized().oneTime();
  }
}