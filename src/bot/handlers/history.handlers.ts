import { Composer, InputFile } from 'grammy';
import { CustomContext } from '../context.js';
import { HistoryService, HistoryPeriod } from '../../services/history.service.js';
import { HistoryScreen } from '../screens/history.screen.js';
import { ExcelService } from '../../services/excel.service.js';
import { escapeMarkdown } from '../../utils/markdown.js';

export const historyComposer = new Composer<CustomContext>();

/**
 * Хранилище ID последнего отправленного Excel-сообщения.
 * Ключ: telegramId, Значение: message_id файла в чате.
 */
const userLastExcelMessageMap = new Map<number, number>();

/**
 * Безопасное редактирование сообщения для предотвращения ошибки
 * "400: Bad Request: message is not modified"
 */
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

/**
 * Форматирует дату в формат ДД.ММ.ГГГГ с учётом временной зоны Риги
 */
function formatDateForFilename(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Riga',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('ru-RU', options).format(date);
}

/**
 * Генерирует понятное имя файла Excel с диапазоном дат
 */
function getPeriodFilename(period: HistoryPeriod): string {
  const endDateStr = formatDateForFilename(new Date());
  const startDate = HistoryService.getStartDate(period);

  const startDateStr = startDate
    ? formatDateForFilename(startDate)
    : 'AllTime';

  return `Workout_History_${startDateStr}_-_${endDateStr}.xlsx`;
}

// 1. Вход в меню "История"
historyComposer.hears('📊 История', async (ctx) => {
  const [text, options] = HistoryScreen.main();
  await ctx.reply(text, options);
});

historyComposer.callbackQuery('hist_main', async (ctx) => {
  await ctx.answerCallbackQuery();
  const [text, options] = HistoryScreen.main();
  await safeEditMessageText(ctx, text, options);
});

// 2. Выбор действия (Просмотр / Экспорт)
historyComposer.callbackQuery('hist_view_period', async (ctx) => {
  await ctx.answerCallbackQuery();
  const [text, options] = HistoryScreen.viewPeriodSelect();
  await safeEditMessageText(ctx, text, options);
});

historyComposer.callbackQuery('hist_export_period', async (ctx) => {
  await ctx.answerCallbackQuery();
  const [text, options] = HistoryScreen.exportPeriodSelect();
  await safeEditMessageText(ctx, text, options);
});

// 3. Список тренировок за период
historyComposer.callbackQuery(/^hist_list:(week|month|year|all)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const period = ctx.match[1] as HistoryPeriod;
  const workouts = await HistoryService.getWorkoutList(telegramId, period);

  const [text, options] = HistoryScreen.workoutList(workouts, period);
  await safeEditMessageText(ctx, text, options);
});

// 4. Карточка тренировки
historyComposer.callbackQuery(/^hist_details:(\d+):(week|month|year|all)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  const sessionId = parseInt(ctx.match[1], 10);
  const period = ctx.match[2] as HistoryPeriod;

  const sessionDetails = await HistoryService.getWorkoutDetails(sessionId, telegramId);
  if (!sessionDetails) {
    await ctx.reply('❌ *Слышь, ебать\\!* Тренировка не найдена, сука\\. Либо ты её проебал, либо в базе хуйня какая\\-то произошла\\!');
    return;
  }

  const [text, options] = HistoryScreen.workoutDetails(sessionDetails, period);
  await safeEditMessageText(ctx, text, options);
});

// 5. Экспорт в Excel (с заменой старого файла и очисткой чата)
historyComposer.callbackQuery(/^hist_download:(week|month|year|all)$/, async (ctx) => {
  const telegramId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!telegramId || !chatId) return;

  const period = ctx.match[1] as HistoryPeriod;

  // Быстрая проверка наличия тренировок
  const workouts = await HistoryService.getWorkoutList(telegramId, period);
  if (workouts.length === 0) {
    await ctx.answerCallbackQuery({
      text: 'Ты чё, сука, завоздушился?! За этот период ни одной тренировки нет, хера ли ты пиздишь, бля, нахуй?!',
      show_alert: true,
    });
    return;
  }

  await ctx.answerCallbackQuery({ text: '⏳ Генерирую тебе Excel, блядь, подожди секунду...' });

  try {
    const excelBuffer = await ExcelService.generateExportBuffer(telegramId, period);
    const fileName = getPeriodFilename(period);
    const inputFile = new InputFile(excelBuffer, fileName);

    // Удаляем прошлый отправленный Excel-файл, если он существует в чате
    const previousMessageId = userLastExcelMessageMap.get(telegramId);
    if (previousMessageId) {
      try {
        await ctx.api.deleteMessage(chatId, previousMessageId);
      } catch (e) {
        // Сообщение уже могло быть удалено пользователем вручную
      }
    }

    // Использование внешнего модуля utils/markdown.ts для безопасного вывода
    const safeFileName = escapeMarkdown(fileName);

    const sentMessage = await ctx.replyWithDocument(inputFile, {
      caption: `📊 *На, держи свой отчёт по тренировкам, блядь\\!*\n📁 Файл: \`${safeFileName}\`\n\nСмотри, сколько ты отпахал, и только попробуй сдуться, сука\\!`,
      parse_mode: 'MarkdownV2',
    });

    // Запоминаем ID отправленного документа
    userLastExcelMessageMap.set(telegramId, sentMessage.message_id);

  } catch (err) {
    console.error('[ExcelExport] Ошибка отправки файла:', err);
    await ctx.reply('❌ *Слышь, блядь\\!* Ошибка при генерации файла\\. Сервер походу от твоих показателей в охуе сука, попробуй позже\\!');
  }
});