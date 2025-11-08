-- Add structured flight fields to trips table
ALTER TABLE public.trips 
  DROP COLUMN IF EXISTS flight_details;

ALTER TABLE public.trips
  ADD COLUMN airline TEXT,
  ADD COLUMN flight_number TEXT,
  ADD COLUMN departure_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN arrival_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN flight_confirmation TEXT;