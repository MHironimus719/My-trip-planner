-- Add google_calendar_event_id to itinerary_items table
ALTER TABLE public.itinerary_items
ADD COLUMN google_calendar_event_id text;

-- Add sync_itinerary_to_calendar toggle to trips table
ALTER TABLE public.trips
ADD COLUMN sync_itinerary_to_calendar boolean DEFAULT false;