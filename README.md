# AI Interview Coach

A streaming chat app that runs mock front-end interviews. Pick a topic (HTML, CSS, JavaScript, or React) and Claude asks one question at a time, gives feedback on your answer, then asks the next one.

**Live demo:** https://ai-chat-neon-ten.vercel.app/

The demo is rate-limited and has a monthly spend cap, so it may occasionally be unavailable.

## Features

- Streaming replies, token by token, from Claude Haiku 5.5
- Topic picker with a server-side allow-list; the coach stays on the chosen topic
- Stop button that cancels the request end to end, not just in the browser
- Loading state, error message with a Retry button
- One-screen layout: the message list scrolls and follows the reply, unless you scroll up
- Accessible by design: labeled input, `log` and `status` live regions, focus management, keyboard-only use

## How it works

```
Browser (React)  ->  POST /api/chat (Next.js route handler)  ->  Anthropic API
useChat hook         validates the request, builds the prompt      Claude Haiku 5.5
                     on the server, streams the reply back
```

- The browser sends the conversation plus a topic id. It never sees the system prompt or the API key.
- The route handler validates the request, maps the topic id to prompt text it owns, and calls `streamText` from the Vercel AI SDK.
- `useChat` reads the stream and updates the UI as chunks arrive.

## Tech stack

Next.js (App Router), React, TypeScript, Tailwind CSS, Vercel AI SDK 7 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`), Claude Haiku 5.5, deployed on Vercel.

## Getting started

Requires Node.js 22+ and pnpm.

```bash
pnpm install
cp .env.example .env.local   # then add your Anthropic API key
pnpm dev
```

Open http://localhost:3000. The key is read only on the server. Never prefix it with `NEXT_PUBLIC_`.

Other scripts: `pnpm lint`, `pnpm build`.

## Project structure

- `app/page.tsx`: client component with the topic picker and chat UI
- `app/api/chat/route.ts`: server route that validates, builds the prompt, and streams
- `vercel.json`: enables request cancellation for the chat route

## Design decisions

- **Server-owned prompts.** The client sends only a topic id. The server looks it up in an allow-list and builds the instructions itself, so a visitor can't inject their own.
- **Stop cancels the model request.** `stop()` only aborts the browser's fetch. To also stop the model, the route forwards `req.signal` to `streamText` as `abortSignal`, and `vercel.json` enables `supportsCancellation`.
- **Public-demo guardrails.** Request validation (message count, size, roles), a capped reply length, a Vercel Firewall rate limit (20 requests per minute per IP), a monthly spend cap on a dedicated API key, email alerts, and an expiring key.
- **Accessibility.** The message list is `role="log"`, and a separate hidden `role="status"` region announces "Assistant is responding" and "Response complete" once each, so streamed text isn't read token by token.

## Testing done

- Manual: keyboard-only use and VoiceOver on macOS
- Lighthouse accessibility score of 100 on the topic picker view
- Request validation and rate limiting checked with `curl`

There are no automated tests yet.

## Known limitations

- Conversations aren't saved; a page refresh starts over.
- Replies are shown as plain text; markdown isn't rendered.
- Rate-limit counters in the Vercel Firewall are tracked per region.
- Stop cancellation is configured as the docs describe, and the abort path was confirmed on a local server. I haven't captured request-level proof on Vercel.

## Roadmap

- Save sessions
- Render markdown and code blocks
- Difficulty levels
- Automated tests
