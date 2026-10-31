import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Loader2, ShieldCheck } from "lucide-react";

interface AuthorizationDetails {
  client?: { name?: string } | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
  scope?: string | null;
}

/** The beta `supabase.auth.oauth` namespace lacks stable types; wrap the three calls. */
function oauthApi() {
  return (supabase.auth as unknown as {
    oauth: {
      getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
      denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
    };
  }).oauth;
}

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your identity",
  email: "Share your email address",
  profile: "Share your basic profile",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        if (active) setError("Missing or invalid authorization request.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message || "Could not load this authorization request.");
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message || "The approval could not be completed. Please try again.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect was returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Plane className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Connection request problem</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const clientName = details.client?.name ?? "an app";
  const rawScopes = (details.scope ?? "").split(/\s+/).filter(Boolean);
  const knownScopes = rawScopes.filter((s) => SCOPE_LABELS[s]);
  const unknownScopes = rawScopes.filter((s) => !SCOPE_LABELS[s]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">
            Connect {clientName} to My Trip Planner
          </CardTitle>
          <CardDescription>
            {clientName} will be able to call this app's enabled tools while you are signed in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border p-4 space-y-2">
            <p className="text-sm font-medium">What this allows</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>View your trips, flights, hotels, car rentals, and itinerary</li>
              <li>View your expenses and their reimbursement status</li>
            </ul>
            {knownScopes.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside pt-1">
                {knownScopes.map((s) => (
                  <li key={s}>{SCOPE_LABELS[s]}</li>
                ))}
              </ul>
            )}
            {unknownScopes.length > 0 && (
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside pt-1">
                {unknownScopes.map((s) => (
                  <li key={s}>Additional permission requested: {s}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              This does not bypass this app's permissions or backend policies. Only
              your own account's data is accessible.
            </p>
          </div>
          <div className="space-y-2">
            <Button className="w-full" disabled={busy} onClick={() => decide(true)}>
              {busy ? "Please wait..." : "Approve"}
            </Button>
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => decide(false)}>
              Cancel connection
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
