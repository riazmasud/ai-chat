"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";

const TOPICS = [
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "js", label: "JavaScript" },
  { id: "react", label: "React" },
] as const;

type TopicId = (typeof TOPICS)[number]["id"];

function textOf(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState<TopicId | null>(null);
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    clearError,
    setMessages,
  } = useChat({
    onError: (err) => console.error("Chat error:", err),
  });
  const isBusy = status === "submitted" || status === "streaming";

  const last = messages[messages.length - 1];
  const showThinking =
    isBusy && !(last?.role === "assistant" && textOf(last) !== "");

  // Short announcements for screen readers; they change only on status changes
  const announcement = isBusy
    ? "Assistant is responding"
    : status === "ready" && last?.role === "assistant"
      ? "Response complete"
      : "";

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerHeadingRef = useRef<HTMLHeadingElement>(null);
  const stickToBottom = useRef(true);
  const wasBusy = useRef(false);
  const hadTopic = useRef(false);

  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) {
      el.scrollTo({ top: el.scrollHeight });
    }
  }, [messages, status]);

  // Return focus to the input when a reply finishes or is stopped
  useEffect(() => {
    if (wasBusy.current && status === "ready") inputRef.current?.focus();
    wasBusy.current = isBusy;
  }, [status, isBusy]);

  // Move focus sensibly when switching between the picker and the chat
  useEffect(() => {
    if (topic) inputRef.current?.focus();
    else if (hadTopic.current) pickerHeadingRef.current?.focus();
    hadTopic.current = topic !== null;
  }, [topic]);

  function startTopic(id: TopicId) {
    const label = TOPICS.find((t) => t.id === id)?.label ?? id;
    stickToBottom.current = true;
    setTopic(id);
    sendMessage(
      { text: `Start a mock interview on ${label}.` },
      { body: { topic: id } },
    );
  }

  function changeTopic() {
    stop();
    setMessages([]);
    clearError();
    setInput("");
    setTopic(null);
  }

  if (topic === null) {
    return (
      <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-4 py-6">
        <h1 className="text-2xl font-bold">AI Interview Coach</h1>
        <section aria-labelledby="topic-heading">
          <h2
            id="topic-heading"
            ref={pickerHeadingRef}
            tabIndex={-1}
            className="mb-3 text-lg font-semibold outline-none"
          >
            Pick a topic to practice
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => startTopic(t.id)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-6 text-lg font-medium text-zinc-900 hover:bg-zinc-100"
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const topicLabel = TOPICS.find((t) => t.id === topic)?.label ?? topic;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AI Interview Coach</h1>
          <p className="text-sm text-zinc-700">Topic: {topicLabel}</p>
        </div>
        <button
          type="button"
          onClick={changeTopic}
          className="rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-800 hover:bg-zinc-100"
        >
          Change topic
        </button>
      </div>

      <div
        ref={listRef}
        role="log"
        aria-label="Conversation"
        aria-busy={status === "streaming"}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
      >
        {messages.map((message) => {
          const text = textOf(message);
          if (message.role === "assistant" && !text) return null;
          return (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "self-end rounded-lg bg-blue-600 px-3 py-2 text-white"
                  : "self-start rounded-lg bg-zinc-200 px-3 py-2 text-zinc-900"
              }
            >
              <span className="sr-only">
                {message.role === "user" ? "You: " : "Assistant: "}
              </span>
              <span className="whitespace-pre-wrap">{text}</span>
            </div>
          );
        })}

        {showThinking && (
          <div
            aria-hidden="true"
            className="self-start rounded-lg bg-zinc-200 px-3 py-2 text-zinc-700 motion-safe:animate-pulse"
          >
            Thinking…
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-red-800"
        >
          <p>Something went wrong. Please try again.</p>
          <button
            type="button"
            onClick={() => regenerate({ body: { topic } })}
            className="mt-2 rounded bg-red-700 px-3 py-1 text-sm text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!input.trim() || isBusy) return;
          if (error) clearError();
          stickToBottom.current = true;
          sendMessage({ text: input }, { body: { topic } });
          setInput("");
        }}
      >
        <label htmlFor="message-input" className="sr-only">
          Your message
        </label>
        <input
          id="message-input"
          ref={inputRef}
          autoComplete="off"
          className={`flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 ${
            isBusy ? "opacity-50" : ""
          }`}
          value={input}
          placeholder="Type your answer..."
          readOnly={isBusy}
          onChange={(e) => setInput(e.currentTarget.value)}
        />
        {isBusy ? (
          <button
            type="button"
            onClick={() => stop()}
            aria-label="Stop response"
            className="rounded bg-zinc-700 px-4 py-2 text-white hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Send
          </button>
        )}
      </form>
    </main>
  );
}
