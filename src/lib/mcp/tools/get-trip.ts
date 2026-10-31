import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_trip",
  title: "Get trip details",
  description:
    "Get one trip in full detail: dates, destination, flights (outbound and return), hotel, car rental, and the day-by-day itinerary items.",
  inputSchema: {
    trip_id: z.string().uuid().describe("The trip's ID (from list_trips)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true },
  handler: async ({ trip_id }) => {
    const supabase = supabaseForUser(globalThis.__mcpToolContext!);

    const [{ data: trip, error: tripError }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase.from("trips").select("*").eq("trip_id", trip_id).maybeSingle(),
        supabase
          .from("itinerary_items")
          .select("*")
          .eq("trip_id", trip_id)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true }),
      ]);

    if (tripError) {
      return { content: [{ type: "text", text: tripError.message }], isError: true };
    }
    if (!trip) {
      throw new Error("Trip not found or not visible to this account.");
    }
    if (itemsError) {
      return { content: [{ type: "text", text: itemsError.message }], isError: true };
    }

    const tripJson = {
      trip_id: trip.trip_id,
      trip_name: trip.trip_name,
      city: trip.city,
      country: trip.country,
      beginning_date: trip.beginning_date,
      ending_date: trip.ending_date,
      timezone: trip.timezone,
      client_or_event: trip.client_or_event,
      fee: trip.fee,
      cancelled: trip.cancelled,
      internal_notes: trip.internal_notes,
      outbound_flight: trip.airline
        ? {
            airline: trip.airline,
            flight_number: trip.flight_number,
            departure_time: trip.departure_time,
            arrival_time: trip.arrival_time,
            confirmation: trip.flight_confirmation,
          }
        : null,
      return_flight: trip.return_airline
        ? {
            airline: trip.return_airline,
            flight_number: trip.return_flight_number,
            departure_time: trip.return_departure_time,
            arrival_time: trip.return_arrival_time,
            confirmation: trip.return_flight_confirmation,
          }
        : null,
      hotel: trip.hotel_name
        ? {
            name: trip.hotel_name,
            address: trip.hotel_address,
            booking_service: trip.hotel_booking_service,
            checkin_date: trip.hotel_checkin_date,
            checkout_date: trip.hotel_checkout_date,
            confirmation: trip.hotel_confirmation,
          }
        : null,
      car_rental: trip.car_rental_company
        ? {
            company: trip.car_rental_company,
            pickup_location: trip.car_pickup_location,
            pickup_datetime: trip.car_pickup_datetime,
            dropoff_location: trip.car_dropoff_location,
            dropoff_datetime: trip.car_dropoff_datetime,
            booking_service: trip.car_booking_service,
            confirmation: trip.car_confirmation,
          }
        : null,
    };

    const itinerary = (items ?? []).map((i) => ({
      item_id: i.itinerary_id,
      date: i.date,
      start_time: i.start_time,
      end_time: i.end_time,
      item_type: i.item_type,
      title: i.title,
      description: i.description,
      location_name: i.location_name,
      address: i.address,
      confirmation_number: i.confirmation_number,
      booking_link: i.booking_link,
    }));

    const text = itinerary.length
      ? `Trip "${trip.trip_name}" (${trip.beginning_date} to ${trip.ending_date}) with ${itinerary.length} itinerary items.`
      : `Trip "${trip.trip_name}" (${trip.beginning_date} to ${trip.ending_date}) has no itinerary items yet.`;

    return {
      content: [{ type: "text", text }],
      structuredContent: { trip: tripJson, itinerary },
    };
  },
});
