import { InlineKeyboard } from 'grammy';

export const mainMenuKeyboard = new InlineKeyboard()
  .text('🏋️ Начать тренировку', 'start_workout')
  .text('➕ Создать программу', 'create_program')
  .row()
  .text('📊 История', 'hist_main')
  .text('⏰ Напоминания', 'remind_main');