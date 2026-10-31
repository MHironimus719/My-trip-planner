import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_trips",
  title: "List trips",
  description:
    "List the signed-in user's trips, most recent first. Each trip includes dates, destination, client/event, booking needs, and flight/hotel/car details.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Maximum number of trips to return (default 20, max 50)."),
    include_cancelled: z
      .boolean()
      .optional()
      .describe("Include cancelled trips (default false)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async ({ limit, include_cancelled }, ctx) => {
    const max = limit ?? 20;
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("trips")
      .select("*")
      .order("beginning_date", { ascending: false })
      .limit(max);

    if (!include_cancelled) {
      query = query.eq("cancelled", false);
    }

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const trips = (data ?? []).map((t) => ({
      trip_id: t.trip_id,
      trip_name: t.trip_name,
      city: t.city,
      country: t.country,
      beginning_date: t.beginning_date,
      ending_date: t.ending_date,
      timezone: t.timezone,
      client_or_event: t.client_or_event,
      fee: t.fee,
      cancelled: t.cancelled,
      flight_needed: t.flight_needed,
      hotel_needed: t.hotel_needed,
      car_needed: t.car_needed,
      outbound_flight: t.airline
        ? {
            airline: t.airline,
            flight_number: t.flight_number,
            departure_time: t.departure_time,
            arrival_time: t.arrival_time,
            confirmation: t.flight_confirmation,
          }
        : null,
      return_flight: t.return_airline
        ? {
            airline: t.return_airline,
            flight_number: t.return_flight_number,
            departure_time: t.return_departure_time,
            arrival_time: t.return_arrival_time,
            confirmation: t.return_flight_confirmation,
          }
        : null,
      hotel: t.hotel_name
        ? {
            name: t.hotel_name,
            address: t.hotel_address,
            checkin_date: t.hotel_checkin_date,
            checkout_date: t.hotel_checkout_date,
            confirmation: t.hotel_confirmation,
          }
        : null,
      car_rental: t.car_rental_company
        ? {
            company: t.car_rental_company,
            pickup_location: t.car_pickup_location,
            dropoff_location: t.car_dropoff_location,
            pickup_datetime: t.car_pickup_datetime,
            dropoff_datetime: t.car_dropoff_datetime,
            confirmation: t.car_confirmation,
          }
        : null,
    }));

    const summary =
      trips.length === 0
        ? "No trips found."
        : trips
            .map(
              (t) =>
                `${t.trip_id}: ${t.trip_name} — ${t.city ?? "?"}, ${t.beginning_date} to ${t.ending_date}${t.cancelled ? " (cancelled)" : ""}`
            )
            .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { trips },
    };
  },
});
