import { FacilitiesView } from './FacilitiesView.jsx';
import { useFacilitiesState } from './useFacilitiesState.jsx';

export function Facilities() {
  const {
    facilities,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    viewMode,
    setViewMode,
    facilityTypes,
    filteredFacilities,
    isLoading,
    errorMessage,
  } = useFacilitiesState();

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
      isLoading={isLoading}
      errorMessage={errorMessage}
    />
  );
}
