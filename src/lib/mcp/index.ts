import { defineMcp } from "@lovable.dev/mcp-js";
import listTripsTool from "./tools/list-trips";
import getTripTool from "./tools/get-trip";
import listExpensesTool from "./tools/list-expenses";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "cizxmudgvueofjzfttxo";

export default defineMcp({
  name: "my-trip-planner",
  title: "My Trip Planner",
  version: "0.1.0",
  instructions:
    "Tools for My Trip Planner. Use `list_trips` to discover trips and their IDs, `get_trip` for full flight/hotel/car and itinerary details, and `list_expenses` to review expenses and reimbursement status. All tools read the signed-in user's own data only.",
  auth: {
    oauth: {
      issuer: `https://${projectRef}.supabase.co/auth/v1`,
      acceptedAudiences: "authenticated",
      requireOAuthClientClaim: true,
    },
  },
  tools: [listTripsTool, getTripTool, listExpensesTool],
});
