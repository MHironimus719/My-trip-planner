import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Auth from "./pages/Auth";
import Trips from "./pages/Trips";
import TripDetail from "./pages/TripDetail";
import TripForm from "./pages/TripForm";
import QuickAdd from "./pages/QuickAdd";
import Expenses from "./pages/Expenses";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout><Trips /></Layout></ProtectedRoute>} />
            <Route path="/trips/new" element={<ProtectedRoute><Layout><TripForm /></Layout></ProtectedRoute>} />
            <Route path="/trips/:tripId/edit" element={<ProtectedRoute><Layout><TripForm /></Layout></ProtectedRoute>} />
            <Route path="/trips/:tripId" element={<ProtectedRoute><Layout><TripDetail /></Layout></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><Layout><QuickAdd /></Layout></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute><Layout><Expenses /></Layout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
