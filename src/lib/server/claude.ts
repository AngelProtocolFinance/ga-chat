import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY } from "$env/static/private";
import { execute_tool, tool_definitions } from "./tools.js";

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Google Analytics expert assistant for Better Giving (bettergiving.com). You help the marketing team understand their GA4 traffic data by querying the analytics API.

When answering questions:
- Use the run_report tool for historical data (pageviews, sessions, users, traffic sources, conversions, etc.)
- Use run_realtime_report for current/live data (active users right now)
- Use get_property_details to discover available dimensions and metrics
- Always format data in markdown tables when returning tabular results
- Include totals and percentages where helpful
- Be concise but insightful — highlight notable trends or anomalies
- Default to the last 7 days if no date range is specified
- Common GA4 dimensions: date, pagePath, pageTitle, sessionSource, sessionMedium, country, city, deviceCategory, browser
- Common GA4 metrics: activeUsers, sessions, screenPageViews, bounceRate, averageSessionDuration, conversions, totalRevenue
- When your response invites follow-up, end with a <suggestions> block (2-4 short prompts, one per line):

<suggestions>
Where did the traffic come from?
Which pages were most visited?
How does this compare to last week?
</suggestions>`;

export interface StreamEvent {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  content: string;
}

export async function* chat(messages: Anthropic.MessageParam[]): AsyncGenerator<StreamEvent> {
  // working copy of messages for tool use loop
  const working_messages = [...messages];
  let iterations = 0;
  const max_iterations = 10;

  while (iterations < max_iterations) {
    iterations++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: tool_definitions,
      messages: working_messages,
    });

    // collect text and tool_use blocks
    let has_tool_use = false;
    const tool_results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        yield { type: "text", content: block.text };
      } else if (block.type === "tool_use") {
        has_tool_use = true;
        yield {
          type: "tool_call",
          content: `Querying GA4: ${block.name}`,
        };

        const result = await execute_tool(block.name, block.input as Record<string, unknown>);

        yield {
          type: "tool_result",
          content: `Got results from ${block.name}`,
        };

        tool_results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    if (!has_tool_use) {
      // no more tool calls — done
      yield { type: "done", content: "" };
      return;
    }

    // add assistant response + tool results to continue the loop
    working_messages.push({ role: "assistant", content: response.content });
    working_messages.push({ role: "user", content: tool_results });
  }

  yield { type: "error", content: "Too many tool call iterations" };
}
