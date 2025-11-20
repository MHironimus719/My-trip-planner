import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { itineraryItemSchema } from "@/lib/validations";
import { useCalendarSync } from "@/hooks/useCalendarSync";

export default function ItineraryForm() {
  const navigate = useNavigate();
  const { tripId: urlTripId, itemId } = useParams();
  const [searchParams] = useSearchParams();
  const tripId = urlTripId || searchParams.get("tripId");
  const { user } = useAuth();
  const { toast } = useToast();
  const { syncItineraryToCalendar } = useCalendarSync();
  const isEditMode = !!itemId;

  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    trip_id: tripId || "",
    date: "",
    start_time: "",
    end_time: "",
    item_type: "Other" as "Buffer" | "Class" | "Event" | "Flight" | "Lodging" | "Meeting" | "Other" | "Transit",
    title: "",
    description: "",
    location_name: "",
    address: "",
    confirmation_number: "",
    booking_link: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchTrips();
      if (isEditMode && itemId) {
        fetchItineraryItem();
      }
    }
  }, [user, itemId, isEditMode]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("trip_id, trip_name, beginning_date, ending_date")
        .order("beginning_date", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const fetchItineraryItem = async () => {
    try {
      const { data, error } = await supabase
        .from("itinerary_items")
        .select("*")
        .eq("itinerary_id", itemId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          trip_id: data.trip_id || "",
          date: data.date,
          start_time: data.start_time || "",
          end_time: data.end_time || "",
          item_type: data.item_type,
          title: data.title,
          description: data.description || "",
          location_name: data.location_name || "",
          address: data.address || "",
          confirmation_number: data.confirmation_number || "",
          booking_link: data.booking_link || "",
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching itinerary item:", error);
      toast({
        title: "Error",
        description: "Failed to load itinerary item",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Validate input data
      const validationData = {
        trip_id: formData.trip_id,
        date: formData.date,
        start_time: formData.start_time || undefined,
        end_time: formData.end_time || undefined,
        item_type: formData.item_type,
        title: formData.title,
        description: formData.description || undefined,
        location_name: formData.location_name || undefined,
        address: formData.address || undefined,
        confirmation_number: formData.confirmation_number || undefined,
        booking_link: formData.booking_link || undefined,
        notes: formData.notes || undefined,
      };

      const validatedData = itineraryItemSchema.parse(validationData);

      let error;
      let savedItemId = itemId;
      if (isEditMode && itemId) {
        const result = await supabase
          .from("itinerary_items")
          .update({ ...formData, ...validatedData })
          .eq("itinerary_id", itemId);
        error = result.error;
      } else {
        const result = await supabase
          .from("itinerary_items")
          .insert([{ ...formData, ...validatedData }])
          .select('itinerary_id')
          .single();
        error = result.error;
        savedItemId = result.data?.itinerary_id;
      }

      if (error) throw error;

      // Sync to Google Calendar if item was saved
      if (savedItemId && formData.trip_id) {
        await syncItineraryToCalendar(formData.trip_id, savedItemId, 'sync_itinerary_item');
      }

      toast({
        title: "Success",
        description: isEditMode ? "Itinerary item updated successfully" : "Itinerary item created successfully",
      });

      if (formData.trip_id) {
        navigate(`/trips/${formData.trip_id}`);
      } else {
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error saving itinerary item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save itinerary item",
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
        <h2 className="text-3xl font-bold">{isEditMode ? "Edit Itinerary Item" : "Add Itinerary Item"}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Item Details</h3>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="trip_id">Trip *</Label>
              <Select
                value={formData.trip_id}
                onValueChange={(value) => setFormData({ ...formData, trip_id: value })}
                required
              >
                <SelectTrigger id="trip_id">
                  <SelectValue placeholder="Select a trip" />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.trip_id} value={trip.trip_id}>
                      {trip.trip_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_type">Type *</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value: any) => setFormData({ ...formData, item_type: value })}
              >
                <SelectTrigger id="item_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Flight">Flight</SelectItem>
                  <SelectItem value="Lodging">Lodging</SelectItem>
                  <SelectItem value="Transit">Transit</SelectItem>
                  <SelectItem value="Event">Event</SelectItem>
                  <SelectItem value="Class">Class</SelectItem>
                  <SelectItem value="Buffer">Buffer</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_name">Location Name</Label>
              <Input
                id="location_name"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="confirmation_number">Confirmation Number</Label>
                <Input
                  id="confirmation_number"
                  value={formData.confirmation_number}
                  onChange={(e) => setFormData({ ...formData, confirmation_number: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking_link">Booking Link</Label>
                <Input
                  id="booking_link"
                  type="url"
                  value={formData.booking_link}
                  onChange={(e) => setFormData({ ...formData, booking_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditMode ? "Update Itinerary Item" : "Save Itinerary Item"}
          </Button>
        </div>
      </form>
    </div>
  );
}
