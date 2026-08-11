import { bot } from './bot/bot.js';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';
import { ReminderCronService } from './services/reminder.cron.js';
import { startHttpServer } from './server.js';

// Глобальный перехватчик ошибок Grammy (не даёт боту "засыпать" или умирать при ошибках)
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`[Grammy Error] Ошибка при обработке update ${ctx.update.update_id}:`);
  console.error(err.error);
});

// Простейший хэндлер для мгновенной проверки отклика
bot.command('ping', async (ctx) => {
  console.log('--- ПОЛУЧЕНА КОМАНДА /ping ---');
  await ctx.reply('pong 🏓 Бот работает!');
});

async function main() {
  console.log('🚀 Инициализация приложения...');

  // Сразу открываем HTTP-порт для Render
  startHttpServer();

  try {
    // Проверяем соединение с базой данных
    await db.execute(sql`SELECT 1`);
    console.log('✅ База данных Supabase успешно подключена.');

    // Очищаем накопившиеся апдейты и сбрасываем старые вебхуки
    console.log('🔄 Сбрасываем Webhook и старые очереди...');
    await bot.api.deleteWebhook({ drop_pending_updates: true });

    // Проверяем авторизацию токена в Telegram API
    const botInfo = await bot.api.getMe();
    console.log(`🤖 Токен валиден, подключились как @${botInfo.username}`);

    // Запускаем Telegram-бота (Long Polling)
    console.log('🤖 Запуск Telegram-бота...');

    bot.start({
      allowed_updates: ['message', 'callback_query'],
      onStart: (info) => {
        console.log(`✅ Бот @${info.username} успешно запущен и готов к работе!`);

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