import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import TripForm from "./pages/TripForm";
import ItineraryForm from "./pages/ItineraryForm";
import ExpenseForm from "./pages/ExpenseForm";
import QuickAdd from "./pages/QuickAdd";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";
import OAuthCallback from "./pages/OAuthCallback";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <SubscriptionProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />
                <Route path="/install" element={<Install />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/dashboard" element={<ProtectedRoute><Layout><Trips /></Layout></ProtectedRoute>} />
                <Route path="/trips/new" element={<ProtectedRoute><Layout><TripForm /></Layout></ProtectedRoute>} />
                <Route path="/trips/:tripId/edit" element={<ProtectedRoute><Layout><TripForm /></Layout></ProtectedRoute>} />
                <Route path="/trips/:tripId" element={<ProtectedRoute><Layout><TripDetail /></Layout></ProtectedRoute>} />
                <Route path="/trips/:tripId/itinerary/new" element={<ProtectedRoute><Layout><ItineraryForm /></Layout></ProtectedRoute>} />
                <Route path="/trips/:tripId/expenses/new" element={<ProtectedRoute><Layout><ExpenseForm /></Layout></ProtectedRoute>} />
                <Route path="/itinerary/new" element={<ProtectedRoute><Layout><ItineraryForm /></Layout></ProtectedRoute>} />
                <Route path="/itinerary/:itemId/edit" element={<ProtectedRoute><Layout><ItineraryForm /></Layout></ProtectedRoute>} />
                <Route path="/expenses/new" element={<ProtectedRoute><Layout><ExpenseForm /></Layout></ProtectedRoute>} />
                <Route path="/expenses/:expenseId/edit" element={<ProtectedRoute><Layout><ExpenseForm /></Layout></ProtectedRoute>} />
                <Route path="/add" element={<ProtectedRoute><Layout><QuickAdd /></Layout></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
