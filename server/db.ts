import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

export const db = process.env.DATABASE_URL
  ? drizzle(neon(process.env.DATABASE_URL), { schema })
  : null;

export function requireDb() {
  if (!db) {
    throw new Error("DATABASE_URL is not configured");
  }
  return db;
}
