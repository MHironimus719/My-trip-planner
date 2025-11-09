import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

type SubscriptionTier = 'free' | 'pro' | 'enterprise';

interface SubscriptionContextType {
  tier: SubscriptionTier;
  isSubscribed: boolean;
  isAdmin: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const SUBSCRIPTION_TIERS = {
  pro: {
    priceId: 'price_1SRLJ0DAZiZpMiexaU6J5qNG',
    name: 'Pro',
    price: '$9.99',
  },
  enterprise: {
    priceId: 'price_1SRLJ0DAZiZpMiexGhJpwc6p',
    name: 'Enterprise',
    price: '$29.99',
  },
};

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = async () => {
    if (!user) {
      setTier('free');
      setIsSubscribed(false);
      setIsAdmin(false);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        // Check if it's an auth error
        if (error.message?.includes('Auth session missing') || error.message?.includes('Authentication error')) {
          console.error('Session expired, user needs to re-authenticate');
          // Set to free tier silently - user will see they need to upgrade
          setTier('free');
          setIsSubscribed(false);
          setIsAdmin(false);
          setSubscriptionEnd(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      setTier(data.tier || 'free');
      setIsSubscribed(data.subscribed || false);
      setIsAdmin(data.is_admin || false);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setTier('free');
      setIsSubscribed(false);
      setIsAdmin(false);
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  };

  useEffect(() => {
    checkSubscription();

    // Check subscription every 60 seconds
    const interval = setInterval(checkSubscription, 60000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        isSubscribed,
        isAdmin,
        subscriptionEnd,
        loading,
        checkSubscription,
        createCheckout,
        openCustomerPortal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export { SUBSCRIPTION_TIERS };
