import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const leaderboardDifficultyValues = ["easy", "normal", "hard", "extreme"] as const;
export const leaderboardDifficultySchema = z.enum(leaderboardDifficultyValues);

export const leaderboardScores = pgTable("leaderboard_scores", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  score: integer("score").notNull(),
  difficulty: text("difficulty").notNull(),
  wpm: integer("wpm").notNull(),
  accuracyPct: integer("accuracy_pct").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const insertLeaderboardScoreSchema = createInsertSchema(leaderboardScores)
  .pick({
    username: true,
    score: true,
    difficulty: true,
    wpm: true,
    accuracyPct: true,
  })
  .extend({
    username: z.string().trim().min(1).max(12),
    score: z.number().int().nonnegative(),
    difficulty: leaderboardDifficultySchema,
    wpm: z.number().int().nonnegative(),
    accuracyPct: z.number().int().min(0).max(100),
  });

export const leaderboardQualificationSchema = z.object({
  score: z.number().int().nonnegative(),
  difficulty: leaderboardDifficultySchema,
  wpm: z.number().int().nonnegative(),
  accuracyPct: z.number().int().min(0).max(100),
});

export type LeaderboardDifficulty = z.infer<typeof leaderboardDifficultySchema>;
export type LeaderboardScore = typeof leaderboardScores.$inferSelect;
export type InsertLeaderboardScore = z.infer<typeof insertLeaderboardScoreSchema>;
export type LeaderboardQualificationRequest = z.infer<typeof leaderboardQualificationSchema>;
