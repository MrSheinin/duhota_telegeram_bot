import { Composer } from 'grammy';
import { CustomContext } from '../context.js';
import { reminderService } from '../../services/reminder.service.js';
import { ReminderFormatter } from '../../utils/reminder.formatter.js';
import { ReminderKeyboard } from '../keyboards/reminder.keyboards.js';
import { handleGoToStart } from './start.handler.js';

export const reminderComposer = new Composer<CustomContext>();

async function safeEditMessageText(ctx: CustomContext, text: string, options: any) {
  try {
    await ctx.editMessageText(text, options);
  } catch (error: any) {
    if (error?.description?.includes('message is not modified')) {
      return;
    }
    throw error;
  }
}

// 1. Вход в настройки по текстовой кнопке
reminderComposer.hears('⏰ Напоминания', async (ctx) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const settings = await reminderService.getOrCreateUserSettings(telegramId);
  const text = ReminderFormatter.formatMainMenu(settings);

  await ctx.reply(text, {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.mainMenu(settings),
  });
});

// 2. Вход/Возврат по инлайн-кнопкам
reminderComposer.callbackQuery(['remind_main', 'view_reminders'], async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const settings = await reminderService.getOrCreateUserSettings(telegramId);
  const text = ReminderFormatter.formatMainMenu(settings);

  await safeEditMessageText(ctx, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.mainMenu(settings),
  });
});

// 3. Тумблер Вкл/Выкл
reminderComposer.callbackQuery(/^remind_toggle:(true|false)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const newStatus = ctx.match[1] === 'true';
  await reminderService.toggleReminders(telegramId, newStatus);

  const settings = await reminderService.getOrCreateUserSettings(telegramId);
  const text = ReminderFormatter.formatMainMenu(settings);

  await safeEditMessageText(ctx, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.mainMenu(settings),
  });
});

// 4. Выбор дня недели
reminderComposer.callbackQuery(/^remind_day:([1-7])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const dayOfWeek = parseInt(ctx.match[1], 10);

  const settings = await reminderService.getOrCreateUserSettings(telegramId);
  const existingSchedule = settings.schedules.find((s) => s.dayOfWeek === dayOfWeek);

  if (existingSchedule) {
    const text = ReminderFormatter.formatDayManage(dayOfWeek, existingSchedule.time);
    await safeEditMessageText(ctx, text, {
      parse_mode: 'MarkdownV2',
      reply_markup: ReminderKeyboard.dayManage(dayOfWeek),
    });
  } else {
    await ctx.conversation.enter('setReminderTimeConversation', dayOfWeek);
  }
});

// 5. Перезапуск ввода времени (из экрана управления)
reminderComposer.callbackQuery(/^remind_set_time:([1-7])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const dayOfWeek = parseInt(ctx.match[1], 10);

  await ctx.conversation.enter('setReminderTimeConversation', dayOfWeek);
});

// 6. Удаление расписания
reminderComposer.callbackQuery(/^remind_delete_day:([1-7])$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const dayOfWeek = parseInt(ctx.match[1], 10);
  const settings = await reminderService.getOrCreateUserSettings(telegramId);

  await reminderService.deleteSchedule(settings.id, dayOfWeek);

  const updatedSettings = await reminderService.getOrCreateUserSettings(telegramId);
  const text = ReminderFormatter.formatMainMenu(updatedSettings);

  await safeEditMessageText(ctx, text, {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.mainMenu(updatedSettings),
  });
});

// 7. Fallback для кнопки отмены (если нажата вне активного conversation)
reminderComposer.callbackQuery('remind_cancel_input', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Ввод отменён' });
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Сообщение уже удалено
  }

  const settings = await reminderService.getOrCreateUserSettings(telegramId);
  await ctx.reply(ReminderFormatter.formatMainMenu(settings), {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.mainMenu(settings),
  });
});

// 8. Возврат в главное меню из настроек напоминаний
reminderComposer.callbackQuery('remind_close', async (ctx) => {
  await handleGoToStart(ctx);
});