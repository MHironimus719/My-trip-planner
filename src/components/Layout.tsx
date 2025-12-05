import { MobileNav } from "./MobileNav";
import { LogOut, Plane, Settings, DollarSign, FileText, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useNavigate } from "react-router-dom";
import { NavLink } from "./NavLink";

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { tier, isAdmin } = useSubscription();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold">My Trip Planner</h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <NavLink
                to="/dashboard"
                end
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                activeClassName="text-primary-foreground bg-primary font-semibold"
              >
                <Plane className="w-4 h-4 inline mr-2" />
                Trips
              </NavLink>
              <NavLink
                to="/expenses"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                activeClassName="text-primary-foreground bg-primary font-semibold"
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Expenses
              </NavLink>
              <NavLink
                to="/reports"
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                activeClassName="text-primary-foreground bg-primary font-semibold"
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Reports
              </NavLink>
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  activeClassName="text-primary-foreground bg-primary font-semibold"
                >
                  <Shield className="w-4 h-4 inline mr-2" />
                  Admin
                </NavLink>
              )}
            </nav>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <Badge variant={tier === 'free' ? 'secondary' : 'default'} className="capitalize">
              {isAdmin ? 'Admin' : tier}
            </Badge>
            <NavLink
              to="/settings"
              className="flex gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              activeClassName="text-primary-foreground bg-primary font-semibold"
            >
              <Settings className="w-4 h-4" />
              Settings
            </NavLink>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
