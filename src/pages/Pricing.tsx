import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier, isAdmin, loading, createCheckout } = useSubscription();

  const handleUpgrade = async (priceId: string, tierName: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await createCheckout(priceId);
      toast.success(`Redirecting to checkout for ${tierName} plan...`);
    } catch (error) {
      toast.error('Failed to start checkout. Please try again.');
    }
  };

  const tiers = [
    {
      name: 'Free',
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        'Up to 3 trips',
        'Basic expense tracking',
        'Itinerary planning',
        'Mobile access',
      ],
      cta: 'Get Started',
      current: tier === 'free' && !isAdmin,
      disabled: tier === 'free',
    },
    {
      name: 'Pro',
      price: '$9.99',
      description: 'For frequent travelers',
      features: [
        'Unlimited trips',
        'Advanced expense reports',
        'AI-powered trip planning',
        'Priority support',
        'Export to PDF',
        'Receipt scanning',
      ],
      cta: 'Upgrade to Pro',
      current: tier === 'pro' || isAdmin,
      priceId: SUBSCRIPTION_TIERS.pro.priceId,
      disabled: tier === 'pro' || tier === 'enterprise',
    },
    {
      name: 'Enterprise',
      price: '$29.99',
      description: 'For teams and businesses',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Custom branding',
        'Advanced analytics',
        'API access',
        'Dedicated support',
        'Custom integrations',
      ],
      cta: 'Upgrade to Enterprise',
      current: tier === 'enterprise' || isAdmin,
      priceId: SUBSCRIPTION_TIERS.enterprise.priceId,
      disabled: tier === 'enterprise',
      highlighted: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Select the perfect plan for your travel needs
          </p>
          {isAdmin && (
            <p className="mt-4 text-sm text-primary font-medium">
              🎉 You have unlimited access as an admin
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {tiers.map((tierInfo) => (
            <Card
              key={tierInfo.name}
              className={`relative ${tierInfo.highlighted ? 'border-primary shadow-lg' : ''} ${
                tierInfo.current ? 'ring-2 ring-primary' : ''
              }`}
            >
              {tierInfo.current && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Current Plan
                  </span>
                </div>
              )}
              {tierInfo.highlighted && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{tierInfo.name}</CardTitle>
                <CardDescription>{tierInfo.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tierInfo.price}</span>
                  {tierInfo.price !== '$0' && (
                    <span className="text-muted-foreground">/month</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tierInfo.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={tierInfo.highlighted ? 'default' : 'outline'}
                  disabled={tierInfo.disabled || loading}
                  onClick={() => {
                    if (tierInfo.priceId) {
                      handleUpgrade(tierInfo.priceId, tierInfo.name);
                    } else if (!user) {
                      navigate('/auth');
                    } else {
                      navigate('/');
                    }
                  }}
                >
                  {loading ? 'Loading...' : tierInfo.current ? 'Current Plan' : tierInfo.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            All plans include 30-day money-back guarantee
          </p>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
