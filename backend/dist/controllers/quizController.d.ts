import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
export declare function generateQuizHandler(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function submitQuiz(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getQuizzes(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function retakeQuiz(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getQuizById(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=quizController.d.ts.map