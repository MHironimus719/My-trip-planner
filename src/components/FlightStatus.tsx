import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, RefreshCw, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface FlightInfo {
  flightNumber: string;
  airline: string;
  status: string;
  departure: {
    airport: string;
    iata: string;
    terminal: string | null;
    gate: string | null;
    scheduledTime: string | null;
    estimatedTime: string | null;
    actualTime: string | null;
    delay: number | null;
  };
  arrival: {
    airport: string;
    iata: string;
    terminal: string | null;
    gate: string | null;
    scheduledTime: string | null;
    estimatedTime: string | null;
    actualTime: string | null;
    delay: number | null;
  };
  aircraft: {
    type: string | null;
  };
}

interface FlightStatusProps {
  flightNumber: string;
  airline?: string;
}

export function FlightStatus({ flightNumber, airline }: FlightStatusProps) {
  const [flightInfo, setFlightInfo] = useState<FlightInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (flightNumber) {
      fetchFlightStatus();
    }
  }, [flightNumber]);

  const fetchFlightStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: functionError } = await supabase.functions.invoke("get-flight-status", {
        body: { flightNumber },
      });

      if (functionError) throw functionError;

      if (data.error) {
        setError(data.message || data.error);
        return;
      }

      setFlightInfo(data);
    } catch (err: any) {
      console.error("Error fetching flight status:", err);
      setError(err.message || "Failed to fetch flight status");
      toast({
        title: "Error",
        description: "Could not fetch flight status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "active" || statusLower === "scheduled") {
      return <Badge className="bg-success text-success-foreground">On Time</Badge>;
    } else if (statusLower === "landed") {
      return <Badge className="bg-success text-success-foreground">Landed</Badge>;
    } else if (statusLower === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else if (statusLower === "delayed") {
      return <Badge className="bg-warning text-warning-foreground">Delayed</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const formatTime = (time: string | null) => {
    if (!time) return "N/A";
    try {
      return format(new Date(time), "h:mm a");
    } catch {
      return time;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plane className="w-5 h-5 animate-pulse" />
          <h3 className="text-lg font-semibold">Loading Flight Status...</h3>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-warning" />
          <h3 className="text-lg font-semibold">Flight Status</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="grid gap-4 md:grid-cols-2">
            {airline && (
              <div>
                <div className="text-sm text-muted-foreground">Airline</div>
                <div className="font-medium">{airline}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Flight Number</div>
              <div className="font-medium">{flightNumber}</div>
            </div>
          </div>
          <Button onClick={fetchFlightStatus} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (!flightInfo) return null;

  const hasDelay = flightInfo.departure.delay && flightInfo.departure.delay > 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Real-Time Flight Status</h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(flightInfo.status)}
          <Button onClick={fetchFlightStatus} variant="ghost" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {hasDelay && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning rounded-lg flex items-center gap-2">
          <Clock className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium">
            Delayed by {flightInfo.departure.delay} minutes
          </span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground mb-2">Departure</div>
          <div className="space-y-2">
            <div>
              <div className="font-semibold text-lg">
                {flightInfo.departure.airport} ({flightInfo.departure.iata})
              </div>
            </div>
            {flightInfo.departure.terminal && (
              <div className="text-sm">
                <span className="text-muted-foreground">Terminal:</span>{" "}
                <span className="font-medium">{flightInfo.departure.terminal}</span>
              </div>
            )}
            {flightInfo.departure.gate && (
              <div className="text-sm">
                <span className="text-muted-foreground">Gate:</span>{" "}
                <span className="font-medium">{flightInfo.departure.gate}</span>
              </div>
            )}
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{" "}
                <span className="font-medium">{formatTime(flightInfo.departure.scheduledTime)}</span>
              </div>
              {flightInfo.departure.estimatedTime && (
                <div>
                  <span className="text-muted-foreground">Estimated:</span>{" "}
                  <span className="font-medium">{formatTime(flightInfo.departure.estimatedTime)}</span>
                </div>
              )}
              {flightInfo.departure.actualTime && (
                <div>
                  <span className="text-muted-foreground">Actual:</span>{" "}
                  <span className="font-medium">{formatTime(flightInfo.departure.actualTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground mb-2">Arrival</div>
          <div className="space-y-2">
            <div>
              <div className="font-semibold text-lg">
                {flightInfo.arrival.airport} ({flightInfo.arrival.iata})
              </div>
            </div>
            {flightInfo.arrival.terminal && (
              <div className="text-sm">
                <span className="text-muted-foreground">Terminal:</span>{" "}
                <span className="font-medium">{flightInfo.arrival.terminal}</span>
              </div>
            )}
            {flightInfo.arrival.gate && (
              <div className="text-sm">
                <span className="text-muted-foreground">Gate:</span>{" "}
                <span className="font-medium">{flightInfo.arrival.gate}</span>
              </div>
            )}
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Scheduled:</span>{" "}
                <span className="font-medium">{formatTime(flightInfo.arrival.scheduledTime)}</span>
              </div>
              {flightInfo.arrival.estimatedTime && (
                <div>
                  <span className="text-muted-foreground">Estimated:</span>{" "}
                  <span className="font-medium">{formatTime(flightInfo.arrival.estimatedTime)}</span>
                </div>
              )}
              {flightInfo.arrival.actualTime && (
                <div>
                  <span className="text-muted-foreground">Actual:</span>{" "}
                  <span className="font-medium">{formatTime(flightInfo.arrival.actualTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground">Airline</div>
          <div className="font-medium">{flightInfo.airline}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Flight Number</div>
          <div className="font-medium">{flightInfo.flightNumber}</div>
        </div>
        {flightInfo.aircraft.type && (
          <div>
            <div className="text-sm text-muted-foreground">Aircraft</div>
            <div className="font-medium">{flightInfo.aircraft.type}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
