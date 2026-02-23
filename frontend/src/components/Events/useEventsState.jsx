import { useMemo, useState } from 'react';

export function useEventsState(events) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const eventTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(events.map((e) => e.type)))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        event.name.toLowerCase().includes(normalizedSearch) ||
        event.description.toLowerCase().includes(normalizedSearch);
      const matchesType = filterType === 'all' || event.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [events, filterType, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    eventTypes,
    filteredEvents,
  };
}

