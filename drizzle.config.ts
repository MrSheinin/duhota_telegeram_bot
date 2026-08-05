import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Принудительно загружаем .env файл из корня проекта
dotenv.config({ path: './.env' });

if (!process.env.DATABASE_URL) {
  throw new Error('❌ Ошибка: DATABASE_URL не найден в файле .env!');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});