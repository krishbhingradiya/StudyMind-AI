export const memoryLogs: string[] = [];

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

const formatLog = (prefix: string, args: any[]) => {
  const timestamp = new Date().toISOString();
  const message = args
    .map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack}`;
      return typeof a === "object" ? JSON.stringify(a) : String(a);
    })
    .join(" ");
  return `[${timestamp}] ${prefix} ${message}`;
};

export function setupLogger() {
  console.log = (...args: any[]) => {
    memoryLogs.push(formatLog("[INFO]", args));
    if (memoryLogs.length > 300) memoryLogs.shift();
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    memoryLogs.push(formatLog("[ERROR]", args));
    if (memoryLogs.length > 300) memoryLogs.shift();
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    memoryLogs.push(formatLog("[WARN]", args));
    if (memoryLogs.length > 300) memoryLogs.shift();
    originalWarn(...args);
  };
}
