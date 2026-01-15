import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";
import { parseISO } from "date-fns";

export function TripsDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    unpaidInvoices: 0,
    ytdPaidInvoices: 0,
    ytdUnderContract: 0,
    pendingReimbursements: 0,
    upcomingTrips: 0,
  });
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

  const kpiCards = [
    {
      title: "Unpaid Invoices",
      value: `$${kpis.unpaidInvoices.toLocaleString()}`,
      icon: Receipt,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "YTD Paid Invoices",
      value: `$${kpis.ytdPaidInvoices.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "YTD Under Contract",
      value: `$${kpis.ytdUnderContract.toLocaleString()}`,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Reimbursements",
      value: `$${kpis.pendingReimbursements.toLocaleString()}`,
      icon: Receipt,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Upcoming Trips",
      value: kpis.upcomingTrips.toString(),
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title} className="p-6">
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
  );
}
