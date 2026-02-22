import { EventsView } from './EventsView.jsx';
import { mockEvents } from './mockEvents.jsx';
import { useEventsState } from './useEventsState.jsx';

export function Events() {
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    eventTypes,
    filteredEvents,
  } = useEventsState(mockEvents);

  return (
    <EventsView
      events={mockEvents}
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
