# Tasks

- [ ] Make dashboard totals explicit buttons and verify all four trip lists and trip navigation while signed in.

- [x] Add a separately tracked return-flight event to Google Calendar sync, with return departure/arrival and confirmation details.
- [x] Validate event creation, updates, and removal with automated tests; deploy the calendar sync function.
- [x] Clarify that MyTripPlanner sign-in and the connected Google Calendar account can use different email addresses.
- [x] Verify a real signed-in trip: opening the Tucson trip successfully synced Google Calendar and saved its separate return event ID.
- [x] Expose the app to external AI agents: OAuth-protected MCP server with read-only tools (list_trips, get_trip, list_expenses) plus the approval/consent screen; requires app publish to go live.