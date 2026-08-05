import { Composer } from 'grammy';
import { CustomContext } from '../context.js';

export const workoutHandler = new Composer<CustomContext>();

// 1. Обычный старт тренировки по инлайн-кнопкам из меню
workoutHandler.callbackQuery(['workout', 'start_workout'], async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('workoutConversation');
});

// 2. Старт тренировки из Напоминания
workoutHandler.callbackQuery('start_workout_from_reminder', async (ctx) => {
  await ctx.answerCallbackQuery();
  // Удаляем сообщение с напоминанием, чтобы не засорять чат
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Сообщение уже удалено
  }
  // Переходим к выбору программы и началу тренировки
  await ctx.conversation.enter('workoutConversation');
});

// 3. Пропуск тренировки из Напоминания (просто удаляем сообщение)
workoutHandler.callbackQuery('skip_reminder', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Напоминание пропущено' });
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Сообщение уже удалено
  }
});

// 4. На случай ввода команды /workout текстом
workoutHandler.command('workout', async (ctx) => {
  await ctx.conversation.enter('workoutConversation');
});