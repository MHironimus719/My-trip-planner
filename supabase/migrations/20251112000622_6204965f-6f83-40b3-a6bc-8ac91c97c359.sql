-- Add return flight columns to trips table
ALTER TABLE public.trips
ADD COLUMN return_airline TEXT,
ADD COLUMN return_flight_number TEXT,
ADD COLUMN return_departure_time TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN return_arrival_time TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN return_flight_confirmation TEXT;