import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types";
export interface AuthenticatedRequest extends Request {
    user?: AuthUser;
    accessToken?: string;
}
export declare function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map