import { Composer } from 'grammy';
import { CustomContext } from '../context.js';
import { MenuScreen } from '../screens/menu.screen.js';
import { EasterEggService } from '../../services/easterEgg.service.js';

export const startHandler = new Composer<CustomContext>();

export async function handleGoToStart(ctx: CustomContext) {
  const chatId = ctx.chat?.id;
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'Атлет';

  console.log(`\n=== 🚀 [START HANDLER] Вход в handleGoToStart ===`);
  console.log(`👤 Пользователь: ${firstName} | telegramId: ${telegramId} (тип: ${typeof telegramId}) | chatId: ${chatId}`);

  // 1. Проверяем флаг первой регистрации из authMiddleware
  let isNewUser = false;
  if (ctx.session?.isJustRegistered) {
    isNewUser = true;
    ctx.session.isJustRegistered = undefined; // Сбрасываем флаг, чтобы сообщение не дублировалось
    console.log(`✨ [START HANDLER] Обнаружен флаг isJustRegistered = true!`);
  } else {
    console.log(`📦 [START HANDLER] Пользователь уже был зарегистрирован ранее.`);
  }

  // 2. Очищаем старое меню, если его ID сохранен в сессии
  if (chatId && ctx.session?.lastMenuMessageId) {
    console.log(`🧹 [START HANDLER] Удаляем старое меню (message_id: ${ctx.session.lastMenuMessageId})`);
    try {
      await ctx.api.deleteMessage(chatId, ctx.session.lastMenuMessageId);
    } catch (e) {
      console.log(`⚠️ [START HANDLER] Не удалось удалить старое меню из сессии`);
    }
    ctx.session.lastMenuMessageId = undefined;
  }

  // 3. Если переход был по Inline-кнопке ("go_to_menu" или "remind_close")
  if (ctx.callbackQuery) {
    console.log(`🖱️ [START HANDLER] Переход по CallbackQuery: ${ctx.callbackQuery.data}`);
    await ctx.answerCallbackQuery();
    if (chatId && ctx.callbackQuery.message?.message_id) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.callbackQuery.message.message_id);
      } catch {}
    }
  }

  // 4. Если пользователь написал текстом "/start"
  if (ctx.message) {
    console.log(`💬 [START HANDLER] Вызов через текстовую команду /start`);
    if (chatId && ctx.message.message_id) {
      try {
        await ctx.api.deleteMessage(chatId, ctx.message.message_id);
      } catch {}
    }

    // Удаляем висящую Reply-клавиатуру
    try {
      const removeMsg = await ctx.reply('...', {
        reply_markup: { remove_keyboard: true },
      });
      await ctx.api.deleteMessage(chatId!, removeMsg.message_id);
    } catch {}
  }

  // 5. Если это первая регистрация — отправляем приветствие или пасхалку
  if (isNewUser && telegramId) {
    console.log(`🎉 [START HANDLER] Генерируем приветственное сообщение / пасхалку...`);
    const welcomeText = EasterEggService.getRegistrationMessage(telegramId, firstName);
    console.log(`📝 [START HANDLER] Итоговый текст приветствия: "${welcomeText}"`);
    
    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
    console.log(`✅ [START HANDLER] Приветственное сообщение отправлено!`);
  } else {
    console.log(`ℹ️ [START HANDLER] Пропускаем отправку пасхалки регистраций (isNewUser = ${isNewUser}).`);
  }

  // 6. Отправляем свежее меню с Inline-кнопками
  console.log(`📲 [START HANDLER] Отправляем главное меню...`);
  const sentMessage = await ctx.reply(...MenuScreen.mainWelcome(firstName));

  if (ctx.session) {
    ctx.session.lastMenuMessageId = sentMessage.message_id;
  }

  console.log(`=== ✅ [START HANDLER] Завершено успешно ===\n`);
}

// Регистрируем обработчики
startHandler.command('start', handleGoToStart);
startHandler.callbackQuery('go_to_menu', handleGoToStart);