import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseAssistant } from "@/components/ExpenseAssistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { expenseSchema } from "@/lib/validations";

export default function ExpenseForm() {
  const navigate = useNavigate();
  const { tripId: urlTripId, expenseId } = useParams();
  const [searchParams] = useSearchParams();
  const tripId = urlTripId || searchParams.get("tripId");
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!expenseId;

  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    trip_id: tripId || "",
    date: new Date().toISOString().split('T')[0],
    merchant: "",
    category: "Meal" as "Car" | "Entertainment" | "Fees" | "Flight" | "Hotel" | "Meal" | "Other" | "Rideshare/Taxi" | "Supplies",
    amount: "",
    payment_method: "Personal Card" as "Personal Card" | "Business Card" | "Company Card" | "Cash" | "Other",
    currency: "USD",
    description: "",
    reimbursable: true,
    reimbursed_status: "Not submitted" as "Not submitted" | "Submitted" | "Partially reimbursed" | "Fully reimbursed",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchTrips();
      if (isEditMode && expenseId) {
        fetchExpense();
      }
    }
  }, [user, expenseId, isEditMode]);

  const fetchTrips = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("trip_id, trip_name, beginning_date, ending_date")
        .order("beginning_date", { ascending: false });

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error("Error fetching trips:", error);
    }
  };

  const fetchExpense = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("expense_id", expenseId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          trip_id: data.trip_id || "",
          date: data.date,
          merchant: data.merchant,
          category: data.category,
          amount: data.amount.toString(),
          payment_method: data.payment_method,
          currency: data.currency,
          description: data.description || "",
          reimbursable: data.reimbursable,
          reimbursed_status: data.reimbursed_status,
          notes: data.notes || "",
        });
      }
    } catch (error) {
      console.error("Error fetching expense:", error);
      toast({
        title: "Error",
        description: "Failed to load expense",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Validate input data
      const validationData = {
        trip_id: formData.trip_id,
        date: formData.date,
        merchant: formData.merchant,
        category: formData.category,
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        currency: formData.currency,
        description: formData.description || undefined,
        notes: formData.notes || undefined,
      };

      const validatedData = expenseSchema.parse(validationData);

      const expenseData = {
        ...formData,
        amount: validatedData.amount,
        user_id: user.id,
      };

      let resultExpenseId = expenseId;
      let error;

      if (isEditMode && expenseId) {
        const result = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("expense_id", expenseId);
        error = result.error;
      } else {
        const result = await supabase
          .from("expenses")
          .insert([expenseData])
          .select("expense_id")
          .single();
        error = result.error;
        resultExpenseId = result.data?.expense_id;
      }

      if (error) throw error;

      // Upload receipt image if we have pending images
      if (pendingImages.length > 0 && resultExpenseId && user.id) {
        try {
          // Take the first image (we store one receipt per expense)
          const imageDataUrl = pendingImages[0];
          
          // Convert base64 to blob
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          
          // Upload to storage
          const filePath = `${user.id}/${resultExpenseId}/receipt.jpg`;
          const { error: uploadError } = await supabase.storage
            .from("expense-receipts")
            .upload(filePath, blob, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            console.error("Error uploading receipt:", uploadError);
          } else {
            // Get signed URL (bucket is private)
            const { data: signedUrlData } = await supabase.storage
              .from("expense-receipts")
              .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

            if (signedUrlData?.signedUrl) {
              // Update expense with receipt URL
              await supabase
                .from("expenses")
                .update({ receipt_url: signedUrlData.signedUrl })
                .eq("expense_id", resultExpenseId);
            }
          }
        } catch (uploadErr) {
          console.error("Error processing receipt image:", uploadErr);
          // Don't fail the whole operation if image upload fails
        }
      }

      toast({
        title: "Success",
        description: isEditMode ? "Expense updated successfully" : "Expense created successfully",
      });

      if (formData.trip_id) {
        navigate(`/trips/${formData.trip_id}`);
      } else {
        navigate("/expenses");
      }
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save expense",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExtractedData = (extractedData: any) => {
    setFormData((prev) => ({
      ...prev,
      ...(extractedData.merchant && { merchant: extractedData.merchant }),
      ...(extractedData.amount !== undefined && { amount: extractedData.amount.toString() }),
      ...(extractedData.date && { date: extractedData.date }),
      ...(extractedData.category && { category: extractedData.category }),
      ...(extractedData.payment_method && { payment_method: extractedData.payment_method }),
      ...(extractedData.description && { description: extractedData.description }),
      ...(extractedData.reimbursable !== undefined && { reimbursable: extractedData.reimbursable }),
      ...(extractedData.currency && { currency: extractedData.currency }),
    }));
  };

  const handleImagesReady = (images: string[]) => {
    setPendingImages(images);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-3xl font-bold">{isEditMode ? "Edit Expense" : "Add Expense"}</h2>
      </div>

      <ExpenseAssistant onDataExtracted={handleExtractedData} onImagesReady={handleImagesReady} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Expense Details</h3>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="trip_id">Trip *</Label>
              <Select
                value={formData.trip_id}
                onValueChange={(value) => setFormData({ ...formData, trip_id: value })}
                required
              >
                <SelectTrigger id="trip_id">
                  <SelectValue placeholder="Select a trip" />
                </SelectTrigger>
                <SelectContent>
                  {trips.map((trip) => (
                    <SelectItem key={trip.trip_id} value={trip.trip_id}>
                      {trip.trip_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant *</Label>
                <Input
                  id="merchant"
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meal">Meal</SelectItem>
                    <SelectItem value="Flight">Flight</SelectItem>
                    <SelectItem value="Hotel">Hotel</SelectItem>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Rideshare/Taxi">Rideshare/Taxi</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Supplies">Supplies</SelectItem>
                    <SelectItem value="Fees">Fees</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger id="payment_method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal Card">Personal Card</SelectItem>
                  <SelectItem value="Business Card">Business Card</SelectItem>
                  <SelectItem value="Company Card">Company Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Reimbursable?</Label>
              <RadioGroup
                value={formData.reimbursable ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, reimbursable: value === "yes" })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="reimbursable_yes" />
                  <Label htmlFor="reimbursable_yes" className="font-normal cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="reimbursable_no" />
                  <Label htmlFor="reimbursable_no" className="font-normal cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.reimbursable && (
              <div className="space-y-2">
                <Label htmlFor="reimbursed_status">Reimbursement Status</Label>
                <Select
                  value={formData.reimbursed_status}
                  onValueChange={(value: any) => setFormData({ ...formData, reimbursed_status: value })}
                >
                  <SelectTrigger id="reimbursed_status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not submitted">Not Submitted</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Partially reimbursed">Partially Reimbursed</SelectItem>
                    <SelectItem value="Fully reimbursed">Fully Reimbursed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : isEditMode ? "Update Expense" : "Save Expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}
