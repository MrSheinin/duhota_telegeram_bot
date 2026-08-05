import { Composer } from 'grammy';
import { CustomContext } from '../context.js';

export const createProgramHandler = new Composer<CustomContext>();

// Реакция на команду /create_program
createProgramHandler.command('create_program', async (ctx) => {
  await ctx.conversation.enter('createProgramConversation');
});

// Реакция на Inline-кнопку "➕ Создать программу"
createProgramHandler.callbackQuery('create_program', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('createProgramConversation');
});