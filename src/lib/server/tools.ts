import type Anthropic from "@anthropic-ai/sdk";
import * as ga4 from "./ga4.js";

export const tool_definitions: Anthropic.Tool[] = [
  {
    name: "run_report",
    description:
      "Run a Google Analytics 4 report. Supports dimensions, metrics, date ranges, filters, ordering, and row limits. Use this for historical data queries like pageviews, sessions, users, traffic sources, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          description: 'Dimensions to group by, e.g. [{"name": "date"}, {"name": "pagePath"}]',
        },
        metrics: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          description: 'Metrics to retrieve, e.g. [{"name": "activeUsers"}, {"name": "sessions"}]',
        },
        date_ranges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              start_date: {
                type: "string",
                description:
                  "Start date (YYYY-MM-DD, or relative like 7daysAgo, 30daysAgo, yesterday, today)",
              },
              end_date: {
                type: "string",
                description: "End date (YYYY-MM-DD or relative)",
              },
            },
            required: ["start_date", "end_date"],
          },
          description: "Date ranges for the report",
        },
        dimension_filter: {
          type: "object",
          description: "Optional dimension filter (GA4 FilterExpression format)",
        },
        metric_filter: {
          type: "object",
          description: "Optional metric filter (GA4 FilterExpression format)",
        },
        order_bys: {
          type: "array",
          items: { type: "object" },
          description: "Optional ordering",
        },
        limit: {
          type: "number",
          description: "Max rows to return (default: no limit)",
        },
      },
      required: ["metrics", "date_ranges"],
    },
  },
  {
    name: "run_realtime_report",
    description:
      "Run a Google Analytics 4 realtime report. Shows currently active users, pageviews, events happening right now.",
    input_schema: {
      type: "object" as const,
      properties: {
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          description: "Realtime dimensions to group by",
        },
        metrics: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" } },
            required: ["name"],
          },
          description: "Realtime metrics to retrieve",
        },
        dimension_filter: {
          type: "object",
          description: "Optional dimension filter",
        },
        metric_filter: {
          type: "object",
          description: "Optional metric filter",
        },
        limit: {
          type: "number",
          description: "Max rows to return",
        },
      },
      required: ["metrics"],
    },
  },
  {
    name: "get_property_details",
    description:
      "Get metadata about the GA4 property, including available dimensions and metrics. Useful for discovering what data is available.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
];

type ToolInput = Record<string, unknown>;

export async function execute_tool(name: string, input: ToolInput): Promise<string> {
  try {
    let result: unknown;
    switch (name) {
      case "run_report":
        result = await ga4.run_report(input as Parameters<typeof ga4.run_report>[0]);
        break;
      case "run_realtime_report":
        result = await ga4.run_realtime_report(
          input as Parameters<typeof ga4.run_realtime_report>[0],
        );
        break;
      case "get_property_details":
        result = await ga4.get_property_details();
        break;
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
    return JSON.stringify(result, null, 2);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: message });
  }
}
