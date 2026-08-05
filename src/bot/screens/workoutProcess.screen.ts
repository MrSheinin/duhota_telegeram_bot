import { WorkingExercise, WorkingSet } from '../../services/workout.service.js';
import { WorkoutProcessKeyboard } from '../keyboards/workoutProcess.keyboard.js';

export class WorkoutProcessScreen {
  /**
   * Отображение текущего упражнения и его подходов
   */
  static activeExercise(
    exercise: WorkingExercise,
    currentIndex: number,
    totalCount: number
  ) {
    let text = `🏋️ **Упражнение ${currentIndex} из ${totalCount}**\n`;
    text += `📌 **${exercise.name}**\n\n`;

    if (exercise.sets.length === 0) {
      text += 'Подходов нихуя нет! Жми "➕ Добавить подход", ты чё, пришёл в зале просто побеседовать?!';
    } else {
      text += '📋 **Подходы:**\n';
      exercise.sets.forEach((set, i) => {
        text += `${i + 1}. **${set.weight}** кг × **${set.reps}**\n`;
      });
      text += '\n💡 _Жми "Изменить N", если криво ввёл или решил сдуться, нахуй._';
    }

    const isLast = currentIndex === totalCount;
    const hasPrevious = currentIndex > 1;

    return [
      text,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutProcessKeyboard.activeExercise(exercise.sets, isLast, hasPrevious),
      },
    ] as const;
  }

  /**
   * Промпт для редактирования конкретного подхода
   */
  static promptEditSet(setNumber: number, currentSet?: WorkingSet) {
    let text = `✏️ **Редактирование подхода №${setNumber}**\n\n`;
    if (currentSet) {
      text += `Текущие данные: **${currentSet.weight}** кг × **${currentSet.reps}**\n\n`;
    }
    text += 'Давай пиши нормальные цифры (например: "80x8" или "80 8"), хватит пальцами промахиваться, блядь!';

    return [
      text,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutProcessKeyboard.cancelEdit(),
      },
    ] as const;
  }

  /**
   * Промпт для выбора подхода при удалении
   */
  static promptDeleteSet(maxSets: number) {
    return [
      `🗑️ **Удаление подхода**\n\nКакая-то херня получилась? Пиши номер подхода от 1 до ${maxSets}, снесём его нахуй!`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutProcessKeyboard.cancelEdit(),
      },
    ] as const;
  }

  /**
   * Успешное сохранение тренировки
   */
  static success(summary: { exercisesCount: number; setsCount: number }) {
    return [
      `🎉 **Ну хоть что-то из тебя выжали, блядь!**\n\n` +
        `📊 **Вот что ты там понаделал:**\n` +
        `• Упражнений: ${summary.exercisesCount}\n` +
        `• Всего подходов: ${summary.setsCount}\n\n` +
        `Ты даже вспотеть толком не успел, а уже закончил! Ладно, иди жри свои 50 грамм овсянки и восстанавливайся, нахуй! 💪`,
      {
        parse_mode: 'Markdown' as const,
        reply_markup: WorkoutProcessKeyboard.goToMenu(),
      },
    ] as const;
  }

  /**
   * Экран отмены тренировки
   */
  static cancelled() {
    return [
      '🚫 Слился с тренировки, блядь! Всё пошло по пизде, ничего не сохранено! Проваливай, болван, блять, неготовый!',
      { reply_markup: WorkoutProcessKeyboard.goToMenu() },
    ] as const;
  }
}