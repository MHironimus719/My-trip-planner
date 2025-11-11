import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";

export function TripsDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState({
    unpaidInvoices: 0,
    paidInvoices: 0,
    ytdEarnings: 0,
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

      const unpaidInvoices = trips
        ?.filter((t) => t.invoice_sent && !t.paid)
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      const paidInvoices = trips
        ?.filter((t) => t.paid)
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      const ytdTripEarnings = trips
        ?.filter((t) => {
          const tripYear = new Date(t.beginning_date).getFullYear();
          return tripYear === currentYear;
        })
        .reduce((sum, t) => sum + (t.fee || 0), 0) || 0;

      // Calculate YTD non-reimbursable expenses
      const ytdNonReimbursableExpenses = expenses
        ?.filter((e) => {
          if (e.reimbursable) return false; // Only count non-reimbursable
          const expenseYear = new Date(e.date).getFullYear();
          return expenseYear === currentYear;
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      // Calculate YTD Net Earnings (earnings minus non-reimbursable expenses)
      const ytdNetEarnings = ytdTripEarnings - ytdNonReimbursableExpenses;

      const pendingReimbursements = expenses
        ?.filter((e) => e.reimbursable && e.reimbursed_status !== "Fully reimbursed")
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const upcomingTrips = trips
        ?.filter((t) => {
          const isUpcoming = new Date(t.beginning_date) >= today;
          const isNotCancelled = !t.cancelled;
          console.log(`Trip: ${t.trip_name}, Beginning: ${t.beginning_date}, Upcoming: ${isUpcoming}, Cancelled: ${t.cancelled}, Include: ${isUpcoming && isNotCancelled}`);
          return isUpcoming && isNotCancelled;
        })
        .length || 0;

      console.log(`Total upcoming trips count: ${upcomingTrips}`);

      setKpis({
        unpaidInvoices,
        paidInvoices,
        ytdEarnings: ytdNetEarnings,
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
      title: "Paid Invoices",
      value: `$${kpis.paidInvoices.toLocaleString()}`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "YTD Net Earnings",
      value: `$${kpis.ytdEarnings.toLocaleString()}`,
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
