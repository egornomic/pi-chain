# pi-chain

`/chain` for [pi coding agent](https://pi.dev/).

It starts a brand-new session and seeds that new session with recent conversation messages from the current session. By default it carries over the last visible user or assistant message. When you pass a number, it carries over that many recent visible user and assistant messages.

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

Or choose how many recent messages to carry over:

```text
/chain 3
```

Behavior:

- Finds the last visible user or assistant message by default
- Accepts `/chain N` to carry over the last `N` visible user and assistant messages
- Ignores non-conversation entries such as tool results
- Opens a new session with parent-session tracking
- Inserts the carried-over messages into the new session in their original order
- Leaves the editor ready for your next prompt

## Example

Current session ends with:

```text
User: What should I tackle first?
Assistant: Start with the schema migration.
User: What comes after that?
Assistant: Roll out the backfill job.
```

Then you run:

```text
/chain 3
```

New session starts as:

```text
Assistant: Start with the schema migration.
User: What comes after that?
Assistant: Roll out the backfill job.
User: _you type the next prompt here_
```

## Notes

- `/chain` without a number behaves like `/chain 1`.
- Assistant replies keep only visible text.
- User messages keep visible text and images.
- If the current session has no visible user or assistant message yet, the command shows a warning and does nothing.
