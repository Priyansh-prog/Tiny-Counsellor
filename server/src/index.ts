import express from "express";
import { db, migrationVersion } from "./db.js";
import { planRouter } from "./routes/plan.js";

const app = express();
const port = process.env.PORT ?? 4000;

app.use(express.json());
app.use("/api", planRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError || (typeof err === "object" && err !== null && "type" in err)) {
    res.status(400).json({ ok: false, errors: ["Request body is not valid JSON."] });
    return;
  }
  console.error(err);
  res.status(500).json({ ok: false, errors: ["Internal server error."] });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    db: {
      ready: db.open,
      migrationVersion,
    },
  });
});

const server = app.listen(port, () => {
  console.log(`TinyCounsellor API on http://localhost:${port} (db schema v${migrationVersion})`);
});
server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use — close the other server (or set PORT), then save a file to restart the API.`);
  } else {
    console.error("API failed to start:", err);
  }
  process.exit(1);
});
