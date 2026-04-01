import { analyticsdata_v1beta } from "@googleapis/analyticsdata";
import { GoogleAuth } from "google-auth-library";
import { env } from "$env/dynamic/private";

// lazy init — avoids build-time crash when env vars are absent
let _client: analyticsdata_v1beta.Analyticsdata;
function get_client() {
  if (!_client) {
    const credentials = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}");
    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
    });
    _client = new analyticsdata_v1beta.Analyticsdata({ auth });
  }
  return _client;
}

function get_property() {
  return `properties/${env.GA4_PROPERTY_ID}`;
}

export async function run_report(params: {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  date_ranges: { start_date: string; end_date: string }[];
  dimension_filter?: Record<string, unknown>;
  metric_filter?: Record<string, unknown>;
  order_bys?: Record<string, unknown>[];
  limit?: number;
}) {
  const res = await get_client().properties.runReport({
    property: get_property(),
    requestBody: {
      dimensions: params.dimensions,
      metrics: params.metrics,
      dateRanges: params.date_ranges?.map((dr) => ({
        startDate: dr.start_date,
        endDate: dr.end_date,
      })),
      dimensionFilter: params.dimension_filter as any,
      metricFilter: params.metric_filter as any,
      orderBys: params.order_bys as any,
      limit: params.limit,
    },
  });
  return res.data;
}

export async function run_realtime_report(params: {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dimension_filter?: Record<string, unknown>;
  metric_filter?: Record<string, unknown>;
  limit?: number;
}) {
  const res = await get_client().properties.runRealtimeReport({
    property: get_property(),
    requestBody: {
      dimensions: params.dimensions,
      metrics: params.metrics,
      dimensionFilter: params.dimension_filter as any,
      metricFilter: params.metric_filter as any,
      limit: params.limit,
    },
  });
  return res.data;
}

export async function get_property_details() {
  const res = await get_client().properties.getMetadata({
    name: `${get_property()}/metadata`,
  });
  return res.data;
}
