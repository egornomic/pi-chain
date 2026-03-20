import assert from "node:assert/strict";
import test from "node:test";

import chainExtension from "./index.ts";

const EMPTY_USAGE = {
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

function createMessageEntry(message, index) {
	return {
		type: "message",
		id: `entry-${index + 1}`,
		parentId: index === 0 ? null : `entry-${index}`,
		timestamp: new Date(index + 1).toISOString(),
		message,
	};
}

function createUserMessage(content, timestamp) {
	return {
		role: "user",
		content,
		timestamp,
	};
}

function createAssistantMessage(text, timestamp) {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		api: "responses",
		provider: "openai",
		model: "gpt-4.1",
		usage: EMPTY_USAGE,
		stopReason: "stop",
		timestamp,
	};
}

function createToolResultMessage(text, timestamp) {
	return {
		role: "toolResult",
		toolCallId: `tool-${timestamp}`,
		toolName: "demo",
		content: [{ type: "text", text }],
		details: {},
		isError: false,
		timestamp,
	};
}

function createHarness(branch) {
	let command;
	chainExtension({
		registerCommand(name, definition) {
			if (name === "chain") {
				command = definition;
			}
		},
	});
	assert.ok(command, "expected /chain command to be registered");

	const notifications = [];
	const appendedMessages = [];
	let newSessionCalls = 0;

	const ctx = {
		ui: {
			notify(message, level) {
				notifications.push({ message, level });
			},
		},
		sessionManager: {
			getBranch() {
				return branch;
			},
			getSessionFile() {
				return "/tmp/current-session.jsonl";
			},
		},
		async newSession(options) {
			newSessionCalls += 1;
			await options.setup({
				appendMessage(message) {
					appendedMessages.push(message);
				},
			});
			return { cancelled: false };
		},
	};

	return {
		command,
		ctx,
		notifications,
		appendedMessages,
		getNewSessionCalls() {
			return newSessionCalls;
		},
	};
}

function createConversationBranch() {
	const image = {
		type: "image",
		data: "ZmFrZS1pbWFnZQ==",
		mimeType: "image/png",
	};

	const messages = [
		createUserMessage("Old question", 1),
		createAssistantMessage("Plan step one", 2),
		createToolResultMessage("intermediate tool output", 3),
		createUserMessage("What comes after that?", 4),
		createAssistantMessage("Plan step two", 5),
		createUserMessage(
			[
				{ type: "text", text: "And then?" },
				image,
			],
			6,
		),
		createAssistantMessage("Plan step three", 7),
		createUserMessage("This trailing draft should not be copied", 8),
	];

	return messages.map(createMessageEntry);
}

test("/chain defaults to the last visible message", async () => {
	const harness = createHarness(createConversationBranch());

	await harness.command.handler("", harness.ctx);

	assert.equal(harness.getNewSessionCalls(), 1);
	assert.equal(harness.notifications.length, 0);
	assert.equal(harness.appendedMessages.length, 1);
	assert.equal(harness.appendedMessages[0].role, "user");
	assert.equal(harness.appendedMessages[0].content, "This trailing draft should not be copied");
});

test("/chain N copies the last N visible user and assistant messages in order", async () => {
	const harness = createHarness(createConversationBranch().slice(0, -1));

	await harness.command.handler("3", harness.ctx);

	assert.equal(harness.getNewSessionCalls(), 1);
	assert.equal(harness.notifications.length, 0);
	assert.deepEqual(
		harness.appendedMessages.map((message) => message.role),
		["assistant", "user", "assistant"],
	);
	assert.deepEqual(harness.appendedMessages[0].content, [{ type: "text", text: "Plan step two" }]);
	assert.deepEqual(harness.appendedMessages[1].content, [
		{ type: "text", text: "And then?" },
		{ type: "image", data: "ZmFrZS1pbWFnZQ==", mimeType: "image/png" },
	]);
	assert.deepEqual(harness.appendedMessages[2].content, [{ type: "text", text: "Plan step three" }]);
});

test("/chain rejects invalid counts", async () => {
	const harness = createHarness(createConversationBranch());

	await harness.command.handler("0", harness.ctx);

	assert.equal(harness.getNewSessionCalls(), 0);
	assert.deepEqual(harness.appendedMessages, []);
	assert.deepEqual(harness.notifications, [{ message: "Usage: /chain [message-count]", level: "warning" }]);
});
