import { bot } from './bot/bot.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { ReminderCronService } from './services/reminder.cron.js';

async function main() {
  console.log('🚀 Инициализация приложения...');

  try {
    // 1. Проверяем соединение с базой данных Supabase
    await db.execute(sql`SELECT 1`);
    console.log('✅ База данных Supabase успешно подключена.');

    // 2. Запускаем Telegram-бота (Long Polling)
    console.log('🤖 Запуск Telegram бота...');
    await bot.start({
      onStart: (botInfo) => {
        console.log(`✅ Бот @${botInfo.username} успешно запущен и готов к работе!`);
        
        // 🟢 ВКЛЮЧАЕМ CRON-СЕРВИС НАПОМИНАНИЙ
        ReminderCronService.start(bot);
      },
    });
  } catch (error) {
    console.error('❌ Ошибка при запуске приложения:', error);
    process.exit(1);
  }
}

main();