import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TripsDashboard } from "@/components/TripsDashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, DollarSign, Plus, Search } from "lucide-react";
import { format, isFuture, isPast } from "date-fns";

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
}

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const { user } = useAuth();

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
        .order("beginning_date", { ascending: false });

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
          trip.country?.toLowerCase().includes(query)
      );
    }

    // Time filter
    if (timeFilter === "upcoming") {
      filtered = filtered.filter((trip) => isFuture(new Date(trip.beginning_date)));
    } else if (timeFilter === "past") {
      filtered = filtered.filter((trip) => isPast(new Date(trip.ending_date)));
    }

    setFilteredTrips(filtered);
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
        <Link to="/trips/new">
          <Button className="hidden md:flex gap-2">
            <Plus className="w-4 h-4" />
            New Trip
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search trips by name, city, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
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
              <Link to="/trips/new">
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrips.map((trip) => (
            <Link key={trip.trip_id} to={`/trips/${trip.trip_id}`}>
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
                      {format(new Date(trip.beginning_date), "MMM d")} -{" "}
                      {format(new Date(trip.ending_date), "MMM d, yyyy")}
                    </span>
                  </div>

                  {trip.fee > 0 && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="w-4 h-4" />
                      <span>${trip.fee.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
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
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
