import { NavLink } from "./NavLink";
import { Plane, DollarSign, Settings, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-between h-16 px-1">
        <div className="flex items-center flex-1 justify-around">
          <NavLink
            to="/dashboard"
            end
            className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors px-2"
            activeClassName="text-primary"
          >
            <Plane className="w-5 h-5" />
            <span className="text-xs">Trips</span>
          </NavLink>
          
          <NavLink
            to="/expenses"
            className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors px-2"
            activeClassName="text-primary font-semibold"
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs">Expenses</span>
          </NavLink>
        </div>

        <NavLink
          to="/add"
          className="flex flex-col items-center justify-center h-full gap-1 px-2"
        >
          <div className="w-12 h-12 -mt-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-primary-foreground" />
          </div>
        </NavLink>

        <div className="flex items-center flex-1 justify-around">
          <NavLink
            to="/reports"
            className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors px-2"
            activeClassName="text-primary font-semibold"
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs">Reports</span>
          </NavLink>

          <NavLink
            to="/settings"
            className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground hover:text-foreground transition-colors px-2"
            activeClassName="text-primary font-semibold"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
