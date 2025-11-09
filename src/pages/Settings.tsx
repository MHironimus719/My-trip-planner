import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { LogOut, Sun, Moon, Upload, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";

export default function Settings() {
  const { signOut, user } = useAuth();
  const { tier, isAdmin, subscriptionEnd, openCustomerPortal, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLogo();
    }
  }, [user]);

  const fetchLogo = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("company_logo_url")
      .eq("id", user?.id)
      .maybeSingle();

    if (data?.company_logo_url) {
      setLogoUrl(data.company_logo_url);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${Math.random()}.${fileExt}`;

    setUploading(true);

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ company_logo_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setLogoUrl(urlData.publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
        <h3 className="text-lg font-semibold mb-4">Company Branding</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo-upload" className="text-base font-medium mb-2 block">
              Company Logo
            </Label>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your company logo to appear on expense reports
            </p>
            
            {logoUrl && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <img 
                  src={logoUrl} 
                  alt="Company logo" 
                  className="h-20 object-contain"
                />
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1"
              />
              <Button disabled={uploading} variant="outline" size="icon">
                {uploading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subscription</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-2 block">Current Plan</Label>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={tier === 'free' ? 'secondary' : 'default'} className="capitalize text-sm px-3 py-1">
                {isAdmin ? 'Admin (Unlimited)' : tier}
              </Badge>
              {subscriptionEnd && !isAdmin && (
                <span className="text-sm text-muted-foreground">
                  Renews {new Date(subscriptionEnd).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          {!isAdmin && (
            <div className="flex gap-2 pt-2">
              {tier === 'free' ? (
                <Button onClick={() => navigate('/pricing')}>
                  Upgrade Plan
                </Button>
              ) : (
                <Button 
                  onClick={async () => {
                    try {
                      await openCustomerPortal();
                    } catch (error) {
                      sonnerToast.error('Failed to open portal. Please try again.');
                    }
                  }}
                  disabled={subLoading}
                >
                  {subLoading ? 'Loading...' : 'Manage Subscription'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Appearance</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="w-5 h-5 text-primary" />
            ) : (
              <Sun className="w-5 h-5 text-primary" />
            )}
            <div>
              <Label htmlFor="theme-toggle" className="text-base font-medium">
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark theme
              </p>
            </div>
          </div>
          <Switch
            id="theme-toggle"
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </Card>

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
