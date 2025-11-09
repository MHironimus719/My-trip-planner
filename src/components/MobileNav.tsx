import { NavLink } from "./NavLink";
import { Plane, DollarSign, Settings, Plus, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16">
        <NavLink
          to="/dashboard"
          end
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          activeClassName="text-primary"
        >
          <Plane className="w-5 h-5" />
          <span className="text-xs">Trips</span>
        </NavLink>
        
        <NavLink
          to="/expenses"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          activeClassName="text-primary font-semibold"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-xs">Expenses</span>
        </NavLink>

        <NavLink
          to="/reports"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          activeClassName="text-primary font-semibold"
        >
          <FileText className="w-5 h-5" />
          <span className="text-xs">Reports</span>
        </NavLink>

        <NavLink
          to="/add"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1"
        >
          <div className="w-12 h-12 -mt-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
        </NavLink>

        <NavLink
          to="/pricing"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          activeClassName="text-primary font-semibold"
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-xs">Pricing</span>
        </NavLink>

        <NavLink
          to="/settings"
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
          activeClassName="text-primary font-semibold"
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
}
