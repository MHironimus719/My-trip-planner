import { z } from "zod";

// Auth validation schemas
export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be less than 128 characters" }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Full name is required" })
    .max(100, { message: "Full name must be less than 100 characters" }),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

// Trip validation schema
export const tripSchema = z.object({
  trip_name: z
    .string()
    .trim()
    .min(1, { message: "Trip name is required" })
    .max(200, { message: "Trip name must be less than 200 characters" }),
  city: z
    .string()
    .trim()
    .max(100, { message: "City must be less than 100 characters" })
    .optional(),
  country: z
    .string()
    .trim()
    .max(100, { message: "Country must be less than 100 characters" })
    .optional(),
  beginning_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  ending_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  client_or_event: z
    .string()
    .trim()
    .max(200, { message: "Client/Event must be less than 200 characters" })
    .optional(),
  fee: z
    .number()
    .min(0, { message: "Fee must be positive" })
    .max(1000000, { message: "Fee must be less than 1,000,000" }),
  internal_notes: z
    .string()
    .trim()
    .max(5000, { message: "Notes must be less than 5000 characters" })
    .optional(),
  airline: z
    .string()
    .trim()
    .max(100, { message: "Airline must be less than 100 characters" })
    .optional(),
  flight_number: z
    .string()
    .trim()
    .max(50, { message: "Flight number must be less than 50 characters" })
    .optional(),
  flight_confirmation: z
    .string()
    .trim()
    .max(100, { message: "Confirmation must be less than 100 characters" })
    .optional(),
  hotel_name: z
    .string()
    .trim()
    .max(200, { message: "Hotel name must be less than 200 characters" })
    .optional(),
  hotel_address: z
    .string()
    .trim()
    .max(500, { message: "Address must be less than 500 characters" })
    .optional(),
  hotel_booking_service: z
    .string()
    .trim()
    .max(100, { message: "Booking service must be less than 100 characters" })
    .optional(),
  hotel_confirmation: z
    .string()
    .trim()
    .max(100, { message: "Confirmation must be less than 100 characters" })
    .optional(),
  car_rental_company: z
    .string()
    .trim()
    .max(100, { message: "Company name must be less than 100 characters" })
    .optional(),
  car_pickup_location: z
    .string()
    .trim()
    .max(200, { message: "Location must be less than 200 characters" })
    .optional(),
  car_dropoff_location: z
    .string()
    .trim()
    .max(200, { message: "Location must be less than 200 characters" })
    .optional(),
  car_booking_service: z
    .string()
    .trim()
    .max(100, { message: "Booking service must be less than 100 characters" })
    .optional(),
  car_confirmation: z
    .string()
    .trim()
    .max(100, { message: "Confirmation must be less than 100 characters" })
    .optional(),
  invoice_number: z
    .string()
    .trim()
    .max(100, { message: "Invoice number must be less than 100 characters" })
    .optional(),
});

// Expense validation schema
export const expenseSchema = z.object({
  trip_id: z.string().uuid({ message: "Invalid trip ID" }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  merchant: z
    .string()
    .trim()
    .min(1, { message: "Merchant is required" })
    .max(200, { message: "Merchant must be less than 200 characters" }),
  category: z.enum([
    "Car",
    "Entertainment",
    "Fees",
    "Flight",
    "Hotel",
    "Meal",
    "Other",
    "Rideshare/Taxi",
    "Supplies",
  ]),
  amount: z
    .number()
    .min(0.01, { message: "Amount must be greater than 0" })
    .max(1000000, { message: "Amount must be less than 1,000,000" }),
  payment_method: z.enum([
    "Personal Card",
    "Business Card",
    "Company Card",
    "Cash",
    "Other",
  ]),
  currency: z
    .string()
    .length(3, { message: "Currency must be 3 characters" })
    .toUpperCase(),
  description: z
    .string()
    .trim()
    .max(1000, { message: "Description must be less than 1000 characters" })
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000, { message: "Notes must be less than 2000 characters" })
    .optional(),
});

// Itinerary item validation schema
export const itineraryItemSchema = z.object({
  trip_id: z.string().uuid({ message: "Invalid trip ID" }),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Invalid time format" })
    .optional()
    .or(z.literal("")),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Invalid time format" })
    .optional()
    .or(z.literal("")),
  item_type: z.enum([
    "Buffer",
    "Class",
    "Event",
    "Flight",
    "Lodging",
    "Meeting",
    "Other",
    "Transit",
  ]),
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required" })
    .max(200, { message: "Title must be less than 200 characters" }),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description must be less than 2000 characters" })
    .optional(),
  location_name: z
    .string()
    .trim()
    .max(200, { message: "Location name must be less than 200 characters" })
    .optional(),
  address: z
    .string()
    .trim()
    .max(500, { message: "Address must be less than 500 characters" })
    .optional(),
  confirmation_number: z
    .string()
    .trim()
    .max(100, { message: "Confirmation number must be less than 100 characters" })
    .optional(),
  booking_link: z
    .string()
    .trim()
    .url({ message: "Invalid URL" })
    .max(2000, { message: "URL must be less than 2000 characters" })
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000, { message: "Notes must be less than 2000 characters" })
    .optional(),
});

// Edge function validation schemas
export const extractTripInfoSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { message: "Message is required" })
    .max(10000, { message: "Message must be less than 10000 characters" }),
  images: z
    .array(z.string())
    .max(10, { message: "Maximum 10 images allowed" })
    .optional(),
});

export const extractExpenseInfoSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, { message: "Text is required" })
    .max(10000, { message: "Text must be less than 10000 characters" }),
  images: z
    .array(z.string())
    .max(10, { message: "Maximum 10 images allowed" })
    .optional(),
});
