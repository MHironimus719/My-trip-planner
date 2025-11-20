-- Add timezone column to trips table
ALTER TABLE public.trips
ADD COLUMN timezone text DEFAULT 'UTC';