type LogMethod = (...args: unknown[]) => void;

const isCi = process.env.CI === "true";
const isProduction = process.env.NODE_ENV === "production";

const noop: LogMethod = () => {};

const info: LogMethod =
  isCi || isProduction ? noop : (...args: unknown[]) => console["log"](...args);

const debug: LogMethod =
  isCi || isProduction ? noop : (...args: unknown[]) => console["debug"](...args);

const warn: LogMethod = (...args: unknown[]) => console.warn(...args);
const error: LogMethod = (...args: unknown[]) => console.error(...args);

export const logger = { info, warn, error, debug };
export default logger;
