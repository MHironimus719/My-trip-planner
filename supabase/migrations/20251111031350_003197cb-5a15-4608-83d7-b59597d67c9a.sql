-- Add cancelled field to trips table
ALTER TABLE public.trips ADD COLUMN cancelled boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_trips_cancelled ON public.trips(cancelled);