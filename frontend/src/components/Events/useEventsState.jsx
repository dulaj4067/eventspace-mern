import { useMemo, useState } from 'react';

export function useEventsState(events) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const eventTypes = useMemo(() => {
    if (!Array.isArray(events)) return ['all'];
    return ['all', ...Array.from(new Set(events.filter(e => e && e.type).map((e) => e.type)))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      if (!event) return false;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (event.name || '').toLowerCase().includes(normalizedSearch) ||
        (event.description || '').toLowerCase().includes(normalizedSearch);
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

