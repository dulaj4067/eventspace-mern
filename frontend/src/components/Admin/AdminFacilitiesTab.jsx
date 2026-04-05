import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Building2,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Globe,
  MapPin,
  Pencil,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '../ui/badge.jsx';
import { Button } from '../ui/button.jsx';
import { Card, CardContent, CardHeader } from '../ui/card.jsx';
import { Input } from '../ui/input.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select.jsx';
import { FacilityImage } from '../common/FacilityImage.jsx';

const FACILITY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending review', value: 'pending' },
  { label: 'Approved', value: 'verified' },
  { label: 'Real-world', value: 'external' },
];

function formatAddress(address = {}) {
  return [address.street, address.city, address.state, address.zipCode, address.country]
    .filter(Boolean)
    .join(', ');
}

export function AdminFacilitiesTab({
  facilities,
  externalCenters,
  loadingExternal,
  confirmedBookingsByFacilityId,
  facilityFilter,
  onFacilityFilterChange,
  onVerifyFacility,
  onDeleteFacility,
  onRemoveExternalFacility,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [verifyingId, setVerifyingId] = useState(null);

  const pendingCount = useMemo(
    () => facilities.filter((f) => !f.verified).length,
    [facilities],
  );
  const verifiedCount = useMemo(
    () => facilities.filter((f) => f.verified).length,
    [facilities],
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredBackend = useMemo(() => {
    let list = [...facilities];

    if (facilityFilter === 'pending') list = list.filter((f) => !f.verified);
    else if (facilityFilter === 'verified') list = list.filter((f) => f.verified);

    if (normalizedQuery) {
      list = list.filter((f) => {
        const addr = formatAddress(f.location?.address);
        const hay = `${f.name} ${f.type} ${f.description || ''} ${addr}`.toLowerCase();
        return hay.includes(normalizedQuery);
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'capacity') return (b.capacity || 0) - (a.capacity || 0);
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    return list;
  }, [facilities, facilityFilter, normalizedQuery, sortBy]);

  const filteredExternal = useMemo(() => {
    let list = [...(externalCenters || [])];
    if (normalizedQuery) {
      list = list.filter((f) => {
        const hay = `${f.name} ${f.description || ''} ${f.type || ''}`.toLowerCase();
        return hay.includes(normalizedQuery);
      });
    }
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return list;
  }, [externalCenters, normalizedQuery]);

  const showBackendSection =
    facilityFilter === 'all' || facilityFilter === 'pending' || facilityFilter === 'verified';
  const showExternalSection = facilityFilter === 'all' || facilityFilter === 'external';

  const handleVerify = async (id) => {
    setVerifyingId(id);
    try {
      await onVerifyFacility(id);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-purple-50/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Facilities
            </h2>
            <p className="text-slate-600 mt-1">
              Review submissions, approve listings for the public directory, and browse
              real-world venues nearby.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 font-normal">
                <ShieldAlert className="size-3.5 text-amber-600" />
                {pendingCount} pending
              </Badge>
              <Badge variant="secondary" className="gap-1 font-normal">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                {verifiedCount} approved
              </Badge>
              <Badge variant="secondary" className="gap-1 font-normal">
                <Globe className="size-3.5 text-purple-600" />
                {externalCenters?.length ?? 0} real-world
              </Badge>
            </div>
          </div>
          <Button asChild className="shrink-0 bg-purple-700 hover:bg-purple-800">
            <Link to="/create-facility">Add facility</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FACILITY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFacilityFilterChange(filter.value)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-colors
                ${
                  facilityFilter === filter.value
                    ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-purple-400 hover:text-purple-700'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, type, or address…"
              className="pl-9 bg-white"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[200px] bg-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="capacity">Capacity (high → low)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-10">
        {showBackendSection && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Building2 className="size-5 text-purple-700" />
              <h3 className="text-lg font-medium">Platform directory</h3>
              <Badge variant="outline" className="ml-1">
                {filteredBackend.length} shown
              </Badge>
            </div>

            {filteredBackend.length === 0 && (
              <p className="text-center text-slate-500 py-10 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                No facilities match this view. Try another filter or search term.
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBackend.map((facility) => {
                const facilityBookings = confirmedBookingsByFacilityId.get(facility._id) ?? 0;
                const addr = formatAddress(facility.location?.address);
                const pending = !facility.verified;

                return (
                  <article
                    key={facility._id}
                    className="group relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all hover:border-purple-300/80 hover:shadow-md hover:ring-1 hover:ring-purple-200/60"
                  >
                    {pending && (
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">
                        <ShieldAlert className="size-3.5" />
                        Awaiting approval
                      </div>
                    )}

                    <div className="flex gap-4">
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-100">
                        <FacilityImage
                          facility={facility}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-slate-900 truncate pr-24">
                            {facility.name}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary">{facility.type}</Badge>
                          {facility.verified ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                              <ShieldCheck className="size-3.5" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-800 border-amber-200">
                              Not yet public
                            </Badge>
                          )}
                        </div>
                        {addr && (
                          <p className="text-xs text-slate-500 flex items-start gap-1 mb-2 line-clamp-2">
                            <MapPin className="size-3.5 shrink-0 mt-0.5 text-slate-400" />
                            {addr}
                          </p>
                        )}
                        {facility.description && (
                          <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                            {facility.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="size-4 text-slate-400" />
                            {facility.capacity} people
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <DollarSign className="size-4 text-slate-400" />
                            ${facility.hourlyRate}/hr
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <TrendingUp className="size-4 text-slate-400" />
                            {facilityBookings} confirmed
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      {pending && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                          disabled={verifyingId === facility._id}
                          onClick={() => handleVerify(facility._id)}
                        >
                          <CheckCircle className="size-4" />
                          {verifyingId === facility._id ? 'Approving…' : 'Approve & publish'}
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/edit-facility/${facility._id}`} className="gap-1.5">
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/facility/${facility._id}`}>View listing</Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Remove this listing from the platform? This cannot be undone.',
                            )
                          ) {
                            onDeleteFacility(facility._id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {showExternalSection && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Globe className="size-5 text-violet-600" />
              <h3 className="text-lg font-medium">Real-world</h3>
              <Badge variant="outline" className="ml-1">
                {loadingExternal ? 'Loading…' : `${filteredExternal.length} shown`}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 max-w-3xl">
              Community centres and similar venues near your registered spaces
            </p>

            {loadingExternal && filteredExternal.length === 0 && (
              <p className="text-center text-slate-500 py-8 rounded-xl border border-dashed border-slate-200">
                Loading nearby real-world venues…
              </p>
            )}

            {!loadingExternal && filteredExternal.length === 0 && (
              <p className="text-center text-slate-500 py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                No real-world venues loaded yet. Add coordinates to platform facilities or
                check back later.
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredExternal.map((facility) => {
                const lat = facility.location?.coordinates?.latitude;
                const lon = facility.location?.coordinates?.longitude;
                const mapsHref =
                  Number.isFinite(lat) && Number.isFinite(lon)
                    ? `https://www.google.com/maps?q=${lat},${lon}`
                    : null;
                const detailId = facility.id ?? facility._id;
                const canOpenInApp =
                  typeof detailId === 'string' && String(detailId).startsWith('community-');

                return (
                  <article
                    key={detailId}
                    className="group rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-violet-100">
                        <FacilityImage
                          facility={facility}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold text-slate-900 truncate mb-1">
                          {facility.name}
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge className="bg-violet-600 hover:bg-violet-600">Real-world</Badge>
                          <Badge variant="secondary">{facility.type}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-3">{facility.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-violet-100/80 pt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/edit-facility/${detailId}`} className="gap-1.5">
                          <Pencil className="size-4" />
                          Edit
                        </Link>
                      </Button>
                      {mapsHref && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={mapsHref} target="_blank" rel="noreferrer" className="gap-1.5">
                            <ExternalLink className="size-4" />
                            Open in Maps
                          </a>
                        </Button>
                      )}
                      {canOpenInApp && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/facility/${detailId}`}>View in app</Link>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          if (
                            window.confirm(
                              'Hide this real-world venue from the admin list and public facilities map?',
                            )
                          ) {
                            onRemoveExternalFacility(detailId);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
