# pi-chain

`/chain` for [pi coding agent](https://pi.dev/).

It starts a brand-new session and seeds that new session with the last assistant reply from the current session. The carried-over message stays an assistant message, so the new chat opens with context already visible and waits for your next user prompt.

## Install

From npm:

```bash
pi install npm:pi-chain
```

From git:

```bash
pi install git:github.com/egornomic/pi-chain
```

## Usage

Once installed, run:

```text
/chain
```

Behavior:

- Finds the last assistant reply in the current session branch
- Opens a new session with parent-session tracking
- Inserts that reply into the new session as an assistant message
- Leaves the editor ready for your next prompt

## Example

Current session ends with:

```text
Assistant: Here is the migration plan for the billing rollout.
```

Then you run:

```text
/chain
```

New session starts as:

```text
Assistant: Here is the migration plan for the billing rollout.
User: _you type the next prompt here_
```

## Notes

- `/chain` only uses the last assistant reply, not the last user message.
- Only visible text from the assistant reply is carried forward.
- If the current session has no assistant reply yet, the command shows a warning and does nothing.
