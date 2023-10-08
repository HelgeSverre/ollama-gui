// db.ts
import Dexie, { Table } from "dexie";
import { Chat } from "./store.ts";

export class AppDB extends Dexie {
  chats!: Table<Chat>;

  constructor() {
    super("ollama-gui");
    this.version(1).stores({
      chats: "++id, title", // Primary key and indexed props
    });
  }
}

export const db = new AppDB();
