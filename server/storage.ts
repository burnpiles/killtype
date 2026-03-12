import {
  leaderboardScores,
  leaderboardDifficultyValues,
  type InsertLeaderboardScore,
  type InsertUser,
  type LeaderboardDifficulty,
  type LeaderboardQualificationRequest,
  type LeaderboardScore,
  type User,
} from "../shared/schema.js";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db.js";

export const LEADERBOARD_LIMIT = 10;

type LeaderboardMap = Record<LeaderboardDifficulty, LeaderboardScore[]>;
type LeaderboardQualificationResult = {
  qualifies: boolean;
  rank: number | null;
  limit: number;
  totalEntries: number;
  lowestScore: number | null;
};

const buildEmptyLeaderboards = (): LeaderboardMap => ({
  easy: [],
  normal: [],
  hard: [],
  extreme: [],
});

const compareLeaderboardScores = (
  a: Pick<LeaderboardScore, "score" | "wpm" | "accuracyPct" | "createdAt">,
  b: Pick<LeaderboardScore, "score" | "wpm" | "accuracyPct" | "createdAt">,
) => {
  if (b.score !== a.score) return b.score - a.score;
  if (b.wpm !== a.wpm) return b.wpm - a.wpm;
  if (b.accuracyPct !== a.accuracyPct) return b.accuracyPct - a.accuracyPct;
  return a.createdAt - b.createdAt;
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getLeaderboard(difficulty: LeaderboardDifficulty): Promise<LeaderboardScore[]>;
  getAllLeaderboards(): Promise<LeaderboardMap>;
  qualifiesForLeaderboard(entry: LeaderboardQualificationRequest): Promise<LeaderboardQualificationResult>;
  createLeaderboardScore(entry: InsertLeaderboardScore): Promise<LeaderboardScore & { rank: number }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leaderboardScores: LeaderboardMap;
  currentId: number;
  leaderboardCurrentId: number;

  constructor() {
    this.users = new Map();
    this.leaderboardScores = buildEmptyLeaderboards();
    this.currentId = 1;
    this.leaderboardCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLeaderboard(difficulty: LeaderboardDifficulty): Promise<LeaderboardScore[]> {
    if (db) {
      return db
        .select()
        .from(leaderboardScores)
        .where(eq(leaderboardScores.difficulty, difficulty))
        .orderBy(
          desc(leaderboardScores.score),
          desc(leaderboardScores.wpm),
          desc(leaderboardScores.accuracyPct),
          asc(leaderboardScores.createdAt),
        )
        .limit(LEADERBOARD_LIMIT);
    }
    return [...this.leaderboardScores[difficulty]];
  }

  async getAllLeaderboards(): Promise<LeaderboardMap> {
    if (db) {
      const boards = await Promise.all(
        leaderboardDifficultyValues.map(async (difficulty) => [
          difficulty,
          await this.getLeaderboard(difficulty),
        ] as const),
      );
      return Object.fromEntries(boards) as LeaderboardMap;
    }
    return {
      easy: [...this.leaderboardScores.easy],
      normal: [...this.leaderboardScores.normal],
      hard: [...this.leaderboardScores.hard],
      extreme: [...this.leaderboardScores.extreme],
    };
  }

  async qualifiesForLeaderboard(entry: LeaderboardQualificationRequest): Promise<LeaderboardQualificationResult> {
    const board = await this.getLeaderboard(entry.difficulty);
    const previewEntry = {
      id: -1,
      username: "preview",
      score: entry.score,
      difficulty: entry.difficulty,
      wpm: entry.wpm,
      accuracyPct: entry.accuracyPct,
      createdAt: Date.now(),
    };
    const ranked = [...board, previewEntry]
      .sort(compareLeaderboardScores);
    const rank = ranked.findIndex(score => score.id === -1) + 1;

    return {
      qualifies: board.length < LEADERBOARD_LIMIT || rank <= LEADERBOARD_LIMIT,
      rank: rank > 0 ? rank : null,
      limit: LEADERBOARD_LIMIT,
      totalEntries: board.length,
      lowestScore: board.length > 0 ? board[board.length - 1].score : null,
    };
  }

  async createLeaderboardScore(entry: InsertLeaderboardScore): Promise<LeaderboardScore & { rank: number }> {
    if (db) {
      const [created] = await db
        .insert(leaderboardScores)
        .values({
          username: entry.username,
          score: entry.score,
          difficulty: entry.difficulty,
          wpm: entry.wpm,
          accuracyPct: entry.accuracyPct,
          createdAt: Date.now(),
        })
        .returning();

      const fullBoard = await db
        .select()
        .from(leaderboardScores)
        .where(eq(leaderboardScores.difficulty, entry.difficulty))
        .orderBy(
          desc(leaderboardScores.score),
          desc(leaderboardScores.wpm),
          desc(leaderboardScores.accuracyPct),
          asc(leaderboardScores.createdAt),
        );

      const trimmed = fullBoard.slice(0, LEADERBOARD_LIMIT);
      const overflow = fullBoard.slice(LEADERBOARD_LIMIT);
      if (overflow.length > 0) {
        await db
          .delete(leaderboardScores)
          .where(inArray(leaderboardScores.id, overflow.map(score => score.id)));
      }

      const rank = trimmed.findIndex(existing => existing.id === created.id) + 1;
      return { ...created, rank };
    }

    const createdAt = Date.now();
    const score: LeaderboardScore = {
      id: this.leaderboardCurrentId++,
      username: entry.username,
      score: entry.score,
      difficulty: entry.difficulty,
      wpm: entry.wpm,
      accuracyPct: entry.accuracyPct,
      createdAt,
    };

    const board = [...this.leaderboardScores[entry.difficulty], score]
      .sort(compareLeaderboardScores)
      .slice(0, LEADERBOARD_LIMIT);
    this.leaderboardScores[entry.difficulty] = board;

    const rank = board.findIndex(existing => existing.id === score.id) + 1;
    return { ...score, rank };
  }
}

export const storage = new MemStorage();
