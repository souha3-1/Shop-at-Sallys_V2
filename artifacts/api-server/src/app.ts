import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// JSON 404 for unknown API routes (Express' default would return HTML).
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// JSON error handler: malformed bodies are client errors, everything else is
// an internal error. Never leak stack traces or SQL to the client.
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ message: "Malformed JSON body" });
      return;
    }
    logger.error({ err }, "Unhandled request error");
    res.status(500).json({ message: "Internal server error" });
  },
);

export default app;
