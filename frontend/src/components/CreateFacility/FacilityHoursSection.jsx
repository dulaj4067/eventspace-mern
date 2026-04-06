import { useState } from 'react';
import { toast } from 'sonner';
import { Clock, CalendarOff, Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Label } from '../ui/label.jsx';
import { Badge } from '../ui/badge.jsx';

const DAYS = [
  { key: 'monday', short: 'Mon', label: 'Monday' },
  { key: 'tuesday', short: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { key: 'thursday', short: 'Thu', label: 'Thursday' },
  { key: 'friday', short: 'Fri', label: 'Friday' },
  { key: 'saturday', short: 'Sat', label: 'Saturday' },
  { key: 'sunday', short: 'Sun', label: 'Sunday' },
];

export function createDefaultWeeklySchedule() {
  const row = (isOpen, openTime, closeTime) => ({ isOpen, openTime, closeTime });
  return {
    monday: row(true, '09:00', '17:00'),
    tuesday: row(true, '09:00', '17:00'),
    wednesday: row(true, '09:00', '17:00'),
    thursday: row(true, '09:00', '17:00'),
    friday: row(true, '09:00', '17:00'),
    saturday: row(true, '10:00', '16:00'),
    sunday: row(false, '10:00', '14:00'),
  };
}

function updateDay(schedule, dayKey, patch) {
  return {
    ...schedule,
    [dayKey]: { ...schedule[dayKey], ...patch },
  };
}

export function FacilityHoursSection({
  schedule,
  onScheduleChange,
  exceptions,
  onExceptionsChange,
  disabled,
}) {
  const [draftDate, setDraftDate] = useState('');
  const [draftReason, setDraftReason] = useState('');

  const copyMondayToWeekdays = () => {
    const m = schedule.monday;
    onScheduleChange({
      ...schedule,
      tuesday: { ...m },
      wednesday: { ...m },
      thursday: { ...m },
      friday: { ...m },
    });
  };

  const addException = () => {
    if (!draftDate) return;
    const exists = exceptions.some((e) => e.date === draftDate);
    if (exists) {
      toast.error('That date is already listed.');
      return;
    }
    onExceptionsChange([
      ...exceptions,
      {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        date: draftDate,
        reason: draftReason.trim(),
      },
    ]);
    setDraftDate('');
    setDraftReason('');
  };

  const removeException = (id) => {
    onExceptionsChange(exceptions.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-br from-white via-purple-50/30 to-blue-50/40 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 sm:px-5 border-b border-purple-100/80 bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/15 p-2">
              <Clock className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">Weekly hours</h3>
              <p className="text-xs sm:text-sm text-blue-100/90">
                Toggle open days and set hours — shown to guests after approval.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 bg-white/95 text-purple-900 hover:bg-white gap-1.5"
            onClick={copyMondayToWeekdays}
            disabled={disabled}
          >
            <Copy className="size-3.5" />
            Copy Mon → Tue–Fri
          </Button>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/90 text-left text-slate-600 border-b border-slate-200">
                <th className="px-4 py-3 font-medium w-[14%]">Day</th>
                <th className="px-4 py-3 font-medium w-[18%]">Status</th>
                <th className="px-4 py-3 font-medium">Opens</th>
                <th className="px-4 py-3 font-medium">Closes</th>
              </tr>
            </thead>
            <tbody>
              {DAYS.map(({ key, short, label }, i) => {
                const row = schedule[key];
                const open = row?.isOpen;
                return (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 transition-colors ${
                      open ? 'bg-white hover:bg-purple-50/40' : 'bg-slate-50/70'
                    } ${i === DAYS.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 w-8">{short}</span>
                        <span className="text-slate-500 hidden lg:inline text-xs">{label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          onScheduleChange(updateDay(schedule, key, { isOpen: !open }))
                        }
                        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-purple-400 ${
                          open ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                        aria-pressed={open}
                        aria-label={`${label} ${open ? 'open' : 'closed'}`}
                      >
                        <span
                          className={`pointer-events-none block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                            open ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <Badge
                        variant="secondary"
                        className={`ml-2 text-[10px] uppercase tracking-wide ${
                          open ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {open ? 'Open' : 'Closed'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row?.openTime || '09:00'}
                        onChange={(e) =>
                          onScheduleChange(updateDay(schedule, key, { openTime: e.target.value }))
                        }
                        disabled={disabled || !open}
                        className={`h-9 max-w-[9rem] ${!open ? 'opacity-40' : ''}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="time"
                        value={row?.closeTime || '17:00'}
                        onChange={(e) =>
                          onScheduleChange(updateDay(schedule, key, { closeTime: e.target.value }))
                        }
                        disabled={disabled || !open}
                        className={`h-9 max-w-[9rem] ${!open ? 'opacity-40' : ''}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {DAYS.map(({ key, label }) => {
            const row = schedule[key];
            const open = row?.isOpen;
            return (
              <div
                key={key}
                className={`p-4 space-y-3 ${open ? 'bg-white' : 'bg-slate-50/80'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{label}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onScheduleChange(updateDay(schedule, key, { isOpen: !open }))
                    }
                    className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                      open ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        open ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                {open && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Opens</Label>
                      <Input
                        type="time"
                        value={row?.openTime || '09:00'}
                        onChange={(e) =>
                          onScheduleChange(updateDay(schedule, key, { openTime: e.target.value }))
                        }
                        disabled={disabled}
                        className="mt-1 h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Closes</Label>
                      <Input
                        type="time"
                        value={row?.closeTime || '17:00'}
                        onChange={(e) =>
                          onScheduleChange(updateDay(schedule, key, { closeTime: e.target.value }))
                        }
                        disabled={disabled}
                        className="mt-1 h-10"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-800">
            <CalendarOff className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Closed dates</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              Add holidays or maintenance days when the space is unavailable — these override regular
              hours for that calendar date.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <Label htmlFor="ex-date">Date</Label>
            <Input
              id="ex-date"
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <div className="flex-[2] min-w-[180px]">
            <Label htmlFor="ex-reason">Note (optional)</Label>
            <Input
              id="ex-reason"
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
              placeholder="e.g. Holiday, private event"
              disabled={disabled}
              className="mt-1"
            />
          </div>
          <Button
            type="button"
            onClick={addException}
            disabled={disabled || !draftDate}
            className="gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
          >
            <Plus className="size-4" />
            Add closed date
          </Button>
        </div>

        {exceptions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {exceptions
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((ex) => (
                <li
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-800">
                    {formatDisplayDate(ex.date)}
                    {ex.reason ? (
                      <span className="text-slate-500 font-normal"> — {ex.reason}</span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeException(ex.id)}
                    disabled={disabled}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDisplayDate(isoDate) {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}
