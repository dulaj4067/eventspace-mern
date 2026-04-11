import { Outlet, Link, useLocation } from 'react-router';
import { Menu, X, LogOut, User, ChevronDown, Globe, UserCheck, PlusCircle, Building2, Ticket, ClipboardList, CalendarRange, ShieldCheck, Home } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { TermsConsentBar } from '../common/TermsConsentBar.jsx';
import { Button } from '../ui/button.jsx';
import logo from '../../assets/logo.png';

export function Layout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bookingsDropdownOpen, setBookingsDropdownOpen] = useState(false);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const bookingsDropdownRef = useRef(null);
  const eventsDropdownRef = useRef(null);
  const { logout, isAuthenticated, isAdmin } = useAuth();

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  const isBookingsActive = isActive('/bookings') || isActive('/booking-calendar');
  const isEventsActive = isActive('/events') || isActive('/my-events');

  useEffect(() => {
    function handleClickOutside(e) {
      if (bookingsDropdownRef.current && !bookingsDropdownRef.current.contains(e.target)) {
        setBookingsDropdownOpen(false);
      }
      if (eventsDropdownRef.current && !eventsDropdownRef.current.contains(e.target)) {
        setEventsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/95 backdrop-blur-sm border-b sticky top-0 z-[5000] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/home" className="flex items-center gap-3">
              <img src={logo} alt="EventSpace" className="w-10 h-10" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                EventSpace
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">

              {/* Home */}
              <Link
                to="/home"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive('/home')
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              {/* Events Dropdown */}
              <div className="relative" ref={eventsDropdownRef}>
                <button
                  onClick={() => setEventsDropdownOpen(!eventsDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isEventsActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Events</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${eventsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {eventsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      to="/events"
                      onClick={() => setEventsDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        isActive('/events') && !isActive('/my-events')
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      All Events
                    </Link>
                    <Link
                      to="/my-events"
                      onClick={() => setEventsDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        isActive('/my-events')
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      My Events
                    </Link>
                    <Link
                      to="/create-event"
                      onClick={() => setEventsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <PlusCircle className="w-4 h-4 text-purple-600" />
                      Create Event
                    </Link>
                  </div>
                )}
              </div>

              {/* Facilities */}
              <Link
                to="/facilities"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive('/facilities')
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Facilities</span>
              </Link>

              {/* My Bookings Dropdown */}
              <div className="relative" ref={bookingsDropdownRef}>
                <button
                  onClick={() => setBookingsDropdownOpen(!bookingsDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isBookingsActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Ticket className="w-4 h-4" />
                  <span>My Bookings</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${bookingsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {bookingsDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link
                      to="/bookings"
                      onClick={() => setBookingsDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        isActive('/bookings') && !isActive('/booking-calendar')
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <ClipboardList className="w-4 h-4" />
                      My Bookings
                    </Link>
                    <Link
                      to="/booking-calendar"
                      onClick={() => setBookingsDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                        isActive('/booking-calendar')
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <CalendarRange className="w-4 h-4" />
                      Booking Calendar
                    </Link>
                  </div>
                )}
              </div>

              {/* Admin */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                    isActive('/admin')
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link to="/profile">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      View Profile
                    </Button>
                  </Link>
                  <Button onClick={logout} variant="outline" size="sm" className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-4 space-y-1">
              <Link
                to="/home"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/home')
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <div className="px-3 pt-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Events</p>
                <Link to="/events" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <Globe className="w-4 h-4" />
                  <span>All Events</span>
                </Link>
                <Link to="/my-events" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <UserCheck className="w-4 h-4" />
                  <span>My Events</span>
                </Link>
                <Link to="/create-event" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <PlusCircle className="w-4 h-4 text-purple-600" />
                  <span>Create Event</span>
                </Link>
              </div>

              <Link
                to="/facilities"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/facilities')
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Facilities</span>
              </Link>

              <div className="px-3 pt-1">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">My Bookings</p>
                <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <ClipboardList className="w-4 h-4" />
                  <span>My Bookings</span>
                </Link>
                <Link to="/booking-calendar" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <CalendarRange className="w-4 h-4" />
                  <span>Booking Calendar</span>
                </Link>
              </div>

              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin</span>
                </Link>
              )}

              <div className="pt-4 border-t space-y-2">
                {isAuthenticated ? (
                  <>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                      <User className="w-4 h-4" />
                      View Profile
                    </Link>
                    <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">Sign In</Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center">Sign Up</Link>
                  </>
                )}
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 pb-28">
        <Outlet />
      </main>

      <TermsConsentBar />

      <footer className="bg-gradient-to-r from-gray-900 to-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={logo} alt="EventSpace" className="w-10 h-10" />
                <span className="font-bold text-lg">EventSpace</span>
              </div>
              <p className="text-sm text-gray-400">Making community spaces accessible for everyone.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/events" className="hover:text-white">Browse Events</Link></li>
                <li><Link to="/my-events" className="hover:text-white">My Events</Link></li>
                <li><Link to="/facilities" className="hover:text-white">Browse Facilities</Link></li>
                <li><Link to="/bookings" className="hover:text-white">My Bookings</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <p className="text-sm text-gray-400">Email: info@eventspace.com</p>
              <p className="text-sm text-gray-400">Phone: (555) 123-4567</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Hours</h3>
              <p className="text-sm text-gray-400">Monday - Friday: 6am - 10pm</p>
              <p className="text-sm text-gray-400">Saturday - Sunday: 8am - 8pm</p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            © 2026 EventSpace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}