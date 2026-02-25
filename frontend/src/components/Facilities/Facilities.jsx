import { facilities } from '../../data/mockData.js';
import { facilityLocations } from './facilityLocations.jsx';
import { FacilitiesView } from './FacilitiesView.jsx';
import { useFacilitiesState } from './useFacilitiesState.jsx';

export function Facilities() {
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    facilityTypes,
    filteredFacilities,
  } = useFacilitiesState({ facilities, facilityLocations });

  return (
    <FacilitiesView
      facilities={facilities}
      filteredFacilities={filteredFacilities}
      facilityTypes={facilityTypes}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      filterType={filterType}
      onFilterTypeChange={setFilterType}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
    />
  );
}
