import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getEventById, getEventAttendees } from '../../services/eventService';
import { Users, ArrowLeft, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const getUserFromToken = () => {
  try {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export function EventAttendees() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const tokenUser = getUserFromToken();

  useEffect(() => {
    if (!tokenUser) {
      navigate('/login');
      return;
    }
    const fetchData = async () => {
      try {
        const [eventRes, attendeesRes] = await Promise.all([
          getEventById(id),
          getEventAttendees(id),
        ]);
        setEvent(eventRes.data.data);
        setAttendees(attendeesRes.data.data || []);
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load attendees';
        toast.error(message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-purple-600 text-xl">
      Loading attendees...
    </div>
  );

  if (!event) return (
    <div className="flex justify-center items-center min-h-screen text-red-500 text-xl">
      Event not found
    </div>
  );

  const activeAttendees = attendees.filter(a => a.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={() => navigate(`/event/${id}`)}
            className="flex items-center gap-2 text-blue-100 hover:text-white mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Event
          </button>
          <h1 className="text-4xl md:text-5xl mb-4">Event Attendees</h1>
          <p className="text-xl text-blue-100">{event.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600">{activeAttendees.length}</p>
            <p className="text-gray-500 text-sm">Registered</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600">
              {event.attendance?.maxAttendees || 0}
            </p>
            <p className="text-gray-500 text-sm">Max Capacity</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600">
              {(event.attendance?.maxAttendees || 0) - activeAttendees.length}
            </p>
            <p className="text-gray-500 text-sm">Spots Left</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold">
              Registered Attendees ({activeAttendees.length})
            </h2>
          </div>

          {activeAttendees.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No attendees yet</p>
              <p className="text-gray-400 text-sm mt-2">
                Share your event to get registrations!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {activeAttendees.map((attendee, index) => (
                <div
                  key={attendee._id}
                  className="flex items-center gap-4 p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {attendee.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {attendee.user?.name || 'Unknown User'}
                    </p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Mail className="w-3 h-3" />
                      <span>{attendee.user?.email || 'No email'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      attendee.status === 'registered'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {attendee.status}
                    </span>
                    <p className="text-gray-400 text-xs mt-1">#{index + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}