import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function uploadFile(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getUploads(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteUpload(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=uploadController.d.ts.map