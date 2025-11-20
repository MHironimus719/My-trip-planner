import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCalendarSync() {
  const syncTripToCalendar = useCallback(async (tripId: string, action: 'create' | 'update' | 'delete') => {
    try {
      // Check if user has calendar connected
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_calendar_connected')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.google_calendar_connected) {
        return; // Silently skip if not connected
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Calendar sync timeout')), 5000);
      });

      // Race between the actual sync and timeout
      const syncPromise = supabase.functions.invoke('sync-calendar', {
        body: { tripId, action }
      });

      const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Calendar sync failed:', error);
        return;
      }

      if (action === 'create') {
        toast.success('Trip added to Google Calendar');
      } else if (action === 'update') {
        toast.success('Trip updated in Google Calendar');
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
      // Silently fail - don't block the UI
    }
  }, []);

  const syncItineraryToCalendar = useCallback(async (tripId: string, itineraryItemId: string, action: 'sync_itinerary_item' | 'delete_itinerary_item') => {
    try {
      // Check if user has calendar connected
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_calendar_connected')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.google_calendar_connected) {
        return; // Silently skip if not connected
      }

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Calendar sync timeout')), 5000);
      });

      // Race between the actual sync and timeout
      const syncPromise = supabase.functions.invoke('sync-calendar', {
        body: { tripId, itineraryItemId, action }
      });

      const { data, error } = await Promise.race([syncPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Itinerary calendar sync failed:', error);
        return;
      }

      if (action === 'sync_itinerary_item' && data?.message !== 'Itinerary sync is disabled for this trip') {
        toast.success('Itinerary item synced to Google Calendar');
      }
    } catch (error) {
      console.error('Itinerary calendar sync error:', error);
      // Silently fail - don't block the UI
    }
  }, []);

  return { syncTripToCalendar, syncItineraryToCalendar };
}