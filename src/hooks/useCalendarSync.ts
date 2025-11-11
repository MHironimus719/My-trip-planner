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

      // Sync with calendar
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
        body: { tripId, action }
      });

      if (error) {
        console.error('Calendar sync failed:', error);
        toast.error('Failed to sync trip to Google Calendar');
        return;
      }

      if (action === 'create') {
        toast.success('Trip added to Google Calendar');
      } else if (action === 'update') {
        toast.success('Trip updated in Google Calendar');
      }
    } catch (error) {
      console.error('Calendar sync error:', error);
    }
  }, []);

  return { syncTripToCalendar };
}