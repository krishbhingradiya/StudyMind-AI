"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryLogs = void 0;
exports.setupLogger = setupLogger;
exports.memoryLogs = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const formatLog = (prefix, args) => {
    const timestamp = new Date().toISOString();
    const message = args
        .map((a) => {
        if (a instanceof Error)
            return `${a.message}\n${a.stack}`;
        return typeof a === "object" ? JSON.stringify(a) : String(a);
    })
        .join(" ");
    return `[${timestamp}] ${prefix} ${message}`;
};
function setupLogger() {
    console.log = (...args) => {
        exports.memoryLogs.push(formatLog("[INFO]", args));
        if (exports.memoryLogs.length > 300)
            exports.memoryLogs.shift();
        originalLog(...args);
    };
    console.error = (...args) => {
        exports.memoryLogs.push(formatLog("[ERROR]", args));
        if (exports.memoryLogs.length > 300)
            exports.memoryLogs.shift();
        originalError(...args);
    };
    console.warn = (...args) => {
        exports.memoryLogs.push(formatLog("[WARN]", args));
        if (exports.memoryLogs.length > 300)
            exports.memoryLogs.shift();
        originalWarn(...args);
    };
}
