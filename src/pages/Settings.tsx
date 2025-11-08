import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Account Information</h3>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground">Email</div>
            <div className="font-medium">{user?.email}</div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <Button variant="destructive" onClick={handleSignOut} className="gap-2">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </Card>
    </div>
  );
}
