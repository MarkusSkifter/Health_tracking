import { SUMMARY_MODEL } from "@health/shared";
import Anthropic from "@anthropic-ai/sdk";
import { anthropicEnv } from "../env";
import { SUMMARY_SYSTEM_PROMPT } from "./prompt";

/** Call Claude to narrate the prepared data block into the daily summary (SPEC §7). */
export async function generateSummaryText(userPrompt: string): Promise<string> {
  const { ANTHROPIC_API_KEY } = anthropicEnv();
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: SUMMARY_MODEL, // claude-sonnet-4-6
    max_tokens: 1024,
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  if (!text) throw new Error("Claude returned an empty summary");
  return text;
}
