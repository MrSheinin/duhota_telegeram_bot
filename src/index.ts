import { bot } from './bot/bot.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { ReminderCronService } from './services/reminder.cron.js';
import { startHttpServer } from './server.js';

async function main() {
  console.log('🚀 Инициализация приложения...');

  // Сразу открываем HTTP-порт для Render
  startHttpServer();

  try {
    // Проверяем соединение с базой данных
    await db.execute(sql`SELECT 1`);
    console.log('✅ База данных Supabase успешно подключена.');

    // Запускаем Telegram-бота (Long Polling)
    console.log('🤖 Запуск Telegram-бота...');

    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} успешно запущен и готов к работе!`);

        // Запускаем сервис напоминаний
        ReminderCronService.start(bot);
      },
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске приложения:', error);
    process.exit(1);
  }
}

main();