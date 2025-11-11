-- Add google_calendar_event_id to trips table to track synced calendar events
ALTER TABLE public.trips 
ADD COLUMN google_calendar_event_id text;