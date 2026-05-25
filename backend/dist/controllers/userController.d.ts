import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function getProfile(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateProfile(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createProfile(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendLoginOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function verifyLoginOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function verifyOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resendOtp(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=userController.d.ts.map