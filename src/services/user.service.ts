import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class UserService {

  static async findByTelegramId(telegramId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    return user || null;
  }
  static async getOrCreateUser(telegramUser: {
    id: number;
    username?: string;
    firstName?: string;
  }) {
    const telegramId = telegramUser.id;

    // 1. Ищем существующего пользователя
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    if (existingUser.length > 0) {
      return existingUser[0];
    }

    // 2. Если пользователя нет — создаём
    const [newUser] = await db
      .insert(users)
      .values({
        telegramId: telegramId,
        username: telegramUser.username || null,
        firstName: telegramUser.firstName || null,
      })
      .returning();

    return newUser;
  }
}