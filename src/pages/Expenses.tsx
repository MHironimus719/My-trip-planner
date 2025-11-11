import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, DollarSign, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Expense {
  expense_id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  reimbursable: boolean;
  reimbursed_status: string;
  trip_id: string;
}

interface Trip {
  trip_id: string;
  trip_name: string;
  client_or_event?: string;
  city?: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Record<string, Trip>>({});
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  const fetchExpenses = async () => {
    try {
      const [expensesResult, tripsResult] = await Promise.all([
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("trips").select("trip_id, trip_name, client_or_event, city"),
      ]);

      if (expensesResult.error) throw expensesResult.error;
      if (tripsResult.error) throw tripsResult.error;

      setExpenses(expensesResult.data || []);
      
      const tripsMap = (tripsResult.data || []).reduce((acc, trip) => {
        acc[trip.trip_id] = trip;
        return acc;
      }, {} as Record<string, Trip>);
      setTrips(tripsMap);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    if (!searchKeyword) return true;
    
    const keyword = searchKeyword.toLowerCase();
    const trip = trips[exp.trip_id];
    
    // Search across trip name, event/client name, city, and expense category
    const tripName = trip?.trip_name?.toLowerCase() || "";
    const eventName = trip?.client_or_event?.toLowerCase() || "";
    const city = trip?.city?.toLowerCase() || "";
    const category = exp.category?.toLowerCase() || "";
    
    return tripName.includes(keyword) || 
           eventName.includes(keyword) || 
           city.includes(keyword) || 
           category.includes(keyword);
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const reimbursableExpenses = filteredExpenses.filter((exp) => exp.reimbursable).reduce((sum, exp) => sum + Number(exp.amount), 0);
  const reimbursedExpenses = filteredExpenses
    .filter((exp) => exp.reimbursed_status === "Fully reimbursed")
    .reduce((sum, exp) => sum + Number(exp.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">All Expenses</h2>
          <p className="text-muted-foreground mt-1">Track expenses across all trips</p>
        </div>
        <Link to="/expenses/new">
          <Button className="hidden md:flex gap-2">
            <Plus className="w-4 h-4" />
            New Expense
          </Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by trip name, event, city, or expense type..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1"
          />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
          <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Reimbursable</div>
          <div className="text-2xl font-bold text-warning">${reimbursableExpenses.toLocaleString()}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-1">Reimbursed</div>
          <div className="text-2xl font-bold text-success">${reimbursedExpenses.toLocaleString()}</div>
        </Card>
      </div>

      {filteredExpenses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">
              {searchKeyword ? "No matching expenses" : "No expenses yet"}
            </h3>
            <p className="text-muted-foreground">
              {searchKeyword ? "Try adjusting your search keywords" : "Start tracking your trip expenses"}
            </p>
            <Link to="/expenses/new">
              <Button className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Expense
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredExpenses.map((expense) => (
            <Card key={expense.expense_id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{expense.merchant}</span>
                    <Badge variant="outline">{expense.category}</Badge>
                    {trips[expense.trip_id] && (
                      <Link to={`/trips/${expense.trip_id}`}>
                        <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">
                          {trips[expense.trip_id].trip_name}
                        </Badge>
                      </Link>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(parseISO(expense.date), "MMM d, yyyy")}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${expense.amount}</div>
                  {expense.reimbursable && (
                    <Badge
                      variant="secondary"
                      className={`text-xs mt-1 ${
                        expense.reimbursed_status === "Fully reimbursed"
                          ? "bg-success/20 text-success"
                          : expense.reimbursed_status === "Not submitted"
                          ? "bg-muted"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {expense.reimbursed_status}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
