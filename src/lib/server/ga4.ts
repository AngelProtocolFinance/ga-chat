import { analyticsdata_v1beta } from "@googleapis/analyticsdata";
import { GoogleAuth } from "google-auth-library";
import { GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_JSON } from "$env/static/private";

const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON || "{}");

const auth = new GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
});

const client = new analyticsdata_v1beta.Analyticsdata({ auth });

export async function run_report(params: {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  date_ranges: { start_date: string; end_date: string }[];
  dimension_filter?: Record<string, unknown>;
  metric_filter?: Record<string, unknown>;
  order_bys?: Record<string, unknown>[];
  limit?: number;
}) {
  const res = await client.properties.runReport({
    property: `properties/${GA4_PROPERTY_ID}`,
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
  const res = await client.properties.runRealtimeReport({
    property: `properties/${GA4_PROPERTY_ID}`,
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
  const res = await client.properties.getMetadata({
    name: `properties/${GA4_PROPERTY_ID}/metadata`,
  });
  return res.data;
}
