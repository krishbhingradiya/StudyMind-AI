"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const apiResponse_1 = require("../utils/apiResponse");
function errorHandler(err, _req, res, _next) {
    console.error("[Error]", err.message, err.stack);
    const status = err.status || 500;
    (0, apiResponse_1.sendError)(res, err.message || "Internal server error", status);
}
function notFoundHandler(_req, res) {
    (0, apiResponse_1.sendError)(res, "Route not found", 404);
}
//# sourceMappingURL=errorHandler.js.map