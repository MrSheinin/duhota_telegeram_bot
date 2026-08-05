import { Conversation } from '@grammyjs/conversations';
import { CustomContext } from '../context.js';
import { WorkoutService } from '../../services/workout.service.js';
import { WorkoutScreen } from '../screens/workout.screens.js';
import { UserService } from '../../services/user.service.js';
import { workoutProcessConversation } from './workoutProcess.conversation.js';

export type WorkoutConversation = Conversation<CustomContext, CustomContext>;

export async function workoutConversation(
  conversation: WorkoutConversation,
  ctx: CustomContext
) {
  const chatId = ctx.chat?.id;
  const messagesToDelete: number[] = [];

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

  // 1. Очищаем прошлый UI меню
  const lastMenuId = await conversation.external(() => ctx.session?.lastMenuMessageId);
  if (chatId && lastMenuId) {
    try {
      await ctx.api.deleteMessage(chatId, lastMenuId);
    } catch {}
    await conversation.external(() => {
      if (ctx.session) ctx.session.lastMenuMessageId = undefined;
    });
  }

  // 2. Авторизация
  let userId = await conversation.external(() => ctx.session?.dbUserId);
  if (!userId && ctx.from) {
    const user = await conversation.external(() =>
      UserService.getOrCreateUser({
        id: ctx.from!.id,
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
    console.error('❌ [WorkoutConv] Не найден userId');
    await ctx.reply('⚠️ Ты кто такой вообще, блядь, нахуй? Пользователя определить не удалось. Жми /start, сука!');
    return;
  }

  let activeMessageId: number | null = null;

  while (true) {
    // 3. Получаем программы
    const programs = await conversation.external(() =>
      WorkoutService.getUserPrograms(userId)
    );

    console.log(`🔍 [WorkoutConv] Найдено программ для userId ${userId}:`, programs.length);

    if (programs.length === 0) {
      await cleanupMessages();
      await ctx.reply(...WorkoutScreen.noPrograms());
      return;
    }

    // 4. Отрисовываем или обновляем карточку
    if (!activeMessageId) {
      const msg = await replyAndTrack(...WorkoutScreen.selectProgram(programs));
      activeMessageId = msg.message_id;
    } else {
      const [text, options] = WorkoutScreen.selectProgram(programs);
      try {
        await ctx.api.editMessageText(chatId!, activeMessageId, text, options);
      } catch {}
    }

    // 5. Ожидаем действия
    console.log('⏳ [WorkoutConv] Ожидаем callback_query:data от пользователя...');
    const programCtx = await conversation.waitFor('callback_query:data');
    const action = programCtx.callbackQuery.data;

    console.log('👉 [WorkoutConv] Получен action:', action);

    // Отмена процесса
    if (action === 'cancel_flow') {
      await programCtx.answerCallbackQuery({ text: 'Отменено' });
      await cleanupMessages();
      await ctx.reply(...WorkoutScreen.cancelled());
      return;
    }

    // Старт конкретной тренировки
    if (action.startsWith('select_program:')) {
      await programCtx.answerCallbackQuery();
      const rawId = action.split(':')[1];
      const programId = Number(rawId);

      console.log(`🎯 [WorkoutConv] Выбрана программа ID: ${programId}`);

      await cleanupMessages();

      await conversation.external(() => {
        if (programCtx.session) programCtx.session.activeProgramId = programId;
        if (ctx.session) ctx.session.activeProgramId = programId;
      });

      return await workoutProcessConversation(conversation, programCtx, programId);
    }

    // Запрос на удаление программы
    if (action.startsWith('delete_program:')) {
      await programCtx.answerCallbackQuery();
      const programId = Number(action.split(':')[1]);
      const prog = programs.find((p) => p.id === programId);

      if (prog) {
        const [confirmText, confirmOptions] = WorkoutScreen.confirmDelete(programId, prog.name);
        try {
          await ctx.api.editMessageText(chatId!, activeMessageId, confirmText, confirmOptions);
        } catch {}
      }
      continue;
    }

    // Подтверждение удаления программы
    if (action.startsWith('confirm_delete:')) {
      await programCtx.answerCallbackQuery({ text: 'Программа удалена' });
      const programId = Number(action.split(':')[1]);

      await conversation.external(() => WorkoutService.deleteProgram(programId));
      console.log(`🗑️ [WorkoutConv] Заархивирована программа ID: ${programId}`);

      // Заставляем перерисовать оставшиеся программы
      continue;
    }

    console.warn('⚠️ [WorkoutConv] Нажат неизвестный action:', action);
  }
}