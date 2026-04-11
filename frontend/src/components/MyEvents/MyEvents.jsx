import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getMyEvents } from '../../services/eventService';
import { Calendar, Clock, MapPin, Users, Plus, Pencil } from 'lucide-react';
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

export function MyEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const tokenUser = getUserFromToken();

  useEffect(() => {
    if (!tokenUser) {
      navigate('/login');
      return;
    }

    const fetchMyEvents = async () => {
      try {
        const userId = tokenUser.id || tokenUser._id || tokenUser.userId;
        const response = await getMyEvents(userId);
        setEvents(response.data.data || []);
      } catch (err) {
        toast.error('Failed to load your events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-purple-600 text-xl">
      Loading your events...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl md:text-5xl mb-4">My Events</h1>
              <p className="text-xl text-blue-100">
                Manage events you have created
              </p>
            </div>
            <button
              onClick={() => navigate('/create-event')}
              className="flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {events.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-gray-400 text-6xl mb-6">📅</div>
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
              No events yet
            </h2>
            <p className="text-gray-500 mb-8">
              You haven't created any events yet. Start by creating your first event!
            </p>
            <button
              onClick={() => navigate('/create-event')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              You have {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event._id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Status Badge */}
                  <div className="bg-gradient-to-r from-blue-400 to-purple-400 h-32 relative">
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{event.name}</h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {event.description || 'No description'}
                    </p>

                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>{new Date(event.schedule?.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span>{event.schedule?.startTime} - {event.schedule?.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-purple-600" />
                        <span>{event.facility?.name || 'TBA'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>{event.attendance?.currentAttendees || 0} / {event.attendance?.maxAttendees || 0} attending</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Link
                        to={`/event/${event._id}`}
                        className="flex-1 text-center py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-colors"
                      >
                        View Details
                      </Link>
                      {event.status === 'draft' && (
                        <button
                          onClick={() => navigate(`/edit-event/${event._id}`)}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-purple-300 text-purple-600 text-sm hover:bg-purple-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}