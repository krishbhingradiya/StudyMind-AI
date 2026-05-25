import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function generateRoadmapHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getRoadmaps(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getRoadmapById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateRoadmapProgress(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function prepareTaskVerification(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function submitTaskVerification(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function endStudySession(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=roadmapController.d.ts.map