import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
import { useToast } from "@/hooks/use-toast";

interface Trip {
  trip_id: string;
  trip_name: string;
  city: string;
  country: string;
  beginning_date: string;
  ending_date: string;
}

interface Expense {
  expense_id: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  description: string;
  receipt_url: string | null;
  payment_method: string;
}

export default function Reports() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTrips();
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTripId) {
      fetchExpenses(selectedTripId);
    }
  }, [selectedTripId]);

  const fetchTrips = async () => {
    const { data, error } = await supabase
      .from("trips")
      .select("trip_id, trip_name, city, country, beginning_date, ending_date")
      .order("beginning_date", { ascending: false });

    if (!error && data) {
      setTrips(data);
      if (data.length > 0) {
        setSelectedTripId(data[0].trip_id);
      }
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("company_logo_url")
      .eq("id", user?.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  const fetchExpenses = async (tripId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("trip_id", tripId)
      .order("date", { ascending: true });

    if (!error && data) {
      setExpenses(data);
    }
    setLoading(false);
  };

  const generatePDF = async () => {
    if (!selectedTripId || expenses.length === 0) {
      toast({
        title: "No data to export",
        description: "Please select a trip with expenses",
        variant: "destructive",
      });
      return;
    }

    const selectedTrip = trips.find((t) => t.trip_id === selectedTripId);
    if (!selectedTrip) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Add company logo if available
    if (profile?.company_logo_url) {
      try {
        // Generate signed URL for the logo - handle both legacy full URLs and new file paths
        let filePath = profile.company_logo_url;
        if (filePath.includes('/company-logos/')) {
          filePath = filePath.split('/company-logos/')[1];
        }
        
        const { data: signedData, error } = await supabase.storage
          .from('company-logos')
          .createSignedUrl(filePath, 3600);
        
        let logoUrl: string | null = null;
        if (!error && signedData?.signedUrl) {
          logoUrl = signedData.signedUrl;
        } else {
          console.error('Error generating signed URL:', error);
        }
        
        if (!logoUrl) {
          throw new Error('Could not generate signed URL for logo');
        }
        
        const logoResponse = await fetch(logoUrl);
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        
        // Calculate proper logo dimensions maintaining aspect ratio
        const img = new Image();
        await new Promise((resolve) => {
          img.onload = resolve;
          img.src = logoDataUrl;
        });
        
        const maxWidth = 40;
        const maxHeight = 30;
        let logoWidth = maxWidth;
        let logoHeight = (img.height / img.width) * maxWidth;
        
        if (logoHeight > maxHeight) {
          logoHeight = maxHeight;
          logoWidth = (img.width / img.height) * maxHeight;
        }
        
        pdf.addImage(logoDataUrl, "PNG", 15, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5;
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    }

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Detailed Expense Report", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Trip info
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Trip: ${selectedTrip.trip_name}`, 15, yPos);
    yPos += 7;
    pdf.text(
      `Location: ${selectedTrip.city || ""}, ${selectedTrip.country || ""}`,
      15,
      yPos
    );
    yPos += 7;
    pdf.text(
      `Dates: ${format(parseISO(selectedTrip.beginning_date), "MMM d, yyyy")} - ${format(
        parseISO(selectedTrip.ending_date),
        "MMM d, yyyy"
      )}`,
      15,
      yPos
    );
    yPos += 15;

    // Table header
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Date", 15, yPos);
    pdf.text("Merchant", 45, yPos);
    pdf.text("Category", 95, yPos);
    pdf.text("Payment", 130, yPos);
    pdf.text("Amount", 170, yPos);
    yPos += 3;
    pdf.line(15, yPos, 195, yPos);
    yPos += 7;

    // Expenses
    pdf.setFont("helvetica", "normal");
    let total = 0;

    for (const expense of expenses) {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.text(format(parseISO(expense.date), "MMM d"), 15, yPos);
      pdf.text(expense.merchant.substring(0, 20), 45, yPos);
      pdf.text(expense.category.substring(0, 15), 95, yPos);
      pdf.text(expense.payment_method?.substring(0, 12) || "N/A", 130, yPos);
      pdf.text(`$${Number(expense.amount).toFixed(2)}`, 170, yPos);

      total += Number(expense.amount);
      yPos += 7;

      if (expense.description) {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(expense.description.substring(0, 60), 45, yPos);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;
      }
    }

    // Total
    yPos += 5;
    pdf.line(15, yPos, 195, yPos);
    yPos += 7;
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL:", 130, yPos);
    pdf.text(`$${total.toFixed(2)}`, 170, yPos);

    // Add receipt images section
    const expensesWithReceipts = expenses.filter(exp => exp.receipt_url);
    console.log("Expenses with receipts:", expensesWithReceipts.length);
    
    if (expensesWithReceipts.length > 0) {
      pdf.addPage();
      yPos = 20;
      
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Receipt Images", pageWidth / 2, yPos, { align: "center" });
      yPos += 15;
      
      for (const expense of expensesWithReceipts) {
        try {
          console.log("Loading receipt for:", expense.merchant, expense.receipt_url);
          
          const receiptResponse = await fetch(expense.receipt_url!);
          if (!receiptResponse.ok) {
            throw new Error(`Failed to fetch receipt: ${receiptResponse.status}`);
          }
          
          const receiptBlob = await receiptResponse.blob();
          console.log("Receipt blob type:", receiptBlob.type);
          
          const receiptDataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(receiptBlob);
          });
          
          // Calculate receipt image dimensions
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = receiptDataUrl;
          });
          
          console.log("Image loaded:", img.width, "x", img.height);
          
          const maxWidth = 170;
          const maxHeight = 200;
          let receiptWidth = maxWidth;
          let receiptHeight = (img.height / img.width) * maxWidth;
          
          if (receiptHeight > maxHeight) {
            receiptHeight = maxHeight;
            receiptWidth = (img.width / img.height) * maxHeight;
          }
          
          // Check if we need a new page
          if (yPos + receiptHeight + 20 > 280) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Add expense info
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          pdf.text(`${expense.merchant} - ${format(parseISO(expense.date), "MMM d, yyyy")} - $${Number(expense.amount).toFixed(2)}`, 15, yPos);
          yPos += 7;
          
          // Detect image format from blob type or data URL
          let imageFormat = "PNG";
          if (receiptBlob.type.includes("jpeg") || receiptBlob.type.includes("jpg")) {
            imageFormat = "JPEG";
          } else if (receiptBlob.type.includes("png")) {
            imageFormat = "PNG";
          }
          
          // Add receipt image centered
          const xPos = (pageWidth - receiptWidth) / 2;
          pdf.addImage(receiptDataUrl, imageFormat, xPos, yPos, receiptWidth, receiptHeight);
          yPos += receiptHeight + 15;
          
          console.log("Receipt added successfully");
          
        } catch (error) {
          console.error("Error loading receipt for", expense.merchant, ":", error);
        }
      }
    }

    // Save
    const fileName = `${selectedTrip.trip_name.replace(/[^a-z0-9]/gi, "_")}_Expense_Report.pdf`;
    pdf.save(fileName);

    toast({
      title: "Report generated",
      description: "Your expense report has been downloaded",
    });
  };

  const selectedTrip = trips.find((t) => t.trip_id === selectedTripId);
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Expense Reports</h2>
          <p className="text-muted-foreground mt-1">Generate detailed expense reports for your trips</p>
        </div>
        <Button onClick={generatePDF} disabled={!selectedTripId || expenses.length === 0} className="gap-2">
          <Download className="w-4 h-4" />
          Download PDF
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Trip</label>
            <Select value={selectedTripId} onValueChange={setSelectedTripId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a trip" />
              </SelectTrigger>
              <SelectContent>
                {trips.map((trip) => (
                  <SelectItem key={trip.trip_id} value={trip.trip_id}>
                    {trip.trip_name} - {format(parseISO(trip.beginning_date), "MMM yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTrip && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">{selectedTrip.trip_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedTrip.city}, {selectedTrip.country}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(selectedTrip.beginning_date), "MMM d, yyyy")} -{" "}
                {format(parseISO(selectedTrip.ending_date), "MMM d, yyyy")}
              </p>
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : expenses.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">No expenses found</h3>
            <p className="text-muted-foreground">
              This trip doesn't have any expenses yet. Add expenses to generate a report.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Expense Summary</h3>
              <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            </div>
            <div className="text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""} total
            </div>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold mb-3">Expense Details</h3>
            {expenses.map((expense) => (
              <Card key={expense.expense_id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{expense.merchant}</span>
                      <span className="text-xs px-2 py-1 bg-secondary rounded">
                        {expense.category}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(parseISO(expense.date), "MMM d, yyyy")} • {expense.payment_method}
                    </div>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground mt-2">{expense.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-lg">${Number(expense.amount).toFixed(2)}</div>
                    {expense.receipt_url && (
                      <a
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        View receipt
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
