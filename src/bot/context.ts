import { Context, SessionFlavor } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  dbUserId?: number;
  activeProgramId?: number; 
  selectedDayOfWeek?: number;

  // Храним ID последнего отправленного сообщения с меню/приветствием
  lastMenuMessageId?: number;
  isJustRegistered?: boolean;
}

export type CustomContext = ConversationFlavor<Context & SessionFlavor<SessionData>>;