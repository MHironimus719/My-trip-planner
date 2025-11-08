import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TripForm() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = tripId && tripId !== "new";

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    trip_name: "",
    city: "",
    country: "",
    beginning_date: "",
    ending_date: "",
    client_or_event: "",
    fee: "0",
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
    hotel_details: "",
    car_needed: false,
    car_details: "",
    internal_notes: "",
  });

  useEffect(() => {
    if (isEditMode) {
      fetchTrip();
    }
  }, [tripId]);

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
          hotel_details: data.hotel_details || "",
          car_needed: data.car_needed || false,
          car_details: data.car_details || "",
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

    setLoading(true);
    try {
      const tripData = {
        ...formData,
        fee: parseFloat(formData.fee) || 0,
        departure_time: formData.departure_time ? new Date(formData.departure_time).toISOString() : null,
        arrival_time: formData.arrival_time ? new Date(formData.arrival_time).toISOString() : null,
        user_id: user.id,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("trips")
          .update(tripData)
          .eq("trip_id", tripId);

        if (error) throw error;
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
        toast({
          title: "Success",
          description: "Trip created successfully",
        });
        navigate(`/trips/${data.trip_id}`);
      }
    } catch (error) {
      console.error("Error saving trip:", error);
      toast({
        title: "Error",
        description: "Failed to save trip",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-3xl font-bold">{isEditMode ? "Edit Trip" : "Create New Trip"}</h2>
      </div>

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
              <div className="space-y-2">
                <Label htmlFor="hotel_details">Hotel Details</Label>
                <Textarea
                  id="hotel_details"
                  value={formData.hotel_details}
                  onChange={(e) => setFormData({ ...formData, hotel_details: e.target.value })}
                  placeholder="Hotel name, address, confirmation..."
                  rows={3}
                />
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
              <div className="space-y-2">
                <Label htmlFor="car_details">Car Rental Details</Label>
                <Textarea
                  id="car_details"
                  value={formData.car_details}
                  onChange={(e) => setFormData({ ...formData, car_details: e.target.value })}
                  placeholder="Rental company, confirmation..."
                  rows={3}
                />
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
    </div>
  );
}
