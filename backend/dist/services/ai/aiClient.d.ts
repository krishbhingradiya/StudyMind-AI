export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface AIOptions {
    maxTokens?: number;
    temperature?: number;
    preferFast?: boolean;
}
export declare function generateAI(messages: ChatMessage[], options?: AIOptions): Promise<string>;
export declare function parseJsonFromAI<T>(text: string): T;
//# sourceMappingURL=aiClient.d.ts.map