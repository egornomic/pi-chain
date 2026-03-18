import type { AssistantMessage, TextContent, Usage } from "@mariozechner/pi-ai";
import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

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

function toSeedAssistantMessage(
	entry: Extract<SessionEntry, { type: "message" }>,
): AssistantMessage | undefined {
	if (entry.message.role !== "assistant") return undefined;
	const textBlocks = entry.message.content.filter(
		(block): block is TextContent => block.type === "text" && block.text.trim().length > 0,
	);
	if (textBlocks.length === 0) return undefined;

	return {
		role: "assistant",
		content: textBlocks.map((block) => ({ type: "text", text: block.text })),
		api: entry.message.api,
		provider: entry.message.provider,
		model: entry.message.model,
		usage: EMPTY_USAGE,
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

function getLastAssistantSeedMessage(branch: SessionEntry[]): AssistantMessage | undefined {
	for (let index = branch.length - 1; index >= 0; index -= 1) {
		const entry = branch[index];
		if (entry.type !== "message") continue;
		const assistantMessage = toSeedAssistantMessage(entry);
		if (assistantMessage) return assistantMessage;
	}
	return undefined;
}

export default function chainExtension(pi: ExtensionAPI) {
	pi.registerCommand("chain", {
		description: "Start a new session seeded with the last assistant reply",
		handler: async (args, ctx) => {
			if (args.trim().length > 0) {
				ctx.ui.notify("Usage: /chain", "warning");
				return;
			}

			const assistantMessage = getLastAssistantSeedMessage(ctx.sessionManager.getBranch());
			if (!assistantMessage) {
				ctx.ui.notify("No assistant reply found to seed a new session", "warning");
				return;
			}

			const result = await ctx.newSession({
				parentSession: ctx.sessionManager.getSessionFile(),
				setup: async (sessionManager) => {
					sessionManager.appendMessage(assistantMessage);
				},
			});
			if (result.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
			}
		},
	});
}
