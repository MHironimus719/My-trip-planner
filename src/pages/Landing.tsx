import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Plane, 
  Receipt, 
  Calendar, 
  Shield, 
  Lock, 
  Cloud,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect authenticated users to the main app
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const benefits = [
    {
      icon: Plane,
      title: "Smart Trip Planning",
      description: "Organize flights, hotels, and car rentals all in one place with AI-powered assistance"
    },
    {
      icon: Receipt,
      title: "Expense Tracking",
      description: "Track expenses in real-time with receipt scanning and automatic categorization"
    },
    {
      icon: Calendar,
      title: "Itinerary Management",
      description: "Create detailed itineraries with booking confirmations and important notes"
    },
    {
      icon: Sparkles,
      title: "AI Assistant",
      description: "Extract trip and expense details from text using advanced AI technology"
    }
  ];

  const securityFeatures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "Your data is encrypted at rest and in transit"
    },
    {
      icon: Shield,
      title: "Secure Authentication",
      description: "Industry-standard authentication with auto token refresh"
    },
    {
      icon: Cloud,
      title: "Cloud Backup",
      description: "Automatic backups ensure your data is never lost"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Professional Travel Management
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            Manage Your Travel
            <span className="block text-primary">Effortlessly</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The all-in-one platform for tracking trips, expenses, and itineraries. 
            Designed for professionals who travel frequently.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button 
              size="lg" 
              className="gap-2 text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2 text-lg px-8"
              onClick={() => navigate('/pricing')}
            >
              View Pricing
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Start with 3 trips free • No credit card required
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features to streamline your travel management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built With Security in Mind
            </h2>
            <p className="text-lg text-muted-foreground">
              Your data is protected with enterprise-grade security
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {securityFeatures.map((feature, index) => (
              <Card key={index} className="p-6 border-2">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified Secure
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <Card className="max-w-4xl mx-auto p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join professionals worldwide who trust our platform to manage their travel. 
              Start with 3 trips completely free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                className="gap-2 text-lg px-8"
                onClick={() => navigate('/auth')}
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Travel Manager. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/pricing')}
              >
                Pricing
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
