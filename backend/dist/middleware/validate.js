"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const apiResponse_1 = require("../utils/apiResponse");
function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const message = result.error.errors.map((e) => e.message).join(", ");
            return (0, apiResponse_1.sendError)(res, message, 400);
        }
        req.body = result.data;
        next();
    };
}
