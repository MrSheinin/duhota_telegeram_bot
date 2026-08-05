import { Bot, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';

import { env } from '../config/env.js';
import { CustomContext, SessionData } from './context.js';

import { authMiddleware } from './middlewares/auth.middleware.js';
import { startHandler } from './handlers/start.handler.js';
import { createProgramHandler } from './handlers/createProgram.handler.js';
import { workoutHandler } from './handlers/workout.handler.js';
import { historyComposer } from './handlers/history.handlers.js';
import { reminderComposer } from './handlers/reminder.handlers.js';

import { createProgramConversation } from './conversations/createProgram.conversation.js';
import { workoutConversation } from './conversations/workout.conversation.js';
import { workoutProcessConversation } from './conversations/workoutProcess.conversation.js';
import { setReminderTimeConversation } from './conversations/reminder.conversation.js';

export const bot = new Bot<CustomContext>(env.BOT_TOKEN);

// 1. Подключение сессии
bot.use(
  session<SessionData, CustomContext>({
    initial: () => ({
      dbUserId: undefined,
      activeProgramId: undefined,
      selectedDayOfWeek: undefined,
      lastMenuMessageId: undefined,
      isJustRegistered: undefined, // 👈 Инициализируем поле
    }),
    getSessionKey: (ctx) => ctx.from?.id.toString(),
  })
);

// 2. AuthMiddleware
bot.use(authMiddleware);

// 3. Conversations (регистрируем перед хэндлерами)
bot.use(conversations());
bot.use(createConversation(createProgramConversation));
bot.use(createConversation(workoutConversation));
bot.use(createConversation(workoutProcessConversation));
bot.use(createConversation(setReminderTimeConversation));

// 4. Handlers (startHandler идет первым)
bot.use(startHandler);
bot.use(createProgramHandler);
bot.use(workoutHandler);
bot.use(historyComposer);
bot.use(reminderComposer);

// 5. Обработка ошибок
bot.catch((err) => {
  console.error('❌ Ошибка в работе бота:', err);
});