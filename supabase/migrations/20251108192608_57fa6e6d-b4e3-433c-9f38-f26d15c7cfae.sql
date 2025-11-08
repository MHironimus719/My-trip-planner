-- Create enum types
CREATE TYPE expense_reimbursed_status AS ENUM ('No', 'Partial', 'Yes');
CREATE TYPE itinerary_item_type AS ENUM ('Flight', 'Lodging', 'Meeting', 'Class', 'Event', 'Transit', 'Buffer', 'Other');
CREATE TYPE expense_category AS ENUM ('Flight', 'Hotel', 'Car', 'Rideshare/Taxi', 'Meal', 'Entertainment', 'Supplies', 'Fees', 'Other');
CREATE TYPE payment_method AS ENUM ('Personal Card', 'Business Card', 'Company Card', 'Cash', 'Other');
CREATE TYPE expense_reimbursed_status_enum AS ENUM ('Not submitted', 'Submitted', 'Partially reimbursed', 'Fully reimbursed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table
CREATE TABLE public.trips (
  trip_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  beginning_date DATE NOT NULL,
  ending_date DATE NOT NULL,
  client_or_event TEXT,
  fee DECIMAL(10,2) DEFAULT 0,
  expenses_reimbursed_status expense_reimbursed_status DEFAULT 'No',
  invoice_sent BOOLEAN DEFAULT false,
  invoice_number TEXT,
  paid BOOLEAN DEFAULT false,
  flight_needed BOOLEAN DEFAULT false,
  flight_details TEXT,
  hotel_needed BOOLEAN DEFAULT false,
  hotel_details TEXT,
  car_needed BOOLEAN DEFAULT false,
  car_details TEXT,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create itinerary_items table
CREATE TABLE public.itinerary_items (
  itinerary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  item_type itinerary_item_type DEFAULT 'Other',
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  address TEXT,
  confirmation_number TEXT,
  booking_link TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE public.expenses (
  expense_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(trip_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  category expense_category NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'USD',
  amount DECIMAL(10,2) NOT NULL,
  payment_method payment_method DEFAULT 'Personal Card',
  reimbursable BOOLEAN DEFAULT true,
  reimbursed_status expense_reimbursed_status_enum DEFAULT 'Not submitted',
  reimbursement_reference TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trips policies
CREATE POLICY "Users can view their own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips"
  ON public.trips FOR DELETE
  USING (auth.uid() = user_id);

-- Itinerary items policies
CREATE POLICY "Users can view itinerary items for their trips"
  ON public.itinerary_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.trip_id = itinerary_items.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can create itinerary items for their trips"
  ON public.itinerary_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.trip_id = itinerary_items.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update itinerary items for their trips"
  ON public.itinerary_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.trip_id = itinerary_items.trip_id
    AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete itinerary items for their trips"
  ON public.itinerary_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.trip_id = itinerary_items.trip_id
    AND trips.user_id = auth.uid()
  ));

-- Expenses policies
CREATE POLICY "Users can view their own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_itinerary_items_updated_at BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();