import type { Express } from "express";
import { storage } from "./storage.js";
import {
  insertLeaderboardScoreSchema,
  leaderboardDifficultySchema,
  leaderboardQualificationSchema,
} from "../shared/schema.js";

export async function registerRoutes(app: Express): Promise<void> {
  // prefix all routes with /api

  app.get("/api/leaderboard", async (_req, res) => {
    const boards = await storage.getAllLeaderboards();
    res.json({
      limit: 10,
      boards,
    });
  });

  app.get("/api/leaderboard/:difficulty", async (req, res) => {
    const parsedDifficulty = leaderboardDifficultySchema.safeParse(req.params.difficulty);
    if (!parsedDifficulty.success) {
      return res.status(400).json({ message: "Invalid difficulty" });
    }

    const scores = await storage.getLeaderboard(parsedDifficulty.data);
    res.json({
      difficulty: parsedDifficulty.data,
      limit: 10,
      scores,
    });
  });

  app.post("/api/leaderboard/qualify", async (req, res) => {
    const parsed = leaderboardQualificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid leaderboard qualification payload" });
    }

    const result = await storage.qualifiesForLeaderboard(parsed.data);
    res.json(result);
  });

  app.post("/api/leaderboard", async (req, res) => {
    const parsed = insertLeaderboardScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid leaderboard submission" });
    }

    const qualification = await storage.qualifiesForLeaderboard(parsed.data);
    if (!qualification.qualifies) {
      return res.status(409).json({ message: "Score no longer qualifies for the leaderboard" });
    }

    const entry = await storage.createLeaderboardScore(parsed.data);
    const boards = await storage.getAllLeaderboards();
    res.status(201).json({
      entry,
      boards,
      qualification,
    });
  });

}
