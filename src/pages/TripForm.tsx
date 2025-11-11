import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TripAssistant } from "@/components/TripAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { tripSchema } from "@/lib/validations";
import { useCalendarSync } from "@/hooks/useCalendarSync";

export default function TripForm() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isAdmin } = useSubscription();
  const { toast } = useToast();
  const { syncTripToCalendar } = useCalendarSync();
  const isEditMode = tripId && tripId !== "new";

  const [loading, setLoading] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [tripCount, setTripCount] = useState(0);
  const [formData, setFormData] = useState({
    trip_name: "",
    city: "",
    country: "",
    beginning_date: "",
    ending_date: "",
    client_or_event: "",
    fee: "0",
    expenses_reimbursable: true,
    expenses_reimbursed_status: "No" as "No" | "Partial" | "Yes",
    invoice_sent: false,
    invoice_number: "",
    paid: false,
    flight_needed: false,
    airline: "",
    flight_number: "",
    departure_time: "",
    arrival_time: "",
    flight_confirmation: "",
    hotel_needed: false,
    hotel_name: "",
    hotel_address: "",
    hotel_booking_service: "",
    hotel_checkin_date: "",
    hotel_checkout_date: "",
    hotel_confirmation: "",
    car_needed: false,
    car_rental_company: "",
    car_pickup_location: "",
    car_dropoff_location: "",
    car_booking_service: "",
    car_pickup_datetime: "",
    car_dropoff_datetime: "",
    car_confirmation: "",
    internal_notes: "",
  });

  useEffect(() => {
    if (isEditMode) {
      fetchTrip();
    } else if (user) {
      checkTripLimit();
    }
  }, [tripId, user]);

  const checkTripLimit = async () => {
    if (!user || isEditMode || tier !== 'free' || isAdmin) return;

    try {
      const { count, error } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setTripCount(count || 0);
      
      if (count && count >= 3) {
        setShowUpgradeDialog(true);
      }
    } catch (error) {
      console.error('Error checking trip limit:', error);
    }
  };

  const fetchTrip = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("trip_id", tripId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          trip_name: data.trip_name || "",
          city: data.city || "",
          country: data.country || "",
          beginning_date: data.beginning_date || "",
          ending_date: data.ending_date || "",
          client_or_event: data.client_or_event || "",
          fee: data.fee?.toString() || "0",
          expenses_reimbursable: data.expenses_reimbursable ?? true,
          expenses_reimbursed_status: data.expenses_reimbursed_status || "No",
          invoice_sent: data.invoice_sent || false,
          invoice_number: data.invoice_number || "",
          paid: data.paid || false,
          flight_needed: data.flight_needed || false,
          airline: data.airline || "",
          flight_number: data.flight_number || "",
          departure_time: data.departure_time ? new Date(data.departure_time).toISOString().slice(0, 16) : "",
          arrival_time: data.arrival_time ? new Date(data.arrival_time).toISOString().slice(0, 16) : "",
          flight_confirmation: data.flight_confirmation || "",
          hotel_needed: data.hotel_needed || false,
          hotel_name: data.hotel_name || "",
          hotel_address: data.hotel_address || "",
          hotel_booking_service: data.hotel_booking_service || "",
          hotel_checkin_date: data.hotel_checkin_date || "",
          hotel_checkout_date: data.hotel_checkout_date || "",
          hotel_confirmation: data.hotel_confirmation || "",
          car_needed: data.car_needed || false,
          car_rental_company: data.car_rental_company || "",
          car_pickup_location: data.car_pickup_location || "",
          car_dropoff_location: data.car_dropoff_location || "",
          car_booking_service: data.car_booking_service || "",
          car_pickup_datetime: data.car_pickup_datetime ? new Date(data.car_pickup_datetime).toISOString().slice(0, 16) : "",
          car_dropoff_datetime: data.car_dropoff_datetime ? new Date(data.car_dropoff_datetime).toISOString().slice(0, 16) : "",
          car_confirmation: data.car_confirmation || "",
          internal_notes: data.internal_notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
      toast({
        title: "Error",
        description: "Failed to load trip details",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check trip limit for free tier users creating new trips
    if (!isEditMode && tier === 'free' && !isAdmin && tripCount >= 3) {
      setShowUpgradeDialog(true);
      return;
    }

    setLoading(true);
    try {
      // Validate input data
      const validationData = {
        trip_name: formData.trip_name,
        city: formData.city || undefined,
        country: formData.country || undefined,
        beginning_date: formData.beginning_date,
        ending_date: formData.ending_date,
        client_or_event: formData.client_or_event || undefined,
        fee: parseFloat(formData.fee) || 0,
        internal_notes: formData.internal_notes || undefined,
        airline: formData.airline || undefined,
        flight_number: formData.flight_number || undefined,
        flight_confirmation: formData.flight_confirmation || undefined,
        hotel_name: formData.hotel_name || undefined,
        hotel_address: formData.hotel_address || undefined,
        hotel_booking_service: formData.hotel_booking_service || undefined,
        hotel_confirmation: formData.hotel_confirmation || undefined,
        car_rental_company: formData.car_rental_company || undefined,
        car_pickup_location: formData.car_pickup_location || undefined,
        car_dropoff_location: formData.car_dropoff_location || undefined,
        car_booking_service: formData.car_booking_service || undefined,
        car_confirmation: formData.car_confirmation || undefined,
        invoice_number: formData.invoice_number || undefined,
      };

      const validatedData = tripSchema.parse(validationData);

      const tripData = {
        ...formData,
        fee: validatedData.fee,
        departure_time: formData.departure_time ? new Date(formData.departure_time).toISOString() : null,
        arrival_time: formData.arrival_time ? new Date(formData.arrival_time).toISOString() : null,
        car_pickup_datetime: formData.car_pickup_datetime ? new Date(formData.car_pickup_datetime).toISOString() : null,
        car_dropoff_datetime: formData.car_dropoff_datetime ? new Date(formData.car_dropoff_datetime).toISOString() : null,
        hotel_checkin_date: formData.hotel_checkin_date || null,
        hotel_checkout_date: formData.hotel_checkout_date || null,
        user_id: user.id,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("trips")
          .update(tripData)
          .eq("trip_id", tripId);

        if (error) throw error;
        
        // Sync to Google Calendar
        await syncTripToCalendar(tripId, 'update');
        
        toast({
          title: "Success",
          description: "Trip updated successfully",
        });
        navigate(`/trips/${tripId}`);
      } else {
        const { data, error } = await supabase
          .from("trips")
          .insert([tripData])
          .select()
          .single();

        if (error) throw error;
        
        // Sync to Google Calendar
        await syncTripToCalendar(data.trip_id, 'create');
        
        toast({
          title: "Success",
          description: "Trip created successfully",
        });
        navigate(`/trips/${data.trip_id}`);
      }
    } catch (error: any) {
      console.error("Error saving trip:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save trip",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractedData = (extractedData: any) => {
    setFormData((prev) => ({
      ...prev,
      ...(extractedData.trip_name && { trip_name: extractedData.trip_name }),
      ...(extractedData.city && { city: extractedData.city }),
      ...(extractedData.country && { country: extractedData.country }),
      ...(extractedData.beginning_date && { beginning_date: extractedData.beginning_date }),
      ...(extractedData.ending_date && { ending_date: extractedData.ending_date }),
      ...(extractedData.client_or_event && { client_or_event: extractedData.client_or_event }),
      ...(extractedData.fee !== undefined && { fee: extractedData.fee.toString() }),
      ...(extractedData.expenses_reimbursable !== undefined && { expenses_reimbursable: extractedData.expenses_reimbursable }),
      ...(extractedData.flight_needed !== undefined && { flight_needed: extractedData.flight_needed }),
      ...(extractedData.airline && { airline: extractedData.airline }),
      ...(extractedData.flight_number && { flight_number: extractedData.flight_number }),
      ...(extractedData.departure_time && { departure_time: new Date(extractedData.departure_time).toISOString().slice(0, 16) }),
      ...(extractedData.arrival_time && { arrival_time: new Date(extractedData.arrival_time).toISOString().slice(0, 16) }),
      ...(extractedData.flight_confirmation && { flight_confirmation: extractedData.flight_confirmation }),
      ...(extractedData.hotel_needed !== undefined && { hotel_needed: extractedData.hotel_needed }),
      ...(extractedData.hotel_name && { hotel_name: extractedData.hotel_name }),
      ...(extractedData.hotel_address && { hotel_address: extractedData.hotel_address }),
      ...(extractedData.hotel_booking_service && { hotel_booking_service: extractedData.hotel_booking_service }),
      ...(extractedData.hotel_checkin_date && { hotel_checkin_date: extractedData.hotel_checkin_date }),
      ...(extractedData.hotel_checkout_date && { hotel_checkout_date: extractedData.hotel_checkout_date }),
      ...(extractedData.hotel_confirmation && { hotel_confirmation: extractedData.hotel_confirmation }),
      ...(extractedData.car_needed !== undefined && { car_needed: extractedData.car_needed }),
      ...(extractedData.car_rental_company && { car_rental_company: extractedData.car_rental_company }),
      ...(extractedData.car_pickup_location && { car_pickup_location: extractedData.car_pickup_location }),
      ...(extractedData.car_dropoff_location && { car_dropoff_location: extractedData.car_dropoff_location }),
      ...(extractedData.car_booking_service && { car_booking_service: extractedData.car_booking_service }),
      ...(extractedData.car_pickup_datetime && { car_pickup_datetime: new Date(extractedData.car_pickup_datetime).toISOString().slice(0, 16) }),
      ...(extractedData.car_dropoff_datetime && { car_dropoff_datetime: new Date(extractedData.car_dropoff_datetime).toISOString().slice(0, 16) }),
      ...(extractedData.car_confirmation && { car_confirmation: extractedData.car_confirmation }),
      ...(extractedData.internal_notes && { internal_notes: extractedData.internal_notes }),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-3xl font-bold">{isEditMode ? "Edit Trip" : "Create New Trip"}</h2>
      </div>

      {!isEditMode && <TripAssistant onDataExtracted={handleExtractedData} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Basic Information</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trip_name">Trip Name *</Label>
              <Input
                id="trip_name"
                value={formData.trip_name}
                onChange={(e) => setFormData({ ...formData, trip_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_or_event">Client/Event</Label>
              <Input
                id="client_or_event"
                value={formData.client_or_event}
                onChange={(e) => setFormData({ ...formData, client_or_event: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beginning_date">Beginning Date *</Label>
              <Input
                id="beginning_date"
                type="date"
                value={formData.beginning_date}
                onChange={(e) => setFormData({ ...formData, beginning_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ending_date">Ending Date *</Label>
              <Input
                id="ending_date"
                type="date"
                value={formData.ending_date}
                onChange={(e) => setFormData({ ...formData, ending_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fee">Fee ($)</Label>
              <Input
                id="fee"
                type="number"
                step="0.01"
                value={formData.fee}
                onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Expenses Reimbursable?</Label>
              <RadioGroup
                value={formData.expenses_reimbursable ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, expenses_reimbursable: value === "yes" })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="expenses_reimbursable_yes" />
                  <Label htmlFor="expenses_reimbursable_yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="expenses_reimbursable_no" />
                  <Label htmlFor="expenses_reimbursable_no" className="font-normal cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">Status</h3>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="invoice_sent">Invoice Sent</Label>
              <Switch
                id="invoice_sent"
                checked={formData.invoice_sent}
                onCheckedChange={(checked) => setFormData({ ...formData, invoice_sent: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                disabled={!formData.invoice_sent}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="paid">Paid</Label>
              <Switch
                id="paid"
                checked={formData.paid}
                onCheckedChange={(checked) => setFormData({ ...formData, paid: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expenses_reimbursed_status">Expenses Reimbursed</Label>
              <Select
                value={formData.expenses_reimbursed_status}
                onValueChange={(value: "No" | "Partial" | "Yes") =>
                  setFormData({ ...formData, expenses_reimbursed_status: value })
                }
              >
                <SelectTrigger id="expenses_reimbursed_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="text-lg font-semibold">Travel Arrangements</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="flight_needed">Flight Needed</Label>
              <Switch
                id="flight_needed"
                checked={formData.flight_needed}
                onCheckedChange={(checked) => setFormData({ ...formData, flight_needed: checked })}
              />
            </div>

            {formData.flight_needed && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="airline">Airline</Label>
                  <Input
                    id="airline"
                    value={formData.airline}
                    onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    placeholder="e.g., United Airlines"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flight_number">Flight Number</Label>
                  <Input
                    id="flight_number"
                    value={formData.flight_number}
                    onChange={(e) => setFormData({ ...formData, flight_number: e.target.value })}
                    placeholder="e.g., UA 1234"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departure_time">Departure Time</Label>
                  <Input
                    id="departure_time"
                    type="datetime-local"
                    value={formData.departure_time}
                    onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arrival_time">Arrival Time</Label>
                  <Input
                    id="arrival_time"
                    type="datetime-local"
                    value={formData.arrival_time}
                    onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="flight_confirmation">Confirmation Number</Label>
                  <Input
                    id="flight_confirmation"
                    value={formData.flight_confirmation}
                    onChange={(e) => setFormData({ ...formData, flight_confirmation: e.target.value })}
                    placeholder="e.g., ABC123"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="hotel_needed">Hotel Needed</Label>
              <Switch
                id="hotel_needed"
                checked={formData.hotel_needed}
                onCheckedChange={(checked) => setFormData({ ...formData, hotel_needed: checked })}
              />
            </div>

            {formData.hotel_needed && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="hotel_name">Hotel Name</Label>
                  <Input
                    id="hotel_name"
                    value={formData.hotel_name}
                    onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                    placeholder="e.g., Marriott Downtown"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hotel_booking_service">Booking Service</Label>
                  <Input
                    id="hotel_booking_service"
                    value={formData.hotel_booking_service}
                    onChange={(e) => setFormData({ ...formData, hotel_booking_service: e.target.value })}
                    placeholder="e.g., Expedia, Direct"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hotel_address">Address</Label>
                  <Input
                    id="hotel_address"
                    value={formData.hotel_address}
                    onChange={(e) => setFormData({ ...formData, hotel_address: e.target.value })}
                    placeholder="Full address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hotel_checkin_date">Check-in Date</Label>
                  <Input
                    id="hotel_checkin_date"
                    type="date"
                    value={formData.hotel_checkin_date}
                    onChange={(e) => setFormData({ ...formData, hotel_checkin_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hotel_checkout_date">Check-out Date</Label>
                  <Input
                    id="hotel_checkout_date"
                    type="date"
                    value={formData.hotel_checkout_date}
                    onChange={(e) => setFormData({ ...formData, hotel_checkout_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="hotel_confirmation">Confirmation Number</Label>
                  <Input
                    id="hotel_confirmation"
                    value={formData.hotel_confirmation}
                    onChange={(e) => setFormData({ ...formData, hotel_confirmation: e.target.value })}
                    placeholder="e.g., ABC123456"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="car_needed">Car Rental Needed</Label>
              <Switch
                id="car_needed"
                checked={formData.car_needed}
                onCheckedChange={(checked) => setFormData({ ...formData, car_needed: checked })}
              />
            </div>

            {formData.car_needed && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="car_rental_company">Rental Company</Label>
                  <Input
                    id="car_rental_company"
                    value={formData.car_rental_company}
                    onChange={(e) => setFormData({ ...formData, car_rental_company: e.target.value })}
                    placeholder="e.g., Enterprise, Hertz"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="car_booking_service">Booking Service</Label>
                  <Input
                    id="car_booking_service"
                    value={formData.car_booking_service}
                    onChange={(e) => setFormData({ ...formData, car_booking_service: e.target.value })}
                    placeholder="e.g., Direct, Kayak"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="car_pickup_location">Pickup Location</Label>
                  <Input
                    id="car_pickup_location"
                    value={formData.car_pickup_location}
                    onChange={(e) => setFormData({ ...formData, car_pickup_location: e.target.value })}
                    placeholder="Airport or address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="car_dropoff_location">Drop-off Location</Label>
                  <Input
                    id="car_dropoff_location"
                    value={formData.car_dropoff_location}
                    onChange={(e) => setFormData({ ...formData, car_dropoff_location: e.target.value })}
                    placeholder="Airport or address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="car_pickup_datetime">Pickup Date & Time</Label>
                  <Input
                    id="car_pickup_datetime"
                    type="datetime-local"
                    value={formData.car_pickup_datetime}
                    onChange={(e) => setFormData({ ...formData, car_pickup_datetime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="car_dropoff_datetime">Drop-off Date & Time</Label>
                  <Input
                    id="car_dropoff_datetime"
                    type="datetime-local"
                    value={formData.car_dropoff_datetime}
                    onChange={(e) => setFormData({ ...formData, car_dropoff_datetime: e.target.value })}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="car_confirmation">Confirmation Number</Label>
                  <Input
                    id="car_confirmation"
                    value={formData.car_confirmation}
                    onChange={(e) => setFormData({ ...formData, car_confirmation: e.target.value })}
                    placeholder="e.g., RES123456"
                  />
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">Notes</h3>
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Internal Notes</Label>
            <Textarea
              id="internal_notes"
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              rows={4}
            />
          </div>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditMode ? "Update Trip" : "Create Trip"}
          </Button>
        </div>
      </form>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Upgrade to Create More Trips
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You've reached the limit of <strong>3 trips</strong> on the Free plan.
              </p>
              <p>
                Upgrade to <strong>Pro</strong> or <strong>Enterprise</strong> to create unlimited trips and unlock additional features like:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Unlimited trips</li>
                <li>Advanced expense reports</li>
                <li>AI-powered trip planning</li>
                <li>Receipt scanning</li>
                <li>Export to PDF</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
            <AlertDialogAction onClick={() => navigate('/pricing')}>
              View Pricing Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
