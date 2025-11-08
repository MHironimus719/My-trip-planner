import { MobileNav } from "./MobileNav";
import { LogOut, Plane } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";

export function Layout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold">My Trip Planner</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="hidden md:flex gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}
