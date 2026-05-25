import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function getUniversityCatalog(_req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resolveUniversity(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAcademicContext(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getAcademicDashboard(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMaterialAnalyses(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=academicController.d.ts.map