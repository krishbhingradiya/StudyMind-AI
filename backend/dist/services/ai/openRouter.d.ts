interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export declare function callOpenRouter(messages: ChatMessage[], options?: {
    maxTokens?: number;
    temperature?: number;
}, modelOverride?: string, signal?: AbortSignal): Promise<string>;
export {};
//# sourceMappingURL=openRouter.d.ts.map