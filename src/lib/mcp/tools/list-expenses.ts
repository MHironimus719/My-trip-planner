import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const STATUSES = [
  "Not submitted",
  "Submitted",
  "Partially reimbursed",
  "Fully reimbursed",
] as const;

export default defineTool({
  name: "list_expenses",
  title: "List expenses",
  description:
    "List the signed-in user's expenses, newest first. Filter by trip or reimbursement status — useful for seeing what is still pending reimbursement.",
  inputSchema: {
    trip_id: z
      .string()
      .uuid()
      .optional()
      .describe("Only show expenses for this trip (from list_trips)."),
    reimbursed_status: z
      .enum(STATUSES)
      .optional()
      .describe("Only show expenses with this reimbursement status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of expenses to return (default 25, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async ({ trip_id, reimbursed_status, limit }) => {
    const supabase = supabaseForUser(globalThis.__mcpToolContext!);

    let query = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .limit(limit ?? 25);

    if (trip_id) query = query.eq("trip_id", trip_id);
    if (reimbursed_status) query = query.eq("reimbursed_status", reimbursed_status);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const expenses = (data ?? []).map((e) => ({
      expense_id: e.expense_id,
      trip_id: e.trip_id,
      date: e.date,
      merchant: e.merchant,
      category: e.category,
      description: e.description,
      amount: e.amount,
      currency: e.currency,
      payment_method: e.payment_method,
      reimbursable: e.reimbursable,
      reimbursed_status: e.reimbursed_status,
    }));

    if (expenses.length === 0) {
      return {
        content: [{ type: "text", text: "No expenses match those filters." }],
        structuredContent: { expenses: [] },
      };
    }

    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const text = expenses
      .map(
        (e) =>
          `${e.date} ${e.merchant} — ${e.category}, $${Number(e.amount).toFixed(2)} (${e.reimbursed_status})`
      )
      .join("\n");

    return {
      content: [
        {
          type: "text",
          text: `${expenses.length} expense(s), total $${total.toFixed(2)}:\n${text}`,
        },
      ],
      structuredContent: { expenses, total },
    };
  },
});
