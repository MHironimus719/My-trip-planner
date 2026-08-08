import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const STATUS_OPTIONS = [
  { value: "all", label: "All expenses" },
  { value: "pending", label: "Pending reimbursement" },
  { value: "Not submitted", label: "Not submitted" },
  { value: "Submitted", label: "Submitted" },
  { value: "Partially reimbursed", label: "Partially reimbursed" },
  { value: "Fully reimbursed", label: "Fully reimbursed" },
  { value: "non-reimbursable", label: "Non-reimbursable" },
];

interface TripOption {
  trip_id: string;
  trip_name: string;
}

interface ExpenseFiltersProps {
  searchKeyword: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  tripFilter: string;
  onTripChange: (v: string) => void;
  tripOptions: TripOption[];
  shownCount: number;
  totalCount: number;
  hasFilters: boolean;
  onClear: () => void;
}

export function ExpenseFilters({
  searchKeyword,
  onSearchChange,
  statusFilter,
  onStatusChange,
  tripFilter,
  onTripChange,
  tripOptions,
  shownCount,
  totalCount,
  hasFilters,
  onClear,
}: ExpenseFiltersProps) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <Input
          placeholder="Search by trip name, event, city, merchant, or expense type..."
          value={searchKeyword}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger>
            <SelectValue placeholder="Reimbursement status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tripFilter} onValueChange={onTripChange}>
          <SelectTrigger>
            <SelectValue placeholder="Trip" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trips</SelectItem>
            {tripOptions.map((t) => (
              <SelectItem key={t.trip_id} value={t.trip_id}>
                {t.trip_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {shownCount} of {totalCount} expenses
          </span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      )}
    </Card>
  );
}
