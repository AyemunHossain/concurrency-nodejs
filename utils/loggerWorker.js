import { parentPort } from "worker_threads";
import winston from "winston";

// Configure Winston Logger
const logger = winston.createLogger({
  level: "info", // Logging level
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    // new winston.transports.Console(), // Logs to console
    new winston.transports.File({ filename: "user_requests.log" }) // Logs to file
  ]
});

// Handle messages from the main thread
parentPort.on("message", (log) => {
  const { level, message } = log;
  logger.log({ level, message });
});
