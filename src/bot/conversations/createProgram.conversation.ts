import { InlineKeyboard } from 'grammy';
import { Conversation } from '@grammyjs/conversations';
import { CustomContext } from '../context.js';
import { WorkoutService, ExerciseInput } from '../../services/workout.service.js';
import { parseWeightAndReps } from '../../utils/parser.js';
import { CreateProgramScreen } from '../screens/createProgram.screen.js';
import { UserService } from '../../services/user.service.js';

export type CreateProgramConversation = Conversation<CustomContext, CustomContext>;

export async function createProgramConversation(
  conversation: CreateProgramConversation,
  ctx: CustomContext
) {

  if (ctx.message?.message_id && ctx.chat?.id) {
    try {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    } catch {}
  }

  const messagesToDelete: number[] = [];

  const replyAndTrack = async (...args: Parameters<typeof ctx.reply>) => {
    const msg = await ctx.reply(...args);
    messagesToDelete.push(msg.message_id);
    return msg;
  };

  const cleanupMessages = async () => {
    if (messagesToDelete.length === 0) return;
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      await ctx.api.deleteMessages(chatId, messagesToDelete);
    } catch {
      for (const msgId of messagesToDelete) {
        try {
          await ctx.api.deleteMessage(chatId, msgId);
        } catch {}
      }
    }
  };

  const deleteUserMessage = async (userCtx: CustomContext) => {
    if (userCtx.chat && userCtx.message?.message_id) {
      try {
        await userCtx.api.deleteMessage(userCtx.chat.id, userCtx.message.message_id);
      } catch {}
    }
  };

  // Кнопка для возврата в меню
  const menuKeyboard = new InlineKeyboard().text('🏠 В главное меню', 'go_to_menu');

  // 1. Авторизация
  let userId = await conversation.external(() => ctx.session?.dbUserId);

  if (!userId && ctx.from) {
    const telegramId = ctx.from.id;
    const user = await conversation.external(() =>
      UserService.getOrCreateUser({
        id: telegramId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name || 'User',
      })
    );
    userId = user.id;

    await conversation.external(() => {
      if (ctx.session) ctx.session.dbUserId = userId;
    });
  }

  if (!userId) {
    await ctx.reply('⚠️ Ты кто такой вообще, блядь, нахуй? Не удалось пользователя определить. Жми /start, сука, и не еби мне мозги!');
    return;
  }

  // --- ШАГ 1. Название программы ---
  let programName = '';
  let isNameValid = false;

  while (!isNameValid) {
    await replyAndTrack(...CreateProgramScreen.askProgramName());

    const nameUpdateCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

    if (nameUpdateCtx.callbackQuery?.data === 'cancel_flow') {
      await nameUpdateCtx.answerCallbackQuery({ text: 'Отменено' });
      await cleanupMessages();
      await ctx.reply('🚫 Создание программы отменено, блядь. Ну и хер с ним, сиди дальше ровно на жопе, нахуй. Вспомнишь потом, когда поздно будет, сука.', { reply_markup: menuKeyboard });
      return;
    }

    if (nameUpdateCtx.message) {
      await deleteUserMessage(nameUpdateCtx);
    }

    const inputName = nameUpdateCtx.message?.text?.trim() || '';
    if (['/cancel', 'отмена'].includes(inputName.toLowerCase())) {
      await cleanupMessages();
      await ctx.reply('🚫 Создание программы отменено, блядь. Ну и хер с ним, сиди дальше ровно на жопе, нахуй. Вспомнишь потом, когда поздно будет, сука.', { reply_markup: menuKeyboard });
      return;
    }

    if (!inputName) {
      continue;
    }

    const exists = await conversation.external(() =>
      WorkoutService.isProgramNameExists(userId, inputName)
    );

    if (exists) {
      await replyAndTrack(`⚠️ Программа с названием "${inputName}" уже существует! Придумай другое название, блядь!`);
    } else {
      programName = inputName;
      isNameValid = true;
    }
  }

  const exercises: ExerciseInput[] = [];
  let addingExercises = true;

  // --- ШАГ 2. Цикл по упражнениям ---
  while (addingExercises) {
    const currentOrder = exercises.length + 1;
    await replyAndTrack(...CreateProgramScreen.askExerciseName(currentOrder));

    const exNameCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

    if (exNameCtx.callbackQuery?.data === 'cancel_flow') {
      await exNameCtx.answerCallbackQuery({ text: 'Отменено' });
      await cleanupMessages();
      await ctx.reply('🚫 Создание программы отменено, блядь. Ну и хер с ним, сиди дальше ровно на жопе, нахуй. Вспомнишь потом, когда поздно будет, сука.', { reply_markup: menuKeyboard });
      return;
    }

    if (exNameCtx.message) {
      await deleteUserMessage(exNameCtx);
    }

    const exerciseName = exNameCtx.message?.text?.trim() || '';
    if (['/cancel', 'отмена'].includes(exerciseName.toLowerCase())) {
      await cleanupMessages();
      await ctx.reply('🚫 Создание программы отменено, блядь. Ну и хер с ним, сиди дальше ровно на жопе, нахуй. Вспомнишь потом, когда поздно будет, сука.', { reply_markup: menuKeyboard });
      return;
    }

    const currentSets: { setNumber: number; weight: number; reps: number }[] = [];

    // --- ШАГ 3. Ввод подходов (In-place Editing) ---
    const [screenText, screenOptions] = CreateProgramScreen.askSets(exerciseName, currentSets);
    const exerciseMsg = await replyAndTrack(screenText, screenOptions);

    let addingSets = true;
    while (addingSets) {
      const setCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

      if (setCtx.callbackQuery?.data === 'cancel_flow') {
        await setCtx.answerCallbackQuery({ text: 'Создание отменено' });
        await cleanupMessages();
        await ctx.reply('🚫 Создание программы отменено, блядь. Ну и хер с ним, сиди дальше ровно на жопе, нахуй. Вспомнишь потом, когда поздно будет, сука.', { reply_markup: menuKeyboard });
        return;
      }

      if (setCtx.callbackQuery?.data === 'finish_exercise') {
        await setCtx.answerCallbackQuery({ text: 'Упражнение готово, блядь!' });
        addingSets = false;
        break;
      }

      if (setCtx.message?.text) {
        const text = setCtx.message.text.trim();
        const chatId = setCtx.chat.id;

        await deleteUserMessage(setCtx);

        if (['/cancel', 'отмена'].includes(text.toLowerCase())) {
          await cleanupMessages();
          await ctx.reply('🚫 Сдался баран блять ебаный, ну и хуй с тобой', { reply_markup: menuKeyboard });
          return;
        }

        const parsed = parseWeightAndReps(text);

        if (parsed) {
          currentSets.push({
            setNumber: currentSets.length + 1,
            weight: parsed.weight,
            reps: parsed.reps,
          });

          const [updatedText, updatedOptions] = CreateProgramScreen.askSets(exerciseName, currentSets);
          try {
            await setCtx.api.editMessageText(
              chatId,
              exerciseMsg.message_id,
              updatedText,
              updatedOptions
            );
          } catch (err: any) {
            if (!err?.description?.includes('message is not modified')) {
              console.error('[SETS LOOP] Ошибка editMessageText:', err?.description || err);
            }
          }
        }
      }
    }

    exercises.push({
      name: exerciseName,
      displayOrder: currentOrder,
      sets: currentSets,
    });

    // --- ШАГ 4. Развилка ---
    await replyAndTrack(...CreateProgramScreen.askNextStep(exercises.length));

    const nextStepCtx = await conversation.waitFor('callback_query:data');

    if (nextStepCtx.callbackQuery?.data === 'cancel_flow') {
      await nextStepCtx.answerCallbackQuery({ text: 'Отменено' });
      await cleanupMessages();
      await ctx.reply('🚫 Сдался баран блять ебаный, ну и хуй с тобой', { reply_markup: menuKeyboard });
      return;
    }

    await nextStepCtx.answerCallbackQuery();

    if (nextStepCtx.callbackQuery.data === 'save_program') {
      addingExercises = false;
    }
  }

  // --- ШАГ 5. Сохранение ---
  if (exercises.length === 0) {
    await cleanupMessages();
    await ctx.reply('⚠️ Ты чё, сука, пустую программу сохранить решил?! Ни одного упражнения не добавил и жмёшь! В зал иди вьёбывать, а не пустые кнопки тыкать!', { reply_markup: menuKeyboard });
    return;
  }

  try {
    const program = await conversation.external(() =>
      WorkoutService.createProgram(userId, programName, exercises)
    );

    await cleanupMessages();
    const [successText] = CreateProgramScreen.success(program.name);
    await ctx.reply(successText, { reply_markup: menuKeyboard });
  } catch (error) {
    console.error('[CONVERSATION] Ошибка сохранения программы:', error);
    await cleanupMessages();
    await ctx.reply('💥 Всё нахуй сгорело при сохранении! Ты даже программу без лагов сохранить не можешь, блядь, у тебя что, вместо пальцев грабли?! Давай ещё раз пробуй, сука!', { reply_markup: menuKeyboard });
  }
}