import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { 
  User, Mail, Calendar, Shield, Building2, Ticket, 
  CreditCard, CircleDollarSign, TrendingUp, History,
  Edit2, Save, X, ExternalLink, Clock,
  LayoutDashboard, PlusCircle, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { generateFacilityReport } from '../../utils/FacilityReportPDF';

export function Profile() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    facilities: [],
    events: [],
    bookings: [],
    sentPayments: [],
    receivedPayments: []
  });
  const [reportLoading, setReportLoading] = useState({});

  const axiosConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (token) fetchDashboardData();
  }, [user, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userId = user.id || user._id;
      const [facRes, eventRes, bookRes, sentPayRes, recvPayRes] = await Promise.all([
        axios.get('/api/facilities/owner/my-facilities', axiosConfig),
        axios.get(`/api/events/organizer/${userId}`, axiosConfig),
        axios.get('/api/bookings/my', axiosConfig),
        axios.get(`/api/payments/user/${userId}`, axiosConfig),
        axios.get('/api/payments/received', axiosConfig)
      ].map(p => p.catch(e => ({ data: { data: [], payments: [] } })))); // Catch individual errors to avoid silent crashes

      setStats({
        facilities: facRes.data?.data || [],
        events: eventRes.data?.data || [],
        bookings: bookRes.data?.data || [],
        sentPayments: sentPayRes.data?.payments || [],
        receivedPayments: recvPayRes.data?.payments || []
      });
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error('Partial data load. Some sections may be empty.');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const earned = stats.receivedPayments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    const spent = stats.sentPayments
      .filter(p => p.paymentStatus === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    return { earned, spent };
  }, [stats]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${user.id || user._id}`, { name }, axiosConfig);
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };
  
  const handleDownloadReport = async (facility) => {
    setReportLoading(prev => ({ ...prev, [facility._id]: true }));
    console.log(`Generating report for facility: ${facility.name} (${facility._id})`);
    try {
      const response = await axios.get(`/api/facilities/${facility._id}/report`, axiosConfig);
      console.log('Report data received:', response.data);
      generateFacilityReport(response.data.data);
      toast.success(`Report generated for ${facility.name}`);
    } catch (error) {
      console.error('Report error detail:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setReportLoading(prev => ({ ...prev, [facility._id]: false }));
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const StatusBadge = ({ status }) => {
    const colors = {
      completed: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
      published: 'bg-purple-100 text-purple-700 border-purple-200',
      available: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return (
      <Badge variant="outline" className={`${colors[status] || 'bg-blue-100 text-blue-700'} capitalize font-medium`}>
        {status}
      </Badge>
    );
  };

  if (loading && !stats.bookings.length && !stats.facilities.length) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Synchronizing your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans">
      {/* Header Profile Section */}
      <div className="bg-white border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-purple-200"
            >
              <User size={64} />
            </motion.div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {user?.name || 'Community Member'}
                </h1>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-transparent">
                  {user?.role?.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-slate-500 flex items-center justify-center md:justify-start gap-2 mb-6">
                <Mail size={16} /> {user?.email}
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <Button 
                  onClick={() => setEditing(!editing)}
                  className="rounded-xl px-6 bg-slate-900 hover:bg-slate-800 transition-all gap-2"
                >
                  {editing ? <><X size={18} /> Cancel</> : <><Edit2 size={18} /> Edit Profile</>}
                </Button>
                <Link to="/admin">
                  <Button variant="outline" className="rounded-xl px-6 border-slate-200 gap-2">
                    <Shield size={18} /> Security & Admin
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-center min-w-[140px]">
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">Total Earned</p>
                <p className="text-2xl font-black text-blue-900">${totals.earned.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-center min-w-[140px]">
                <p className="text-[10px] text-purple-600 font-black uppercase tracking-widest mb-1">Total Spent</p>
                <p className="text-2xl font-black text-purple-900">${totals.spent.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-xl h-auto flex-wrap justify-center">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                { id: 'facilities', icon: Building2, label: 'Facilities' },
                { id: 'events', icon: Ticket, label: 'Events' },
                { id: 'bookings', icon: Calendar, label: 'Bookings' },
                { id: 'payments', icon: CreditCard, label: 'Payments' }
              ].map(tab => (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id}
                  className="rounded-xl px-5 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all flex items-center gap-2"
                >
                  <tab.icon size={18} />
                  <span className="font-semibold">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Profile Edit / Info */}
                  <Card className="md:col-span-1 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
                    <CardHeader className="bg-slate-900 text-white p-8">
                      <CardTitle className="flex items-center gap-2">Personal Identity</CardTitle>
                      <CardDescription className="text-slate-400">Manage your verified credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      {editing ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                          <div className="space-y-2">
                            <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-widest px-1">Full Name</Label>
                            <Input 
                              value={name} 
                              onChange={e => setName(e.target.value)}
                              className="rounded-xl border-slate-200 focus:ring-purple-500 h-12"
                              placeholder="Your full name"
                            />
                          </div>
                          <Button className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 gap-2 shadow-lg shadow-purple-200">
                            <Save size={18} /> Save Identity
                          </Button>
                        </form>
                      ) : (
                        <div className="space-y-6">
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Official Name</p>
                            <p className="text-slate-900 font-bold text-lg leading-none">{user?.name}</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authenticated Email</p>
                            <p className="text-slate-900 font-bold">{user?.email}</p>
                          </div>
                          <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center text-sm text-slate-500">
                            <span>Member Since</span>
                            <span className="font-bold text-slate-900 font-mono tracking-tighter">{formatDate(user?.createdAt || new Date())}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Summary Stats */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Facilities', value: stats.facilities.length, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Events', value: stats.events.length, icon: Ticket, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Bookings', value: stats.bookings.length, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Payments', value: stats.sentPayments.length, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                      ].map((s, i) => (
                        <Card key={i} className="rounded-3xl border-none shadow-lg shadow-slate-200/50 p-6 text-center group hover:scale-105 transition-all bg-white cursor-pointer" onClick={() => setActiveTab(s.label.toLowerCase())}>
                          <div className={`${s.bg} w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mx-auto mb-4 group-hover:rotate-12 transition-transform`}>
                            <s.icon size={24} />
                          </div>
                          <p className="text-3xl font-black text-slate-900 mb-1">{s.value}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                        </Card>
                      ))}
                    </div>

                    <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 p-8 bg-white">
                       <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp className="text-purple-600" /> Recent Activity Cloud
                       </h3>
                       <div className="space-y-4 text-slate-600">
                          {stats.bookings.slice(0, 1).map(b => (
                            <div key={b._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="bg-white p-2 rounded-xl border shadow-sm text-blue-600 w-fit"><Clock size={20} /></div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-900">Upcoming Booking</p>
                                <p className="text-sm">Reservation at {b.facility?.name} on {formatDate(b.date)}</p>
                              </div>
                              <StatusBadge status={b.status} />
                            </div>
                          ))}
                          {stats.receivedPayments.slice(0, 1).map(p => (
                            <div key={p._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                              <div className="bg-white p-2 rounded-xl border shadow-sm text-emerald-600 w-fit"><CircleDollarSign size={20} /></div>
                              <div className="flex-1">
                                <p className="font-bold text-slate-900">Revenue Received</p>
                                <p className="text-sm">Payment of ${p.amount} received via {p.paymentMethod}</p>
                              </div>
                              <StatusBadge status={p.paymentStatus} />
                            </div>
                          ))}
                          {!stats.bookings.length && !stats.receivedPayments.length && (
                            <div className="text-center py-8">
                              <p className="font-medium text-slate-400">All quiet for now. Start exploring events!</p>
                            </div>
                          )}
                       </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="facilities">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <Link to="/create-facility" className="block h-full min-h-[300px]">
                    <Card className="rounded-[2rem] border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-8 hover:border-blue-400 hover:bg-blue-50 transition-all group group-hover:scale-[1.02]">
                      <PlusCircle size={48} className="text-slate-300 group-hover:text-blue-500 mb-4 transition-colors" />
                      <h3 className="text-lg font-bold text-slate-400 group-hover:text-blue-600">List New Facility</h3>
                      <p className="text-sm text-slate-400 text-center mt-2 group-hover:text-blue-400">Start monetizing your community space today.</p>
                    </Card>
                  </Link>
                  {stats.facilities.map(facility => (
                    <Card key={facility._id} className="rounded-[2rem] border-none shadow-xl hover:shadow-2xl transition-all overflow-hidden group bg-white">
                      <div className="h-48 relative overflow-hidden">
                        <img 
                          src={facility.images?.[0]?.url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600'} 
                          alt={facility.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" 
                        />
                        <div className="absolute top-4 right-4"><StatusBadge status={facility.verified ? 'available' : 'pending'} /></div>
                      </div>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{facility.name}</h3>
                        <p className="text-slate-500 text-sm mb-6 line-clamp-2">{facility.description}</p>
                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                           <div>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">Hourly Rate</p>
                             <p className="font-black text-slate-900 text-lg">${facility.hourlyRate}</p>
                           </div>
                           <div className="flex gap-2">
                             <Link to={`/edit-facility/${facility._id}`}>
                               <Button size="sm" variant="ghost" className="rounded-xl hover:bg-white hover:shadow-sm">Edit</Button>
                             </Link>
                             <Link to={`/facility/${facility._id}`}>
                               <Button size="sm" variant="ghost" className="rounded-xl hover:bg-white hover:shadow-sm gap-2">
                                 View <ExternalLink size={14} />
                               </Button>
                             </Link>
                             <Button 
                               size="sm" 
                               variant="outline" 
                               disabled={reportLoading[facility._id]}
                               onClick={() => handleDownloadReport(facility)}
                               className="rounded-xl border-slate-200 hover:border-purple-300 hover:text-purple-600 gap-2 font-semibold shadow-sm transition-all"
                             >
                               {reportLoading[facility._id] ? (
                                 <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <><FileDown size={14} /> Report</>
                               )}
                             </Button>
                           </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="events">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   <Link to="/create-event" className="block h-full min-h-[300px]">
                    <Card className="rounded-[2rem] border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-8 hover:border-purple-400 hover:bg-purple-50 transition-all group group-hover:scale-[1.02]">
                      <PlusCircle size={48} className="text-slate-300 group-hover:text-purple-500 mb-4 transition-colors" />
                      <h3 className="text-lg font-bold text-slate-400 group-hover:text-purple-600">Create New Event</h3>
                      <p className="text-sm text-slate-400 text-center mt-2 group-hover:text-purple-400">Launch workshops, concerts, or social gatherings.</p>
                    </Card>
                  </Link>
                  {stats.events.map(event => (
                    <Card key={event._id} className="rounded-[2rem] border-none shadow-xl hover:shadow-2xl transition-all overflow-hidden group bg-white">
                      <div className="h-48 relative overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                        {event.image ? (
                          <img src={event.image} alt={event.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700" />
                        ) : (
                          <Ticket size={64} className="text-purple-300" />
                        )}
                        <div className="absolute top-4 right-4"><StatusBadge status={event.status} /></div>
                      </div>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                          <Calendar size={12} /> {formatDate(event.schedule?.date)}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{event.name}</h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                           <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100 text-center text-xs">
                             <p className="font-bold text-indigo-400 uppercase text-[9px]">Attendees</p>
                             <p className="font-black text-indigo-900">{event.attendance?.currentAttendees || 0}/{event.attendance?.maxAttendees}</p>
                           </div>
                           <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 text-center text-xs">
                             <p className="font-bold text-purple-400 uppercase text-[9px]">Price</p>
                             <p className="font-black text-purple-900">{event.pricing?.isFree ? 'Free' : `$${event.pricing?.price}`}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <Link to={`/edit-event/${event._id}`} className="flex-1">
                             <Button variant="outline" className="w-full rounded-xl gap-2 h-10 bg-white shadow-sm border-slate-100">Manage</Button>
                           </Link>
                           <Link to={`/event/${event._id}`} className="w-10">
                              <Button variant="outline" className="w-full h-10 rounded-xl p-0 hover:bg-purple-50 hover:text-purple-600"><ExternalLink size={16} /></Button>
                           </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="bookings">
                <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Reservation</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest sm:table-cell hidden">Purpose</th>
                          <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.bookings.map(booking => (
                          <tr key={booking._id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 text-blue-600 items-center justify-center font-bold">
                                  <Building2 size={20} />
                                </div>
                                <span className="font-bold text-slate-900">{booking.facility?.name || 'Community Center'}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="text-slate-900 font-bold">{formatDate(booking.date)}</div>
                              <div className="text-xs text-slate-500">{booking.time?.start} - {booking.time?.end}</div>
                            </td>
                            <td className="px-8 py-6 text-slate-600 sm:table-cell hidden">{booking.purpose}</td>
                            <td className="px-8 py-6"><StatusBadge status={booking.status} /></td>
                            <td className="px-8 py-6 text-right font-black text-slate-900">${booking.pricing?.total || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {stats.bookings.length === 0 && (
                    <div className="p-20 text-center">
                      <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-xl font-bold text-slate-900">No Reservations Found</h3>
                      <p className="text-slate-500">Book your first facility to see your history here.</p>
                      <Link to="/facilities">
                        <Button className="mt-6 rounded-2xl bg-blue-600 hover:bg-blue-700">Explore Venues</Button>
                      </Link>
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Payments Sent */}
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/10">
                       <CardTitle className="flex items-center gap-2 text-rose-600 font-black"><History size={20} /> Payments Outflow</CardTitle>
                       <CardDescription>Track all subscriptions and booking investments</CardDescription>
                    </CardHeader>
                    <div className="max-h-[500px] overflow-y-auto">
                      {stats.sentPayments.map(payment => (
                        <div key={payment._id} className="p-8 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 flex justify-between items-center">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-rose-500"><TrendingUp className="rotate-180" size={24} /></div>
                            <div>
                               <p className="font-bold text-slate-900 capitalize">{payment.paymentType?.replace('-', ' ')}</p>
                               <p className="text-xs text-slate-400">{formatDate(payment.createdAt)} • {payment.paymentMethod}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-slate-900 mb-1">-${payment.amount}</p>
                             <StatusBadge status={payment.paymentStatus} />
                          </div>
                        </div>
                      ))}
                      {stats.sentPayments.length === 0 && <div className="p-20 text-center text-slate-400">No outgoing transactions found.</div>}
                    </div>
                  </Card>

                  {/* Payments Received */}
                  <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden border border-emerald-100">
                    <CardHeader className="p-8 border-b border-slate-50 bg-emerald-50/20">
                       <CardTitle className="flex items-center gap-2 text-emerald-600 font-black"><TrendingUp size={20} /> Revenue Streams</CardTitle>
                       <CardDescription>Monitor earnings from your facilities and events</CardDescription>
                    </CardHeader>
                    <div className="max-h-[500px] overflow-y-auto">
                      {stats.receivedPayments.map(payment => (
                        <div key={payment._id} className="p-8 hover:bg-emerald-50/20 transition-all border-b border-slate-50 last:border-0 flex justify-between items-center">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center text-emerald-500"><TrendingUp size={24} /></div>
                            <div>
                               <p className="font-bold text-slate-900 capitalize">{payment.paymentType?.replace('-', ' ')}</p>
                               <p className="text-xs text-slate-400">From {payment.userId?.name || 'Community Member'} • {formatDate(payment.createdAt)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <p className="font-black text-emerald-700 mb-1">+${payment.amount}</p>
                             <StatusBadge status={payment.paymentStatus} />
                          </div>
                        </div>
                      ))}
                      {stats.receivedPayments.length === 0 && <div className="p-20 text-center text-slate-400">No incoming transactions yet.</div>}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
