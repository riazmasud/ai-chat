import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";

export const maxDuration = 30;

const BASE_INSTRUCTIONS = `You are a front-end interview coach.

How you work:
- Ask ONE interview question at a time, then wait for the candidate's answer.
- After each answer, give brief feedback: what was strong, what was missing or wrong, and a concise model answer. Then ask the next question, adjusting difficulty to how they are doing.
- Stay on the session topic. If the candidate asks to switch topics, tell them to use the Change topic button.
- If a request is unrelated to front-end interview preparation, politely say you focus on that and offer to continue with the current question.
- Keep replies concise. Use plain text only: no markdown, asterisks, headings, or tables. Show code as indented plain text.
- If you are not sure about something, say so instead of guessing.`;

// The server owns the prompt text. The browser only ever sends an id.
const TOPICS = {
  html: "Session topic: HTML. Focus on semantic markup, forms, accessibility, and the DOM.",
  css: "Session topic: CSS. Focus on layout (flexbox and grid), specificity, the cascade, and responsive design.",
  js: "Session topic: JavaScript. Focus on closures, async/await, the event loop, and modern ES6+ features.",
  react:
    "Session topic: React. Focus on hooks, state vs. props, rendering behavior, and performance.",
} as const;

type TopicId = keyof typeof TOPICS;

function isTopic(value: unknown): value is TopicId {
  return typeof value === "string" && Object.keys(TOPICS).includes(value);
}

// Limits that keep a public endpoint from being used to run up costs
const MAX_MESSAGES = 30;
const MAX_TOTAL_CHARS = 12_000;

function isValidConversation(messages: unknown): boolean {
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES
  ) {
    return false;
  }
  let totalChars = 0;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return false;
    if (!Array.isArray(m.parts)) return false;
    for (const part of m.parts) {
      if (part?.type === "text" && typeof part.text === "string") {
        totalChars += part.text.length;
      }
    }
  }
  return totalChars <= MAX_TOTAL_CHARS;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || !isTopic(body.topic) || !isValidConversation(body.messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  const { messages, topic } = body as { messages: UIMessage[]; topic: TopicId };

  const result = streamText({
    model: anthropic("claude-haiku-5-5"),
    instructions: `${BASE_INSTRUCTIONS}\n\n${TOPICS[topic]}`,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 2000,
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
