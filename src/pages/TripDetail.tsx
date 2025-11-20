import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, DollarSign, Plus, Edit, Plane, Hotel, Car, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { FlightStatus } from "@/components/FlightStatus";
import { useCalendarSync } from "@/hooks/useCalendarSync";
import { Switch } from "@/components/ui/switch";

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [itineraryItems, setItineraryItems] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { syncTripToCalendar, syncItineraryToCalendar } = useCalendarSync();

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
  }, [tripId]);

  // Sync trip to calendar when first loaded (for newly created trips)
  useEffect(() => {
    if (trip && !trip.google_calendar_event_id && tripId) {
      console.log('Syncing newly created trip to calendar');
      syncTripToCalendar(tripId, 'create').catch(err => {
        console.error('Failed to sync trip to calendar:', err);
      });
    }
  }, [trip, tripId, syncTripToCalendar]);

  const fetchTripData = async () => {
    try {
      const [tripResult, itineraryResult, expensesResult] = await Promise.all([
        supabase.from("trips").select("*").eq("trip_id", tripId).single(),
        supabase.from("itinerary_items").select("*").eq("trip_id", tripId).order("date", { ascending: true }),
        supabase.from("expenses").select("*").eq("trip_id", tripId).order("date", { ascending: false }),
      ]);

      if (tripResult.error) throw tripResult.error;
      setTrip(tripResult.data);
      setItineraryItems(itineraryResult.data || []);
      setExpenses(expensesResult.data || []);
    } catch (error) {
      console.error("Error fetching trip data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItineraryItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this itinerary item?")) return;
    
    try {
      // Sync deletion to Google Calendar first
      if (tripId) {
        await syncItineraryToCalendar(tripId, itemId, 'delete_itinerary_item');
      }

      const { error } = await supabase
        .from("itinerary_items")
        .delete()
        .eq("itinerary_id", itemId);

      if (error) throw error;
      
      toast.success("Itinerary item deleted");
      fetchTripData();
    } catch (error) {
      console.error("Error deleting itinerary item:", error);
      toast.error("Failed to delete itinerary item");
    }
  };

  const handleToggleItinerarySync = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("trips")
        .update({ sync_itinerary_to_calendar: enabled })
        .eq("trip_id", tripId);

      if (error) throw error;

      setTrip({ ...trip, sync_itinerary_to_calendar: enabled });
      toast.success(enabled ? "Itinerary sync enabled" : "Itinerary sync disabled");
    } catch (error) {
      console.error("Error toggling itinerary sync:", error);
      toast.error("Failed to update sync settings");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("expense_id", expenseId);

      if (error) throw error;
      
      toast.success("Expense deleted");
      fetchTripData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const reimbursableExpenses = expenses.filter((exp) => exp.reimbursable).reduce((sum, exp) => sum + Number(exp.amount), 0);
  const reimbursedExpenses = expenses
    .filter((exp) => exp.reimbursed_status === "Fully reimbursed")
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trip not found</p>
        <Link to="/">
          <Button className="mt-4">Back to Trips</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold">{trip.trip_name}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {trip.city && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>
                  {trip.city}
                  {trip.country && `, ${trip.country}`}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {format(parseISO(trip.beginning_date), "MMM d")} - {format(parseISO(trip.ending_date), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
        <Link to={`/trips/${tripId}/edit`}>
          <Button variant="outline" className="gap-2">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Trip Fee</div>
              <div className="text-2xl font-bold">${trip.fee.toLocaleString()}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
              <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Net</div>
              <div className={`text-2xl font-bold ${trip.fee - totalExpenses >= 0 ? "text-success" : "text-destructive"}`}>
                ${(trip.fee - totalExpenses).toLocaleString()}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Reimbursement Status</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Reimbursable</div>
                <div className="text-xl font-semibold">${reimbursableExpenses.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Reimbursed</div>
                <div className="text-xl font-semibold text-success">${reimbursedExpenses.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Remaining</div>
                <div className="text-xl font-semibold text-warning">
                  ${(reimbursableExpenses - reimbursedExpenses).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Status</h3>
            <div className="flex flex-wrap gap-2">
              {trip.invoice_sent ? (
                <Badge className="bg-success text-success-foreground">Invoice Sent</Badge>
              ) : (
                <Badge variant="secondary">Invoice Not Sent</Badge>
              )}
              {trip.paid ? (
                <Badge className="bg-success text-success-foreground">Paid</Badge>
              ) : (
                <Badge variant="secondary">Not Paid</Badge>
              )}
              {trip.expenses_reimbursed_status === "Yes" && (
                <Badge className="bg-success text-success-foreground">Fully Reimbursed</Badge>
              )}
              {trip.expenses_reimbursed_status === "Partial" && (
                <Badge className="bg-warning text-warning-foreground">Partially Reimbursed</Badge>
              )}
              {trip.expenses_reimbursed_status === "No" && <Badge variant="secondary">Not Reimbursed</Badge>}
            </div>
          </Card>

          {trip.flight_needed && (trip.flight_number || trip.return_flight_number) && (() => {
            const now = new Date();
            const outboundDeparture = trip.departure_time ? new Date(trip.departure_time) : null;
            const returnDeparture = trip.return_departure_time ? new Date(trip.return_departure_time) : null;
            
            // Determine which flight to show
            let activeFlightNumber = trip.flight_number;
            let activeAirline = trip.airline;
            let activeDepartureDate = trip.departure_time;
            
            // If outbound has passed and we have a return flight, show return flight
            if (outboundDeparture && returnDeparture && now > outboundDeparture) {
              activeFlightNumber = trip.return_flight_number;
              activeAirline = trip.return_airline;
              activeDepartureDate = trip.return_departure_time;
            }
            
            return activeFlightNumber && activeDepartureDate ? (
              <FlightStatus 
                flightNumber={activeFlightNumber} 
                airline={activeAirline}
                departureDate={activeDepartureDate}
              />
            ) : null;
          })()}

          {trip.flight_needed && (trip.airline || trip.flight_confirmation || trip.departure_time || trip.arrival_time || 
            trip.return_airline || trip.return_flight_confirmation || trip.return_departure_time || trip.return_arrival_time) && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Plane className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Your Flight Details</h3>
              </div>
              
              <div className="space-y-6">
                {/* Outbound Flight */}
                {(trip.departure_time || trip.arrival_time || trip.flight_confirmation) && (
                  <div>
                    <h4 className="font-medium mb-3">Outbound Flight</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {trip.departure_time && (
                        <div>
                          <div className="text-sm text-muted-foreground">Scheduled Departure</div>
                          <div className="font-medium">{format(new Date(trip.departure_time), "MMM d, yyyy h:mm a")}</div>
                        </div>
                      )}
                      {trip.arrival_time && (
                        <div>
                          <div className="text-sm text-muted-foreground">Scheduled Arrival</div>
                          <div className="font-medium">{format(new Date(trip.arrival_time), "MMM d, yyyy h:mm a")}</div>
                        </div>
                      )}
                      {trip.flight_confirmation && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">Confirmation Number</div>
                          <div className="font-medium">{trip.flight_confirmation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Return Flight */}
                {(trip.return_departure_time || trip.return_arrival_time || trip.return_flight_confirmation) && (
                  <div>
                    <h4 className="font-medium mb-3">Return Flight</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {trip.return_departure_time && (
                        <div>
                          <div className="text-sm text-muted-foreground">Scheduled Departure</div>
                          <div className="font-medium">{format(new Date(trip.return_departure_time), "MMM d, yyyy h:mm a")}</div>
                        </div>
                      )}
                      {trip.return_arrival_time && (
                        <div>
                          <div className="text-sm text-muted-foreground">Scheduled Arrival</div>
                          <div className="font-medium">{format(new Date(trip.return_arrival_time), "MMM d, yyyy h:mm a")}</div>
                        </div>
                      )}
                      {trip.return_flight_confirmation && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">Confirmation Number</div>
                          <div className="font-medium">{trip.return_flight_confirmation}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {trip.hotel_needed && trip.hotel_name && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Hotel className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Hotel Information</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Hotel Name</div>
                  <div className="font-medium">{trip.hotel_name}</div>
                </div>
                {trip.hotel_booking_service && (
                  <div>
                    <div className="text-sm text-muted-foreground">Booking Service</div>
                    <div className="font-medium">{trip.hotel_booking_service}</div>
                  </div>
                )}
                {trip.hotel_address && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Address</div>
                    <div className="font-medium">{trip.hotel_address}</div>
                  </div>
                )}
                {trip.hotel_checkin_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Check-in</div>
                    <div className="font-medium">{format(parseISO(trip.hotel_checkin_date), "MMM d, yyyy")}</div>
                  </div>
                )}
                {trip.hotel_checkout_date && (
                  <div>
                    <div className="text-sm text-muted-foreground">Check-out</div>
                    <div className="font-medium">{format(parseISO(trip.hotel_checkout_date), "MMM d, yyyy")}</div>
                  </div>
                )}
                {trip.hotel_confirmation && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Confirmation Number</div>
                    <div className="font-medium">{trip.hotel_confirmation}</div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {trip.car_needed && trip.car_rental_company && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Car Rental Information</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Rental Company</div>
                  <div className="font-medium">{trip.car_rental_company}</div>
                </div>
                {trip.car_booking_service && (
                  <div>
                    <div className="text-sm text-muted-foreground">Booking Service</div>
                    <div className="font-medium">{trip.car_booking_service}</div>
                  </div>
                )}
                {trip.car_pickup_location && (
                  <div>
                    <div className="text-sm text-muted-foreground">Pickup Location</div>
                    <div className="font-medium">{trip.car_pickup_location}</div>
                  </div>
                )}
                {trip.car_dropoff_location && (
                  <div>
                    <div className="text-sm text-muted-foreground">Drop-off Location</div>
                    <div className="font-medium">{trip.car_dropoff_location}</div>
                  </div>
                )}
                {trip.car_pickup_datetime && (
                  <div>
                    <div className="text-sm text-muted-foreground">Pickup</div>
                    <div className="font-medium">{format(new Date(trip.car_pickup_datetime), "MMM d, yyyy h:mm a")}</div>
                  </div>
                )}
                {trip.car_dropoff_datetime && (
                  <div>
                    <div className="text-sm text-muted-foreground">Drop-off</div>
                    <div className="font-medium">{format(new Date(trip.car_dropoff_datetime), "MMM d, yyyy h:mm a")}</div>
                  </div>
                )}
                {trip.car_confirmation && (
                  <div className="md:col-span-2">
                    <div className="text-sm text-muted-foreground">Confirmation Number</div>
                    <div className="font-medium">{trip.car_confirmation}</div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="itinerary" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Trip Itinerary</h3>
            <Link to={`/trips/${tripId}/itinerary/new`}>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </Link>
          </div>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Sync itinerary to Google Calendar</div>
                <div className="text-xs text-muted-foreground">
                  Automatically add new itinerary items as calendar events
                </div>
              </div>
              <Switch
                checked={trip.sync_itinerary_to_calendar || false}
                onCheckedChange={handleToggleItinerarySync}
              />
            </div>
          </Card>
          
          {itineraryItems.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No itinerary items yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {itineraryItems.map((item) => (
                <Card key={item.itinerary_id} className="p-4">
                  <div className="flex gap-4">
                    <div className="text-sm text-muted-foreground min-w-24">
                      <div className="font-medium">{format(parseISO(item.date), "MMM d")}</div>
                      {item.start_time && <div>{item.start_time.slice(0, 5)}</div>}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{item.item_type}</Badge>
                        <h4 className="font-semibold">{item.title}</h4>
                      </div>
                      {item.location_name && <p className="text-sm text-muted-foreground">{item.location_name}</p>}
                      {item.description && <p className="text-sm mt-2">{item.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/itinerary/${item.itinerary_id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteItineraryItem(item.itinerary_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Trip Expenses</h3>
            <Link to={`/trips/${tripId}/expenses/new`}>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Expense
              </Button>
            </Link>
          </div>
          {expenses.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No expenses tracked yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <Card key={expense.expense_id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{expense.merchant}</span>
                        <Badge variant="outline">{expense.category}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">{format(parseISO(expense.date), "MMM d, yyyy")}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">${expense.amount}</div>
                      {expense.reimbursable && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {expense.reimbursed_status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/expenses/${expense.expense_id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteExpense(expense.expense_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Internal Notes</h3>
            {trip.internal_notes ? (
              <p className="whitespace-pre-wrap text-sm">{trip.internal_notes}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No notes added yet</p>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
