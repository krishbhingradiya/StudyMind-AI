"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleUploadAnalysis = scheduleUploadAnalysis;
const persistMaterialAnalysis_1 = require("./persistMaterialAnalysis");
function scheduleUploadAnalysis(supabase, userId, params) {
    void (0, persistMaterialAnalysis_1.analyzeAndPersistUpload)(supabase, userId, params).catch((err) => {
        console.warn(`Background analysis failed for upload ${params.uploadId}:`, err);
    });
}
