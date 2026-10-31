ALTER TABLE public.trips
  ADD COLUMN contract_signed boolean NOT NULL DEFAULT false,
  ADD COLUMN contract_signed_date date;