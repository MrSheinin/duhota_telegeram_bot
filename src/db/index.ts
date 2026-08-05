import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// 1. Создаем клиент подключения к PostgreSQL
const queryClient = postgres(env.DATABASE_URL);

// 2. Инициализируем Drizzle ORM
export const db = drizzle(queryClient, { schema });

// Опционально: можно реэкспортировать всё из схемы, чтобы импортировать таблицы прямо из 'src/db'
export * from './schema.js';