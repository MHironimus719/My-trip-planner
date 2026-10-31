import { describe, expect, test } from 'bun:test';
import { buildReturnFlightEvent, syncReturnFlight } from './return-flight';

const trip = {
  trip_id: 'abcdef01-2345-6789-abcd-ef0123456789', trip_name: 'Client visit',
  ending_date: '2026-11-04', timezone: 'America/Los_Angeles',
  return_airline: 'Alaska', return_flight_number: 'AS123',
  return_departure_time: '2026-11-03T23:30:00', return_arrival_time: '2026-11-04T01:30:00',
  return_flight_confirmation: 'RETURN1',
};
describe('separate return flight calendar event', () => {
  test('uses return departure and overnight arrival without converting local times', () => {
    const event = buildReturnFlightEvent(trip);
    expect(event?.start).toEqual({ dateTime: '2026-11-03T23:30:00', timeZone: 'America/Los_Angeles' });
    expect(event?.end).toEqual({ dateTime: '2026-11-04T01:30:00', timeZone: 'America/Los_Angeles' });
    expect(event?.description).toContain('Confirmation: RETURN1');
  });
  test('does not create a return flight when no return information exists', () => {
    expect(buildReturnFlightEvent({ trip_id: trip.trip_id, trip_name: trip.trip_name, ending_date: trip.ending_date })).toBeNull();
  });
  test('creates a missing return event and stores its stable ID', async () => {
    const methods: string[] = [];
    let stored: string | null = null;
    await syncReturnFlight(trip, 'create', 'test', async id => { stored = id; }, (async (_url, options) => {
      methods.push(options?.method || '');
      return new Response('{}', { status: methods.length === 1 ? 404 : 200 });
    }) as typeof fetch);
    expect(methods).toEqual(['PATCH', 'POST']);
    expect(stored).toBe('returnabcdef0123456789abcdef0123456789');
  });
  test('updates the same event rather than creating a duplicate', async () => {
    const methods: string[] = [];
    await syncReturnFlight({ ...trip, google_calendar_return_event_id: 'existing' }, 'update', 'test', async () => {},
      (async (_url, options) => { methods.push(options?.method || ''); return new Response('{}'); }) as typeof fetch);
    expect(methods).toEqual(['PATCH']);
  });
  test('deletes the return event and clears its ID when return information is removed', async () => {
    let stored: string | null = 'existing';
    const methods: string[] = [];
    await syncReturnFlight({ trip_id: trip.trip_id, trip_name: trip.trip_name, ending_date: trip.ending_date,
      google_calendar_return_event_id: 'existing' }, 'update', 'test', async id => { stored = id; },
    (async (_url, options) => { methods.push(options?.method || ''); return new Response(null, { status: 204 }); }) as typeof fetch);
    expect(methods).toEqual(['DELETE']);
    expect(stored).toBeNull();
  });
});