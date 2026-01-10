import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { LogOut, Sun, Moon, Upload, Calendar, CheckCircle2 } from "lucide-react";
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
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLogo();
      checkCalendarConnection();
    }
  }, [user]);

  const checkCalendarConnection = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("google_calendar_connected")
      .eq("id", user?.id)
      .maybeSingle();

    if (data?.google_calendar_connected) {
      setCalendarConnected(true);
    }
  };

  const fetchLogo = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("company_logo_url")
      .eq("id", user?.id)
      .maybeSingle();

    if (data?.company_logo_url) {
      // Extract the file path from the URL to generate a signed URL
      try {
        const urlParts = data.company_logo_url.split('/company-logos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { data: signedData, error } = await supabase.storage
            .from('company-logos')
            .createSignedUrl(filePath, 3600); // 1 hour expiry
          
          if (!error && signedData?.signedUrl) {
            setLogoUrl(signedData.signedUrl);
          } else {
            // Fallback to stored URL if signed URL fails
            setLogoUrl(data.company_logo_url);
          }
        } else {
          setLogoUrl(data.company_logo_url);
        }
      } catch (error) {
        console.error('Error generating signed URL:', error);
        setLogoUrl(data.company_logo_url);
      }
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

      // Generate signed URL for the uploaded file (bucket is now private)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("company-logos")
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      if (signedError) throw signedError;

      // Store the file path reference in profile (not the full URL)
      // We store a reference URL that we'll use to generate signed URLs later
      const storageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/company-logos/${fileName}`;
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ company_logo_url: storageUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setLogoUrl(signedData.signedUrl);
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

  const handleConnectCalendar = async () => {
    if (calendarConnected) {
      // Disconnect
      try {
        const { error } = await supabase
          .from("profiles")
          .update({
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
            google_calendar_connected: false,
          })
          .eq("id", user?.id);

        if (error) throw error;

        setCalendarConnected(false);
        sonnerToast.success("Google Calendar disconnected");
      } catch (error: any) {
        sonnerToast.error("Failed to disconnect calendar");
      }
      return;
    }

    // Connect - start OAuth flow
    setConnectingCalendar(true);
    try {
      // Get client ID from edge function
      const { data: configData, error: configError } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'get_auth_url' }
      });

      if (configError || !configData?.authUrl) {
        throw new Error('Failed to get OAuth URL');
      }

      // Open OAuth in new window
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        configData.authUrl,
        'Google Calendar OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'google-oauth-success') {
          const { code } = event.data;
          
          try {
            // Get the current session token
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session?.access_token) {
              throw new Error('No active session found. Please try logging in again.');
            }

            // Exchange code for tokens via edge function with explicit auth
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-oauth`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                },
                body: JSON.stringify({ code }),
              }
            );

            const data = await response.json();

            if (!response.ok || data.error) {
              console.error('Calendar connection error:', data);
              throw new Error(data.error || 'Failed to connect');
            }

            setCalendarConnected(true);
            sonnerToast.success('Google Calendar connected successfully!');
          } catch (error: any) {
            console.error('OAuth callback error:', error);
            sonnerToast.error(error.message || 'Failed to connect Google Calendar');
          } finally {
            popup?.close();
            window.removeEventListener('message', handleMessage);
            setConnectingCalendar(false);
          }
        } else if (event.data?.type === 'google-oauth-error') {
          sonnerToast.error('OAuth authorization failed');
          popup?.close();
          window.removeEventListener('message', handleMessage);
          setConnectingCalendar(false);
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setConnectingCalendar(false);
      }, 300000);
    } catch (error: any) {
      sonnerToast.error('Failed to start OAuth flow');
      setConnectingCalendar(false);
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
        <h3 className="text-lg font-semibold mb-4">Integrations</h3>
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium mb-2 block">Google Calendar</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Automatically sync your trips to Google Calendar
            </p>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleConnectCalendar}
                disabled={connectingCalendar}
                variant={calendarConnected ? "outline" : "default"}
                className="gap-2"
              >
                {calendarConnected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Disconnect Calendar
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    {connectingCalendar ? 'Connecting...' : 'Connect Calendar'}
                  </>
                )}
              </Button>
              {calendarConnected && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </Badge>
              )}
            </div>
          </div>
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
