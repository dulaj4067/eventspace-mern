export const EXTERNAL_CENTERS_STORAGE_KEY = 'externalCommunityCenters';
export const EXTERNAL_OVERRIDES_KEY = 'externalFacilityOverrides';
export const ADMIN_HIDDEN_EXTERNAL_KEY = 'adminHiddenExternalIds';

export function loadExternalOverrides() {
  try {
    const raw = localStorage.getItem(EXTERNAL_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveExternalOverride(facilityId, patch) {
  const all = loadExternalOverrides();
  all[facilityId] = { ...all[facilityId], ...patch };
  localStorage.setItem(EXTERNAL_OVERRIDES_KEY, JSON.stringify(all));
}

export function loadHiddenExternalIds() {
  try {
    const raw = localStorage.getItem(ADMIN_HIDDEN_EXTERNAL_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function addHiddenExternalId(facilityId) {
  const set = loadHiddenExternalIds();
  set.add(facilityId);
  localStorage.setItem(ADMIN_HIDDEN_EXTERNAL_KEY, JSON.stringify([...set]));
}

export function applyExternalOverrides(facility) {
  if (!facility?.id) return facility;
  const all = loadExternalOverrides();
  const o = all[facility.id];
  if (!o) return facility;
  return {
    ...facility,
    ...o,
    images: o.images ?? facility.images,
  };
}
