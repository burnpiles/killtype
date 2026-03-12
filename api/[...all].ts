import { createApp } from "../server/app";

const appPromise = createApp();

export default async function handler(req: any, res: any) {
  try {
    const app = await appPromise;
    return app(req, res);
  } catch (error) {
    console.error("[vercel api crash]", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Serverless function failed",
    });
  }
}
