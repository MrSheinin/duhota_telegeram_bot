import { Conversation } from '@grammyjs/conversations';
import { CustomContext } from '../context.js';
import { reminderService } from '../../services/reminder.service.js';
import { ReminderFormatter } from '../../utils/reminder.formatter.js';
import { ReminderKeyboard } from '../keyboards/reminder.keyboards.js';

export type SetReminderTimeConversation = Conversation<CustomContext, CustomContext>;

function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

// Вспомогательная функция для безопасного удаления сообщений
async function safeDeleteMessage(ctx: CustomContext, chatId: number, messageId: number) {
  try {
    await ctx.api.deleteMessage(chatId, messageId);
  } catch (e) {
    // Игнорируем ошибки (если сообщение уже удалено пользователем)
  }
}

export async function setReminderTimeConversation(
  conversation: SetReminderTimeConversation,
  ctx: CustomContext,
  dayOfWeek: number
) {
  const telegramId = ctx.from?.id;

  if (!dayOfWeek || !telegramId) {
    console.error(`[CONVERSATION ERROR] dayOfWeek (${dayOfWeek}) или telegramId (${telegramId}) отсутствуют!`);
    await ctx.reply('❌ *Слышь, хуйня какая-то произошла\\!* Не удалось день недели определить, блядь\\. Давай по-новой из меню заходи, сука\\!', {
      parse_mode: 'MarkdownV2',
    });
    return;
  }

  // Исправлено: добавлены экранирования и закрывающий символ "_" для курсива
  const promptText =
    `✏️ *Введи время напоминания, нахуй*\n\n` +
    `Формат строго: \`HH:MM\` \\(например, \`18:30\` или \`09:00\`\\)\n\n` +
    `_Отправь /cancel если сдулся как болван ебаный_`;

  const promptMessage = await ctx.reply(promptText, {
    parse_mode: 'MarkdownV2',
    reply_markup: ReminderKeyboard.cancelInput(),
  });

  while (true) {
    const eventCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

    const isCancelCallback = eventCtx.callbackQuery?.data === 'remind_cancel_input';
    const isCancelCommand = eventCtx.message?.text === '/cancel' || eventCtx.message?.text === '❌ Отмена';

    // 1. Обработка отмены (Inline-кнопка или Текст/Команда)
    if (isCancelCallback || isCancelCommand) {
      console.log('[CONVERSATION] Ввод времени отменён пользователем.');

      if (eventCtx.callbackQuery) {
        await eventCtx.answerCallbackQuery({ text: 'Слился с ввода времени' });
      }

      // Удаляем промпт бота
      await safeDeleteMessage(eventCtx, eventCtx.chat!.id, promptMessage.message_id);

      // Если пользователь прислал текст/команду для отмены, удаляем и его сообщение
      if (eventCtx.message) {
        await safeDeleteMessage(eventCtx, eventCtx.chat!.id, eventCtx.message.message_id);
      }

      const settings = await conversation.external(() =>
        reminderService.getOrCreateUserSettings(telegramId)
      );

      await eventCtx.reply(ReminderFormatter.formatMainMenu(settings), {
        parse_mode: 'MarkdownV2',
        reply_markup: ReminderKeyboard.mainMenu(settings),
      });

      return;
    }

    // 2. Обработка ввода времени
    if (eventCtx.message?.text) {
      const inputTime = eventCtx.message.text.trim();
      const userMessageId = eventCtx.message.message_id;

      if (isValidTimeFormat(inputTime)) {
        console.log(`[CONVERSATION] Валидный формат: "${inputTime}". Сохранение в БД...`);

        const settings = await conversation.external(() =>
          reminderService.getOrCreateUserSettings(telegramId)
        );

        await conversation.external(() =>
          reminderService.upsertSchedule(settings.id, dayOfWeek, inputTime)
        );

        const updatedSettings = await conversation.external(() =>
          reminderService.getOrCreateUserSettings(telegramId)
        );

        // Чистим чат: удаляем промпт бота и сообщение пользователя с введенным временем
        await safeDeleteMessage(eventCtx, eventCtx.chat!.id, promptMessage.message_id);
        await safeDeleteMessage(eventCtx, eventCtx.chat!.id, userMessageId);

        const menuText =
          `✅ *Запомнил твоё время, блядь\\! Хуй ты проебешь тренировку, сука, нахуй\\!*\n\n` +
          ReminderFormatter.formatMainMenu(updatedSettings);

        await eventCtx.reply(menuText, {
          parse_mode: 'MarkdownV2',
          reply_markup: ReminderKeyboard.mainMenu(updatedSettings),
        });

        return;
      } else {
        // Удаляем сообщение с невалидным вводом пользователя
        await safeDeleteMessage(eventCtx, eventCtx.chat!.id, userMessageId);

        const errorText =
          `❌ *Ты чё за херню ввёл, блядь\\?!*\n\n` +
          `По-человечески вводи, в формате \`HH:MM\` \\(например, \`19:30\`\\)\\.\n\n` +
          `_Отправь /cancel если сдулся как болван ебаный_`;

        try {
          await eventCtx.api.editMessageText(
            eventCtx.chat!.id,
            promptMessage.message_id,
            errorText,
            {
              parse_mode: 'MarkdownV2',
              reply_markup: ReminderKeyboard.cancelInput(),
            }
          );
        } catch (e) {
          // Fallback на случай, если сообщение отредактировать не удалось
          await eventCtx.reply(errorText, {
            parse_mode: 'MarkdownV2',
            reply_markup: ReminderKeyboard.cancelInput(),
          });
        }
      }
    }
  }
}