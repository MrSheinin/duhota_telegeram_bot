import { InlineKeyboard } from 'grammy';

export const createProgramKeyboards = {
  // Кнопка при вводе подходов
  finishExercise: () =>
    new InlineKeyboard().text('✅ Завершить упражнение', 'finish_exercise'),

  // Выбор действий после добавления упражнения
  nextExerciseOrFinish: () =>
    new InlineKeyboard()
      .text('➕ Добавить упражнение', 'add_exercise')
      .row()
      .text('🎉 Сохранить программу', 'finish_program'),
};