import type { AssistantMessage, ImageContent, TextContent, Usage, UserMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

type ConversationMessage = Extract<SessionEntry, { type: "message" }>["message"];
type SeedMessage = AssistantMessage | UserMessage;

const EMPTY_USAGE: Usage = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
	totalTokens: 0,
	cost: {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		total: 0,
	},
};

function cloneTextContent(block: TextContent): TextContent {
	return { type: "text", text: block.text };
}

function cloneImageContent(block: ImageContent): ImageContent {
	return { type: "image", data: block.data, mimeType: block.mimeType };
}

function toSeedAssistantMessage(message: ConversationMessage): AssistantMessage | undefined {
	if (message.role !== "assistant") return undefined;
	const textBlocks = message.content.filter(
		(block): block is TextContent => block.type === "text" && block.text.trim().length > 0,
	).map(cloneTextContent);
	if (textBlocks.length === 0) return undefined;

	return {
		role: "assistant",
		content: textBlocks,
		api: message.api,
		provider: message.provider,
		model: message.model,
		usage: EMPTY_USAGE,
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

function toSeedUserMessage(message: ConversationMessage): UserMessage | undefined {
	if (message.role !== "user") return undefined;
	if (typeof message.content === "string") {
		if (message.content.trim().length === 0) return undefined;
		return {
			role: "user",
			content: message.content,
			timestamp: Date.now(),
		};
	}

	const content = message.content.flatMap((block) => {
		if (block.type === "image") return [cloneImageContent(block)];
		if (block.text.trim().length === 0) return [];
		return [cloneTextContent(block)];
	});
	if (content.length === 0) return undefined;

	return {
		role: "user",
		content,
		timestamp: Date.now(),
	};
}

function toSeedMessage(message: ConversationMessage): SeedMessage | undefined {
	return toSeedUserMessage(message) ?? toSeedAssistantMessage(message);
}

function parseMessageCount(args: string): number | undefined {
	const input = args.trim();
	if (input.length === 0) return 1;
	if (!/^[1-9]\d*$/.test(input)) return undefined;
	return Number.parseInt(input, 10);
}

function getSeedMessages(branch: SessionEntry[], messageCount: number): SeedMessage[] {
	const messages = branch
		.filter((entry): entry is Extract<SessionEntry, { type: "message" }> => entry.type === "message")
		.map((entry) => toSeedMessage(entry.message))
		.filter((message): message is SeedMessage => message !== undefined);

	return messages.slice(-messageCount);
}

export default function chainExtension(pi: ExtensionAPI) {
	pi.registerCommand("chain", {
		description: "Start a new session seeded with recent conversation messages",
		handler: async (args, ctx) => {
			const messageCount = parseMessageCount(args);
			if (!messageCount) {
				ctx.ui.notify("Usage: /chain [message-count]", "warning");
				return;
			}

			const seedMessages = getSeedMessages(ctx.sessionManager.getBranch(), messageCount);
			if (seedMessages.length === 0) {
				ctx.ui.notify("No user or assistant message found to seed a new session", "warning");
				return;
			}

			const result = await ctx.newSession({
				parentSession: ctx.sessionManager.getSessionFile(),
				setup: async (sessionManager) => {
					for (const message of seedMessages) {
						sessionManager.appendMessage(message);
					}
				},
			});
			if (result.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
			}
		},
	});
}
