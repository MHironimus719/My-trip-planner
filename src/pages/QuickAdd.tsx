import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Plane, Calendar, DollarSign } from "lucide-react";

export default function QuickAdd() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Quick Add</h2>
        <p className="text-muted-foreground mt-1">Choose what you'd like to add</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/trips/new">
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary group-hover:scale-110 transition-all">
                <Plane className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">New Trip</h3>
                <p className="text-sm text-muted-foreground mt-1">Plan a new trip with dates and details</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/itinerary/new">
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary group-hover:scale-110 transition-all">
                <Calendar className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Itinerary Item</h3>
                <p className="text-sm text-muted-foreground mt-1">Add a meeting, flight, or event</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/expenses/new">
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary group-hover:scale-110 transition-all">
                <DollarSign className="w-8 h-8 text-primary group-hover:text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Expense</h3>
                <p className="text-sm text-muted-foreground mt-1">Track a trip expense quickly</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
