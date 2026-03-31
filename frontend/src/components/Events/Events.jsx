import { useEffect, useState } from 'react';
import { EventsView } from './EventsView.jsx';
import { useEventsState } from './useEventsState.jsx';
import { getAllEvents } from '../../services/eventService';

export function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await getAllEvents({ status: 'published' });
        setEvents(response.data.data);
      } catch (err) {
        setError('Failed to load events. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    eventTypes,
    filteredEvents,
  } = useEventsState(events);

  if (loading) return <div className="flex justify-center items-center min-h-screen text-purple-600 text-xl">Loading events...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500 text-xl">{error}</div>;

  return (
    <EventsView
      events={events}
      filteredEvents={filteredEvents}
      eventTypes={eventTypes}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      filterType={filterType}
      onFilterTypeChange={setFilterType}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}