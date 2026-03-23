import { createBrowserRouter, Navigate } from 'react-router';
import { Layout } from './components/Layout/Layout.jsx';
import { Home } from './components/Home/Home.jsx';
import { Events } from './components/Events/Events.jsx';
import { Facilities } from './components/Facilities/Facilities.jsx';
import { FacilityDetail } from './components/FacilityDetail/FacilityDetail.jsx';
import { Bookings } from './components/Bookings/Bookings.jsx';
import { Admin } from './components/Admin/Admin.jsx';
import { Login } from './components/Login/Login.jsx';
import { Register } from './components/Register/Register.jsx';
import { CreateEvent } from './components/CreateEvent/CreateEvent.jsx';
import { PaymentPage } from './components/PaymentPage/PaymentPage.jsx';
import { NotFound } from './components/NotFound/NotFound.jsx';
import { Profile } from './components/Profile/Profile.jsx';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    path: '/register',
    Component: Register,
  },
  {
    path: '/payment',
    Component: PaymentPage,
  },
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        element: <Navigate to="/login" replace />, // 👈 redirect / to /login
      },
      {
        path: 'home',       // 👈 Home is now at /home
        Component: Home,
      },
      {
        path: 'events',
        Component: Events,
      },
      {
        path: 'facilities',
        Component: Facilities,
      },
      {
        path: 'facility/:id',
        Component: FacilityDetail,
      },
      {
        path: 'bookings',
        Component: Bookings,
      },
      {
        path: 'profile',
        Component: Profile,
      },
      {
        path: 'admin',
        Component: Admin,
      },
      {
        path: 'create-event',
        Component: CreateEvent,
      },
      {
        path: '*',
        Component: NotFound,
      },
    ],
  },
]);