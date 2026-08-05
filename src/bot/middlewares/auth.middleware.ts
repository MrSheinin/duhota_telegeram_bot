import { NextFunction } from 'grammy';
import { CustomContext } from '../context.js';
import { UserService } from '../../services/user.service.js';

export async function authMiddleware(ctx: CustomContext, next: NextFunction) {
  // Убеждаемся, что сессия инициализирована
  if (!ctx.session) {
    await next();
    return;
  }

  // Если dbUserId нет в сессии, но есть данные пользователя Telegram
  if (!ctx.session.dbUserId && ctx.from) {
    try {
      // 1. Проверяем, существует ли пользователь в БД
      const existingUser = await UserService.findByTelegramId(ctx.from.id);

      if (!existingUser) {
        // 2. Если пользователя нет — создаем его и помечаем флаг регистрации
        const newUser = await UserService.getOrCreateUser({
          id: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
        });
        ctx.session.dbUserId = newUser.id;
        ctx.session.isJustRegistered = true; // 🎯 Ставим флаг для startHandler
      } else {
        ctx.session.dbUserId = existingUser.id;
      }
    } catch (error) {
      console.error('❌ Ошибка в authMiddleware:', error);
      if (ctx.chat) {
        await ctx.reply('⚠️ Ошибка авторизации. Введите /start для сброса.');
      }
      return;
    }
  }

  await next();
}