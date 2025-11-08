-- Add structured hotel fields to trips table
ALTER TABLE public.trips 
  DROP COLUMN IF EXISTS hotel_details,
  DROP COLUMN IF EXISTS car_details;

ALTER TABLE public.trips
  ADD COLUMN hotel_name TEXT,
  ADD COLUMN hotel_address TEXT,
  ADD COLUMN hotel_booking_service TEXT,
  ADD COLUMN hotel_checkin_date DATE,
  ADD COLUMN hotel_checkout_date DATE,
  ADD COLUMN hotel_confirmation TEXT,
  ADD COLUMN car_rental_company TEXT,
  ADD COLUMN car_pickup_location TEXT,
  ADD COLUMN car_dropoff_location TEXT,
  ADD COLUMN car_booking_service TEXT,
  ADD COLUMN car_pickup_datetime TIMESTAMP WITH TIME ZONE,
  ADD COLUMN car_dropoff_datetime TIMESTAMP WITH TIME ZONE,
  ADD COLUMN car_confirmation TEXT;