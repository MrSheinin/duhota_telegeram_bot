import { InlineKeyboard } from 'grammy';
import { WorkoutListItemDTO, HistoryPeriod } from '../../services/history.service.js';

export class HistoryKeyboard {
  /**
   * Главный экран выбора действия в Истории
   */
  static mainScreen() {
    return new InlineKeyboard()
      .text('📅 Просмотр истории', 'hist_view_period')
      .row()
      .text('📊 Экспорт в Excel', 'hist_export_period')
      .row()
      .text('🏠 В главное меню', 'go_to_menu');
  }

  /**
   * Клавиатура выбора периода для просмотра истории
   */
  static viewPeriods() {
    return new InlineKeyboard()
      .text('За неделю', 'hist_list:week')
      .text('За месяц', 'hist_list:month')
      .row()
      .text('За год', 'hist_list:year')
      .text('За всё время', 'hist_list:all')
      .row()
      .text('⬅️ Назад', 'hist_main');
  }

  /**
   * Клавиатура выбора периода для экспорта Excel
   */
  static exportPeriods() {
    return new InlineKeyboard()
      .text('Неделя', 'hist_download:week')
      .text('Месяц', 'hist_download:month')
      .row()
      .text('Год', 'hist_download:year')
      .text('Всё время', 'hist_download:all')
      .row()
      .text('⬅️ Назад', 'hist_main');
  }

  /**
   * Список тренировок за выбранный период
   */
  static workoutList(workouts: WorkoutListItemDTO[], currentPeriod: HistoryPeriod) {
    const keyboard = new InlineKeyboard();

    workouts.forEach((w) => {
      const dateStr = new Date(w.completedAt).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
      });
      keyboard.text(`🏋️ ${dateStr} - ${w.programName}`, `hist_details:${w.id}:${currentPeriod}`).row();
    });

    keyboard.text('⬅️ К выбору периода', 'hist_view_period');
    return keyboard;
  }

  /**
   * Карточка отдельной тренировки
   */
  static workoutDetails(returnPeriod: HistoryPeriod) {
    return new InlineKeyboard()
      .text('⬅️ Назад к списку', `hist_list:${returnPeriod}`)
      .row()
      .text('🏠 В главное меню', 'go_to_menu');
  }
}