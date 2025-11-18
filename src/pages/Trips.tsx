import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TripsDashboard } from "@/components/TripsDashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar, MapPin, DollarSign, Plus, Search, Crown, Grid, List, X } from "lucide-react";
import { format, isFuture, isPast, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  trip_id: string;
  trip_name: string;
  city: string;
  country: string;
  beginning_date: string;
  ending_date: string;
  fee: number;
  invoice_sent: boolean;
  paid: boolean;
  expenses_reimbursed_status: string;
  cancelled: boolean;
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [tripToCancel, setTripToCancel] = useState<string | null>(null);
  const { user } = useAuth();
  const { tier, isAdmin } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isFreeTierLimitReached = tier === 'free' && !isAdmin && trips.length >= 3;

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  useEffect(() => {
    filterTrips();
  }, [trips, searchQuery, timeFilter]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("beginning_date", { ascending: true });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = [...trips];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (trip) =>
          trip.trip_name.toLowerCase().includes(query) ||
          trip.city?.toLowerCase().includes(query) ||
          trip.country?.toLowerCase().includes(query) ||
          (trip.cancelled && "cancelled".includes(query))
      );
    }

    // Time filter
    if (timeFilter === "cancelled") {
      // Show only cancelled trips
      filtered = filtered.filter((trip) => trip.cancelled);
    } else if (timeFilter === "unpaid") {
      // Show only trips with unpaid invoices (exclude cancelled)
      filtered = filtered.filter((trip) => !trip.cancelled && trip.invoice_sent && !trip.paid);
    } else {
      // Exclude cancelled trips from other views
      filtered = filtered.filter((trip) => !trip.cancelled);
      
      if (timeFilter === "upcoming" || timeFilter === "all") {
        filtered = filtered.filter((trip) => !isPast(parseISO(trip.ending_date)));
      } else if (timeFilter === "past") {
        filtered = filtered.filter((trip) => isPast(parseISO(trip.ending_date)));
      }
    }

    setFilteredTrips(filtered);
  };

  const handleCancelTrip = async () => {
    if (!tripToCancel) return;
    
    try {
      const { error } = await supabase
        .from("trips")
        .update({ cancelled: true })
        .eq("trip_id", tripToCancel);

      if (error) throw error;

      toast({
        title: "Trip cancelled",
        description: "The trip has been marked as cancelled.",
      });

      fetchTrips();
    } catch (error) {
      console.error("Error cancelling trip:", error);
      toast({
        title: "Error",
        description: "Failed to cancel trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTripToCancel(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TripsDashboard />
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Trips</h2>
          <p className="text-muted-foreground mt-1">Track and manage all your trips</p>
        </div>
        <Button 
          className="hidden md:flex gap-2"
          onClick={() => {
            if (isFreeTierLimitReached) {
              setShowUpgradeDialog(true);
            } else {
              navigate('/trips/new');
            }
          }}
        >
          <Plus className="w-4 h-4" />
          New Trip
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search trips by name, city, country, or 'cancelled'..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Upcoming Trips</SelectItem>
              <SelectItem value="past">Past Trips</SelectItem>
              <SelectItem value="unpaid">Unpaid Invoices</SelectItem>
              <SelectItem value="cancelled">Cancelled Trips</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No trips found</h3>
            <p className="text-muted-foreground">
              {searchQuery || timeFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating your first trip"}
            </p>
            {!searchQuery && timeFilter === "all" && (
              <Button 
                className="mt-4"
                onClick={() => {
                  if (isFreeTierLimitReached) {
                    setShowUpgradeDialog(true);
                  } else {
                    navigate('/trips/new');
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <div key={trip.trip_id} className="relative group">
              <Link to={`/trips/${trip.trip_id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg line-clamp-2">{trip.trip_name}</h3>
                      {trip.city && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {trip.city}
                            {trip.country && `, ${trip.country}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(parseISO(trip.beginning_date), "MMM d")} -{" "}
                        {format(parseISO(trip.ending_date), "MMM d, yyyy")}
                      </span>
                    </div>

                    {trip.fee > 0 && (
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="w-4 h-4" />
                        <span>${trip.fee.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {trip.cancelled ? (
                        <Badge variant="destructive">Cancelled</Badge>
                      ) : (
                        <>
                          {trip.paid ? (
                            <Badge className="bg-success text-success-foreground">Paid</Badge>
                          ) : trip.invoice_sent ? (
                            <Badge className="bg-warning text-warning-foreground">Invoice Sent</Badge>
                          ) : null}

                          {trip.expenses_reimbursed_status === "Yes" && (
                            <Badge className="bg-success text-success-foreground">Reimbursed</Badge>
                          )}
                          {trip.expenses_reimbursed_status === "Partial" && (
                            <Badge className="bg-warning text-warning-foreground">Partial Reimburse</Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
              {!trip.cancelled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTripToCancel(trip.trip_id);
                  }}
                  title="Cancel trip"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTrips.map((trip) => (
            <div key={trip.trip_id} className="relative group">
              <Link to={`/trips/${trip.trip_id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{trip.trip_name}</h3>
                      {trip.city && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">
                            {trip.city}
                            {trip.country && `, ${trip.country}`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {format(parseISO(trip.beginning_date), "MMM d")} -{" "}
                          {format(parseISO(trip.ending_date), "MMM d, yyyy")}
                        </span>
                        <span className="sm:hidden">
                          {format(parseISO(trip.beginning_date), "MMM d")}
                        </span>
                      </div>

                      {trip.fee > 0 && (
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="w-4 h-4" />
                          <span>${trip.fee.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {trip.cancelled ? (
                          <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                        ) : (
                          <>
                            {trip.paid && (
                              <Badge className="bg-success text-success-foreground text-xs">Paid</Badge>
                            )}
                            {!trip.paid && trip.invoice_sent && (
                              <Badge className="bg-warning text-warning-foreground text-xs">Invoice Sent</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
              {!trip.cancelled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTripToCancel(trip.trip_id);
                  }}
                  title="Cancel trip"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

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
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <AlertDialogAction onClick={() => navigate('/pricing')}>
              View Pricing Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!tripToCancel} onOpenChange={(open) => !open && setTripToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this trip? The trip will be removed from your dashboard but will remain searchable in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setTripToCancel(null)}>
              No
            </Button>
            <AlertDialogAction onClick={handleCancelTrip}>
              Yes, Cancel Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
