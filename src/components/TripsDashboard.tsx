import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

type Trip = Tables<"trips">;
type DrilldownKey = "unpaid" | "ytdPaid" | "ytdContract" | "upcoming";

export function TripsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState({
    unpaidInvoices: 0,
    ytdPaidInvoices: 0,
    ytdUnderContract: 0,
    pendingReimbursements: 0,
    upcomingTrips: 0,
  });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drilldown, setDrilldown] = useState<DrilldownKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchKPIs();
    }
  }, [user]);

  const fetchKPIs = async () => {
    try {
      // Fetch all trips
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("*");

      if (tripsError) throw tripsError;

      // Fetch all expenses with trip information
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("amount, reimbursable, reimbursed_status, trip_id, date");

      if (expensesError) throw expensesError;

      // Calculate KPIs
      const currentYear = new Date().getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day for date-only comparisons

      const unpaidInvoices = trips
        ?.filter((t) => t.invoice_sent && !t.paid)
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      // YTD Paid Invoices - only trips from current year that are paid
      const ytdPaidInvoices = trips
        ?.filter((t) => {
          const tripYear = parseISO(t.beginning_date).getFullYear();
          return tripYear === currentYear && t.paid;
        })
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      // YTD Under Contract - current year trips that are not paid and not cancelled
      const ytdUnderContract = trips
        ?.filter((t) => {
          const tripYear = parseISO(t.beginning_date).getFullYear();
          return tripYear === currentYear && !t.paid && !t.cancelled;
        })
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      const pendingReimbursements = expenses
        ?.filter((e) => e.reimbursable && e.reimbursed_status !== "Fully reimbursed")
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const upcomingTrips = trips
        ?.filter((t) => {
          const isUpcoming = parseISO(t.beginning_date) >= today;
          const isNotCancelled = !t.cancelled;
          console.log(`Trip: ${t.trip_name}, Beginning: ${t.beginning_date}, Upcoming: ${isUpcoming}, Cancelled: ${t.cancelled}, Include: ${isUpcoming && isNotCancelled}`);
          return isUpcoming && isNotCancelled;
        })
        .length || 0;

      console.log(`Total upcoming trips count: ${upcomingTrips}`);

      setTrips(trips || []);
      setKpis({
        unpaidInvoices,
        ytdPaidInvoices,
        ytdUnderContract,
        pendingReimbursements,
        upcomingTrips,
      });
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const drilldownConfig: Record<DrilldownKey, { title: string; trips: Trip[] }> = {
    unpaid: {
      title: "Unpaid Invoices",
      trips: trips.filter((t) => t.invoice_sent && !t.paid),
    },
    ytdPaid: {
      title: "YTD Paid Invoices",
      trips: trips.filter(
        (t) => parseISO(t.beginning_date).getFullYear() === currentYear && t.paid
      ),
    },
    ytdContract: {
      title: "YTD Under Contract",
      trips: trips.filter(
        (t) =>
          parseISO(t.beginning_date).getFullYear() === currentYear &&
          !t.paid &&
          !t.cancelled
      ),
    },
    upcoming: {
      title: "Upcoming Trips",
      trips: trips.filter(
        (t) => parseISO(t.beginning_date) >= today && !t.cancelled
      ),
    },
  };

  const kpiCards = [
    {
      title: "Unpaid Invoices",
      value: `$${kpis.unpaidInvoices.toLocaleString()}`,
      icon: Receipt,
      color: "text-warning",
      bgColor: "bg-warning/10",
      onClick: () => setDrilldown("unpaid"),
    },
    {
      title: "YTD Paid Invoices",
      value: `$${kpis.ytdPaidInvoices.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => setDrilldown("ytdPaid"),
    },
    {
      title: "YTD Under Contract",
      value: `$${kpis.ytdUnderContract.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => setDrilldown("ytdContract"),
    },
    {
      title: "Pending Reimbursements",
      value: `$${kpis.pendingReimbursements.toLocaleString()}`,
      icon: Receipt,
      color: "text-accent",
      bgColor: "bg-accent/10",
      onClick: () => navigate("/expenses?status=pending"),
    },
    {
      title: "Upcoming Trips",
      value: kpis.upcomingTrips.toString(),
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => setDrilldown("upcoming"),
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="h-24 animate-pulse bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.title}
              onClick={kpi.onClick}
              className={`p-6 ${kpi.onClick ? "cursor-pointer transition-colors hover:bg-muted/50" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
                <div className={`${kpi.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={drilldown !== null} onOpenChange={(open) => !open && setDrilldown(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drilldown ? drilldownConfig[drilldown].title : ""}</DialogTitle>
          </DialogHeader>
          {drilldown && (
            <div className="space-y-2">
              {drilldownConfig[drilldown].trips.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No trips in this category.
                </p>
              ) : (
                drilldownConfig[drilldown].trips.map((trip) => (
                  <Card
                    key={trip.trip_id}
                    className="p-4 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => {
                      setDrilldown(null);
                      navigate(`/trips/${trip.trip_id}`);
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{trip.trip_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(trip.beginning_date), "MMM d, yyyy")} –{" "}
                          {format(parseISO(trip.ending_date), "MMM d, yyyy")}
                          {trip.city ? ` · ${trip.city}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">
                          ${Number(trip.fee || 0).toLocaleString()}
                        </p>
                        {trip.cancelled && (
                          <p className="text-xs text-destructive">Cancelled</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
