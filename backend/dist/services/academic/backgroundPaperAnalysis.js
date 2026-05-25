"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulePastPaperAnalysis = schedulePastPaperAnalysis;
const paperAnalysisService_1 = require("../ai/paperAnalysisService");
const persistMaterialAnalysis_1 = require("./persistMaterialAnalysis");
function schedulePastPaperAnalysis(supabase, userId, params) {
    void (async () => {
        const analysis = await (0, paperAnalysisService_1.analyzePastPaper)(params.extractedText, params.subject, params.university);
        await supabase
            .from("past_papers")
            .update({ analysis })
            .eq("id", params.paperId)
            .eq("user_id", userId);
        await (0, persistMaterialAnalysis_1.persistExamPattern)(supabase, userId, {
            pastPaperId: params.paperId,
            subjectName: params.subject,
            university: params.university,
            analysis,
        });
    })().catch((err) => {
        console.warn(`Background paper analysis failed for ${params.paperId}:`, err);
    });
}
//# sourceMappingURL=backgroundPaperAnalysis.js.map