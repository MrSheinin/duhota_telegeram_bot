import { Conversation } from '@grammyjs/conversations';
import { CustomContext } from '../context.js';
import { WorkoutService, WorkingExercise } from '../../services/workout.service.js';
import { WorkoutProcessScreen } from '../screens/workoutProcess.screen.js';
import { MenuScreen } from '../screens/menu.screen.js';
import { parseWeightAndReps } from '../../utils/parser.js';
import { EasterEggService } from '../../services/easterEgg.service.js';

export type WorkoutProcessConversation = Conversation<CustomContext, CustomContext>;

export async function workoutProcessConversation(
  conversation: WorkoutProcessConversation,
  ctx: CustomContext,
  initialProgramId?: number
) {
  const chatId = ctx.chat?.id;
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'Атлет';
  const messagesToDelete: number[] = [];

  // --- Хелперы управления UI ---
  const replyAndTrack = async (...args: Parameters<typeof ctx.reply>) => {
    const msg = await ctx.reply(...args);
    messagesToDelete.push(msg.message_id);
    return msg;
  };

  const cleanupMessages = async () => {
    if (!chatId || messagesToDelete.length === 0) return;
    try {
      await ctx.api.deleteMessages(chatId, messagesToDelete);
    } catch {
      for (const id of messagesToDelete) {
        try {
          await ctx.api.deleteMessage(chatId, id);
        } catch {}
      }
    }
  };

  const deleteUserMsg = async (userCtx: CustomContext) => {
    if (userCtx.chat && userCtx.message?.message_id) {
      try {
        await userCtx.api.deleteMessage(userCtx.chat.id, userCtx.message.message_id);
      } catch {}
    }
  };

  // 1. Извлекаем programId
  const sessionProgramId = await conversation.external(() => ctx.session?.activeProgramId);
  const programId = initialProgramId ?? sessionProgramId;

  if (!programId) {
    await ctx.reply('❌ Ты чё, сука, без программы качаться собрался?! Не выбрана программа для тренировки, нахуй!');
    return;
  }

  await conversation.external(() => {
    if (ctx.session) {
      ctx.session.activeProgramId = programId;
    }
  });

  // READ PHASE
  let workingExercises: WorkingExercise[] = [];
  try {
    workingExercises = await conversation.external(() =>
      WorkoutService.getInitialWorkoutData(programId)
    );
  } catch {
    await ctx.reply('❌ Всё накрылось пиздой при загрузке программы! Попробуй ещё раз, блядь.');
    return;
  }

  // EDIT PHASE
  const totalCount = workingExercises.length;
  let i = 0;

  while (i >= 0 && i < totalCount) {
    const currentEx = workingExercises[i];
    const currentIndex = i + 1;

    const [screenText, screenOptions] = WorkoutProcessScreen.activeExercise(
      currentEx,
      currentIndex,
      totalCount
    );
    const activeCardMsg = await replyAndTrack(screenText, screenOptions);

    let stepActive = true;
    while (stepActive) {
      const stepCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

      // 1. Отмена тренировки
      if (stepCtx.callbackQuery?.data === 'cancel_flow') {
        await stepCtx.answerCallbackQuery({ text: 'Слился с тренировки, блядь' });
        await cleanupMessages();
        
        // Отправляем чистые варианты главного меню после отмены
        const sentMsg = await ctx.reply(...MenuScreen.mainWelcome(firstName));
        await conversation.external(() => {
          if (ctx.session) ctx.session.lastMenuMessageId = sentMsg.message_id;
        });
        return;
      }

      // 2. Предыдущее упражнение
      if (stepCtx.callbackQuery?.data === 'prev_exercise') {
        await stepCtx.answerCallbackQuery();
        if (i > 0) {
          i--;
          stepActive = false;
          break;
        }
      }

      // 3. Следующее упражнение / Завершение
      if (stepCtx.callbackQuery?.data === 'finish_exercise') {
        await stepCtx.answerCallbackQuery();
        i++;
        stepActive = false;
        break;
      }

      // 4. Добавить подход (копирование последнего)
      if (stepCtx.callbackQuery?.data === 'add_set') {
        await stepCtx.answerCallbackQuery();
        const lastSet = currentEx.sets[currentEx.sets.length - 1];
        currentEx.sets.push({
          exerciseId: currentEx.exerciseId,
          setNumber: currentEx.sets.length + 1,
          weight: lastSet ? lastSet.weight : 0,
          reps: lastSet ? lastSet.reps : 0,
        });
      }

      // 5. Удаление подхода (Запрос номера)
      if (stepCtx.callbackQuery?.data === 'delete_set') {
        await stepCtx.answerCallbackQuery();
        if (currentEx.sets.length === 0) {
          continue;
        }

        const deletePrompt = await replyAndTrack(
          ...WorkoutProcessScreen.promptDeleteSet(currentEx.sets.length)
        );

        const deleteInputCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

        if (deleteInputCtx.message?.text) {
          await deleteUserMsg(deleteInputCtx);
          const setNumToDelete = parseInt(deleteInputCtx.message.text.trim(), 10);

          if (!isNaN(setNumToDelete) && setNumToDelete >= 1 && setNumToDelete <= currentEx.sets.length) {
            currentEx.sets.splice(setNumToDelete - 1, 1);
            currentEx.sets.forEach((s, idx) => {
              s.setNumber = idx + 1;
            });
          }
        } else if (deleteInputCtx.callbackQuery?.data === 'cancel_edit') {
          await deleteInputCtx.answerCallbackQuery({ text: 'Отменил удаление' });
        }

        try {
          await ctx.api.deleteMessage(chatId!, deletePrompt.message_id);
        } catch {}
      }

      // 6. Нажатие кнопки "Изменить N"
      if (stepCtx.callbackQuery?.data.startsWith('edit_set:')) {
        await stepCtx.answerCallbackQuery();
        const setNumber = parseInt(stepCtx.callbackQuery.data.split(':')[1], 10);
        const targetSet = currentEx.sets[setNumber - 1];

        const editPrompt = await replyAndTrack(
          ...WorkoutProcessScreen.promptEditSet(setNumber, targetSet)
        );

        const editInputCtx = await conversation.waitFor(['message:text', 'callback_query:data']);

        if (editInputCtx.message?.text) {
          await deleteUserMsg(editInputCtx);
          const parsed = parseWeightAndReps(editInputCtx.message.text.trim());

          if (parsed && targetSet) {
            targetSet.weight = parsed.weight;
            targetSet.reps = parsed.reps;
          }
        } else if (editInputCtx.callbackQuery?.data === 'cancel_edit') {
          await editInputCtx.answerCallbackQuery({ text: 'Отменил изменение' });
        }

        try {
          await ctx.api.deleteMessage(chatId!, editPrompt.message_id);
        } catch {}
      }

      // Удаление любых текстов вне режима редактирования
      if (stepCtx.message?.text) {
        await deleteUserMsg(stepCtx);
      }

      // Перерисовка карточки
      const [updatedText, updatedOptions] = WorkoutProcessScreen.activeExercise(
        currentEx,
        currentIndex,
        totalCount
      );

      try {
        await ctx.api.editMessageText(
          chatId!,
          activeCardMsg.message_id,
          updatedText,
          updatedOptions
        );
      } catch {}
    }
  }

  // WRITE PHASE
  try {
    await conversation.external(() =>
      WorkoutService.saveWorkoutSession(programId, workingExercises)
    );

    const program = await conversation.external(() =>
      WorkoutService.getProgramById(programId)
    );

    const workoutTitle = program?.name || 'Тренировка';

    // 1. Очищаем карточки процесса тренировки
    await cleanupMessages();

    // 2. Генерируем пасхалку или стандартное сообщение
    let completionText = '';
    if (telegramId) {
      completionText = EasterEggService.getWorkoutCompletedMessage(telegramId, workoutTitle);
    } else {
      const totalSets = workingExercises.reduce((acc, ex) => acc + ex.sets.length, 0);
      completionText = `🎉 **Тренировка "${workoutTitle}" закончена, блядь!**\n\nВыполнено упражнений: ${workingExercises.length} | Подходов: ${totalSets}\n\nТы хоть вспотел, сука, или просто беседовал?! Иди жри кашу, нахуй!`;
    }

    // 3. Отправляем Главное Меню с пасхалкой в заголовке
    const menuMessage = await ctx.reply(...MenuScreen.mainWelcome(firstName, completionText));

    // 4. Запоминаем ID меню в сессии
    await conversation.external(() => {
      if (ctx.session) {
        ctx.session.lastMenuMessageId = menuMessage.message_id;
      }
    });

  } catch {
    await cleanupMessages();
    await ctx.reply('❌ Всё сгорело нахуй при сохранении результатов! Ты даже тренировку нормально закончить не можешь, блядь!');
  }
}