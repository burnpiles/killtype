import { createServer } from "http";
import { createApp } from "./app";
import { setupVite, serveStatic } from "./vite";
import { log } from "./log";

(async () => {
  const app = await createApp();
  const server = createServer(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the configured PORT or default to 5000
  // This serves both the API and the client
  const port = Number(process.env.PORT ?? 5000);
  // Some environments (e.g., certain macOS setups) do not support reusePort.
  // Avoid passing unsupported listen options to prevent ENOTSUP errors.
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
