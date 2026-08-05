import { InlineKeyboard } from 'grammy';
import { WorkingSet } from '../../services/workout.service.js';

export class WorkoutProcessKeyboard {
  /**
   * Динамическая клавиатура упражнения
   * Генерирует кнопки "Изменить N" строго в столбик
   */
  static activeExercise(
    sets: WorkingSet[],
    isLastExercise: boolean,
    hasPreviousExercise: boolean = false
  ) {
    const keyboard = new InlineKeyboard();

    // Кнопки "Изменить N" вертикальным списком
    sets.forEach((_, index) => {
      const setNum = index + 1;
      keyboard.text(`✏️ Изменить ${setNum}`, `edit_set:${setNum}`).row();
    });

    // Управление подходами
    keyboard
      .text('➕ Добавить подход', 'add_set')
      .text('🗑️ Удалить подход', 'delete_set')
      .row();

    // Кнопка перехода назад (появляется только если есть предыдущее упражнение)
    if (hasPreviousExercise) {
      keyboard.text('⬅️ Предыдущее упражнение', 'prev_exercise');
    }

    // Навигация вперед / Завершение
    if (isLastExercise) {
      keyboard.text('🏁 Завершить тренировку', 'finish_exercise').row();
    } else {
      keyboard.text('➡️ Следующее упражнение', 'finish_exercise').row();
    }

    keyboard.text('🚫 Отменить тренировку', 'cancel_flow');

    return keyboard;
  }

  static cancelEdit() {
    return new InlineKeyboard().text('❌ Отмена редактирования', 'cancel_edit');
  }

  static goToMenu() {
    return new InlineKeyboard().text('🏠 В главное меню', 'go_to_menu');
  }
}