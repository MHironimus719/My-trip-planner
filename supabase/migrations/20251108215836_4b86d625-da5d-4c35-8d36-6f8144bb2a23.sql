-- Add expenses_reimbursable field to trips table
ALTER TABLE public.trips
  ADD COLUMN expenses_reimbursable BOOLEAN DEFAULT true;