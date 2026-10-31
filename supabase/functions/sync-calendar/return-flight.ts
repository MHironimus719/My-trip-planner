export type ReturnFlightTrip = {
  trip_id: string;
  trip_name: string;
  ending_date: string;
  timezone?: string | null;
  return_airline?: string | null;
  return_flight_number?: string | null;
  return_departure_time?: string | null;
  return_arrival_time?: string | null;
  return_flight_confirmation?: string | null;
  google_calendar_return_event_id?: string | null;
};

// Date arithmetic here operates on calendar fields, never converts local flight times.
function addWallTime(value: string, milliseconds: number) {
  return new Date(Date.parse(`${value}Z`) + milliseconds).toISOString().slice(0, 19);
}

export function buildReturnFlightEvent(trip: ReturnFlightTrip) {
  const hasReturn = [trip.return_airline, trip.return_flight_number,
    trip.return_departure_time, trip.return_arrival_time, trip.return_flight_confirmation].some(Boolean);
  if (!hasReturn) return null;
  const departure = trip.return_departure_time?.replace(' ', 'T');
  const arrival = trip.return_arrival_time?.replace(' ', 'T');
  const description = [
    `Trip: ${trip.trip_name}`,
    trip.return_airline && `Airline: ${trip.return_airline}`,
    trip.return_flight_number && `Flight: ${trip.return_flight_number}`,
    departure && `Departure: ${departure.replace('T', ' ')}`,
    arrival && `Arrival: ${arrival.replace('T', ' ')}`,
    trip.return_flight_confirmation && `Confirmation: ${trip.return_flight_confirmation}`,
  ].filter(Boolean).join('\n');
  const timeZone = trip.timezone || 'UTC';
  const date = arrival?.slice(0, 10) || trip.ending_date;
  return {
    summary: `Return flight: ${[trip.return_airline, trip.return_flight_number].filter(Boolean).join(' ') || trip.trip_name}`,
    description,
    start: departure ? { dateTime: departure, timeZone } : { date },
    end: departure
      ? { dateTime: arrival && arrival > departure ? arrival : addWallTime(departure, 3600000), timeZone }
      : { date: addWallTime(`${date}T00:00:00`, 86400000).slice(0, 10) },
  };
}

export async function syncReturnFlight(
  trip: ReturnFlightTrip,
  action: 'create' | 'update' | 'delete',
  accessToken: string,
  saveEventId: (id: string | null) => Promise<void>,
  request: typeof fetch = fetch,
) {
  const event = action === 'delete' ? null : buildReturnFlightEvent(trip);
  // Stable Google-compatible ID prevents duplicates when background syncs overlap.
  const eventId = trip.google_calendar_return_event_id || `return${trip.trip_id.replaceAll('-', '')}`;
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const check = async (response: Response) => {
    if (!response.ok) throw new Error(`Google Calendar return flight [${response.status}]: ${await response.text()}`);
  };
  if (!event) {
    if (!trip.google_calendar_return_event_id) return;
    const response = await request(`${base}/${encodeURIComponent(eventId)}`, { method: 'DELETE', headers });
    if (![404, 410].includes(response.status)) await check(response);
    await saveEventId(null);
    return;
  }
  let response = await request(`${base}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH', headers, body: JSON.stringify(event),
  });
  if ([404, 410].includes(response.status)) {
    response = await request(base, { method: 'POST', headers, body: JSON.stringify({ ...event, id: eventId }) });
    if (response.status === 409) {
      response = await request(`${base}/${encodeURIComponent(eventId)}`, { method: 'PATCH', headers, body: JSON.stringify(event) });
    }
  }
  await check(response);
  await saveEventId(eventId);
}