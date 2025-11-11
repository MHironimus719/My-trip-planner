-- Change timestamp columns from 'with time zone' to 'without time zone'
-- This ensures times are stored exactly as entered, without timezone conversion
ALTER TABLE trips 
  ALTER COLUMN departure_time TYPE timestamp without time zone,
  ALTER COLUMN arrival_time TYPE timestamp without time zone,
  ALTER COLUMN car_pickup_datetime TYPE timestamp without time zone,
  ALTER COLUMN car_dropoff_datetime TYPE timestamp without time zone;