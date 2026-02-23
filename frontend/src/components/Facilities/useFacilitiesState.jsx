import { useMemo, useState } from 'react';

export function useFacilitiesState({ facilities, facilityLocations }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const facilityTypes = useMemo(() => {
    return ['all', ...Array.from(new Set(facilities.map((f) => f.type)))];
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return facilities
      .map((facility, index) => ({
        ...facility,
        coordinates: facilityLocations[index]?.coordinates || [40.7128, -74.006],
      }))
      .filter((facility) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          facility.name.toLowerCase().includes(normalizedSearch) ||
          facility.description.toLowerCase().includes(normalizedSearch);
        const matchesType = filterType === 'all' || facility.type === filterType;
        return matchesSearch && matchesType;
      });
  }, [facilities, facilityLocations, filterType, searchTerm]);

  return {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    facilityTypes,
    filteredFacilities,
  };
}

