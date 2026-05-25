import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function uploadPastPaper(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPastPapers(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function generatePredictedPaperHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function generateSubjectPredictionHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getPredictedPapersHistory(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deletePredictedPaper(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createCombinedCollectionHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function generatePredictionFromCollectionHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getCollectionsHistoryHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteCollectionHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=paperController.d.ts.map