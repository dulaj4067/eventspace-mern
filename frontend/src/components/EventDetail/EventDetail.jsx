import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getEventById, registerForEvent, deleteEvent, publishEvent, cancelEvent } from '../../services/eventService';
import { Calendar, Clock, MapPin, Users, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const getUserFromToken = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const tokenUser = getUserFromToken();

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await getEventById(id);
        setEvent(response.data.data);
      } catch (err) {
        toast.error('Failed to load event');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    const userId = tokenUser?.id || tokenUser?._id || tokenUser?.userId;
    if (!userId) {
      toast.error('Please login to register for this event');
      navigate('/login');
      return;
    }
    try {
      setRegistering(true);
      const response = await registerForEvent(id, userId);
      if (response.data.paymentRequired) {
        toast.info('This event requires payment. Redirecting...');
        setTimeout(() => {
          navigate(`/payment?eventId=${id}&amount=${response.data.amount}&paymentId=${response.data.paymentId}`);
        }, 1500);
        return;
      }
      toast.success('Successfully registered for event!');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to register';
      toast.error(message);
      console.error(err);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteEvent(id);
      toast.success('Event deleted successfully!');
      navigate('/events');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete event';
      toast.error(message);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Are you sure you want to publish this event?')) return;
    try {
      await publishEvent(id);
      toast.success('Event published successfully!');
      const response = await getEventById(id);
      setEvent(response.data.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to publish event';
      if (message.includes('booking')) {
        toast.error('You need a confirmed booking before publishing. Please book a facility first.');
      } else if (message.includes('confirmed')) {
        toast.error('Your booking must be confirmed by admin before publishing.');
      } else {
        toast.error(message);
      }
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this event?')) return;
    try {
      await cancelEvent(id);
      toast.success('Event cancelled successfully!');
      const response = await getEventById(id);
      setEvent(response.data.data);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to cancel event';
      toast.error(message);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen text-purple-600 text-xl">
      Loading event...
    </div>
  );

  if (!event) return (
    <div className="flex justify-center items-center min-h-screen text-red-500 text-xl">
      Event not found
    </div>
  );

  const userId = tokenUser?.id || tokenUser?._id || tokenUser?.userId;
  const isOrganizer = userId && event.organizer?._id === userId;
  const isAdmin = tokenUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex justify-between items-start">
            <button
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 text-blue-100 hover:text-white mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Events
            </button>

            {(isOrganizer || isAdmin) && (
              <div className="flex gap-3 flex-wrap">
                {isOrganizer && (
                  <>
                    <button
                      onClick={() => navigate(`/event/${id}/attendees`)}
                      className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      Attendees
                    </button>
                    <button
                      onClick={() => navigate(`/edit-event/${id}`)}
                      className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    {event.status === 'draft' && (
                      <button
                        onClick={handlePublish}
                        title="Requires a confirmed facility booking"
                        className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Publish
                      </button>
                    )}
                    {event.status === 'published' && (
                      <button
                        onClick={handleCancel}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
                      >
                        Cancel Event
                      </button>
                    )}
                  </>
                )}
                {isAdmin && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl mb-4">{event.name}</h1>
          <span className="bg-white text-purple-600 px-4 py-1 rounded-full text-sm font-semibold">
            {event.type}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Status info for organizer */}
        {isOrganizer && event.status === 'draft' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Event is in Draft</h3>
            <p className="text-yellow-700 text-sm">To publish this event you need to:</p>
            <ol className="list-decimal list-inside text-yellow-700 text-sm mt-2 space-y-1">
              <li>Book a facility for your event date</li>
              <li>Wait for admin to confirm your booking</li>
              <li>Then click the Publish button above</li>
            </ol>
          </div>
        )}

        {isOrganizer && event.status === 'published' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">✅ Event is Live!</h3>
            <p className="text-green-700 text-sm">
              Your event is published and visible to everyone. You can cancel it if needed.
            </p>
          </div>
        )}

        {isOrganizer && event.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">❌ Event is Cancelled</h3>
            <p className="text-red-700 text-sm">
              This event has been cancelled. All registered attendees have been notified.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">About this Event</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            {event.description || 'No description provided.'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-6">Event Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 text-gray-600">
              <Calendar className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-400">Date</p>
                <p className="font-medium">
                  {new Date(event.schedule?.date).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Clock className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-400">Time</p>
                <p className="font-medium">
                  {event.schedule?.startTime} - {event.schedule?.endTime}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-400">Facility</p>
                <p className="font-medium">
                  {event.facility?.name || 'TBA'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Users className="w-6 h-6 text-purple-600" />
              <div>
                <p className="text-sm text-gray-400">Attendees</p>
                <p className="font-medium">
                  {event.attendance?.currentAttendees || 0} / {event.attendance?.maxAttendees || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Organizer</h2>
          <p className="text-gray-600">{event.organizer?.name || 'Unknown'}</p>
          <p className="text-gray-400 text-sm">{event.organizer?.email}</p>
        </div>

        {!isOrganizer && (
          <button
            onClick={handleRegister}
            disabled={registering || event.status !== 'published'}
            className="w-full py-4 rounded-xl text-white text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {registering ? 'Registering...' :
             event.status !== 'published' ? `Event is ${event.status}` :
             'Register for this Event'}
          </button>
        )}
      </div>
    </div>
  );
}