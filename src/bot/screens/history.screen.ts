import { WorkoutListItemDTO, HistoryPeriod } from '../../services/history.service.js';
import { HistoryKeyboard } from '../keyboards/history.keyboards.js';
import { formatWorkoutCard } from '../../utils/history.formatter.js'; // Укажи актуальный путь к утилите

export class HistoryScreen {
  /**
   * Главный экран истории
   */
    static main() {
    return [
        '📊 *История тренировок, блядь\\!*\n\nНу и чё ты тут забыл\\? Смотришь, сколько прохлаждался, или нормальные цифры ищешь\\? Выбирай действие:',
        {
        parse_mode: 'MarkdownV2' as const,
        reply_markup: HistoryKeyboard.mainScreen(),
        },
    ] as const;
    }

  /**
   * Экран выбора периода просмотра
   */
  static viewPeriodSelect() {
    return [
      '📅 *Просмотр истории*\n\nЗа какой период поднять твой архивы\\? Давай, тыкай, посмотрим, ебошил ты или у тебя жопа горела и ты выгореть боялся, нахуй:',
      {
        parse_mode: 'MarkdownV2' as const,
        reply_markup: HistoryKeyboard.viewPeriods(),
      },
    ] as const;
  }

  /**
   * Экран выбора периода экспорта
   */
  static exportPeriodSelect() {
    return [
      `📊 *Экспорт в Excel*\n\nВыберите период за который сгенерировать отчет:`,
      {
        parse_mode: 'MarkdownV2' as const,
        reply_markup: HistoryKeyboard.exportPeriods(),
      },
    ] as const;
  }

  /**
   * Экран со списком тренировок
   */
  static workoutList(workouts: WorkoutListItemDTO[], period: HistoryPeriod) {
    if (workouts.length === 0) {
      return [
        '📭 *Нихуя не найдено за этот период\\!*\n\nТы вообще в зал ходил или только сопли жевал и блогером стать хотел\\, блядь\\? Зайди в другой период, сука\\!',
        {
          parse_mode: 'MarkdownV2' as const,
          reply_markup: HistoryKeyboard.viewPeriods(),
        },
      ] as const;
    }

    return [
      `📋 *Найденные тренировки \\(${workouts.length}\\):*\n\nВот, хоть что\\-то делать начал, блядь\\! Выбирай тренировку, посмотрим, вспотел ты или просто пиздел, блять, блогер, нахуй:`,
      {
        parse_mode: 'MarkdownV2' as const,
        reply_markup: HistoryKeyboard.workoutList(workouts, period),
      },
    ] as const;
  }

  /**
   * Карточка конкретной тренировки (использует утилиту formatWorkoutCard)
   */
  static workoutDetails(
    session: NonNullable<Awaited<ReturnType<typeof import('../../services/history.service.js').HistoryService.getWorkoutDetails>>>,
    returnPeriod: HistoryPeriod
  ) {
    const text = formatWorkoutCard(session);

    return [
      text,
      {
        parse_mode: 'MarkdownV2' as const,
        reply_markup: HistoryKeyboard.workoutDetails(returnPeriod),
      },
    ] as const;
  }
}