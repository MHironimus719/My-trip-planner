# Architecture rules

- Keep return-flight calendar event building and lifecycle handling in `supabase/functions/sync-calendar/return-flight.ts` so the separately tracked event is independently testable and deploys with the function.
- Use a deterministic trip-derived Google event ID for return flights to prevent duplicate events from overlapping background sync requests; persist it separately from the all-day trip event.