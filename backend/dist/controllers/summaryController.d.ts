import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function generateSummaryHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSummaries(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getSummaryById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=summaryController.d.ts.map