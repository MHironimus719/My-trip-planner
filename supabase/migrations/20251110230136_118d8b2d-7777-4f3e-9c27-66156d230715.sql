-- Add flight_number column to trips table
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS flight_number TEXT;

-- Add airline column to store airline name
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS airline TEXT;