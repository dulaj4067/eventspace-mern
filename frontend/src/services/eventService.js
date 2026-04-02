import axios from 'axios';

const API = '/api/events';

const authAxios = () => {
  const token = localStorage.getItem('token');
  return axios.create({
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
};

export const getAllEvents = (params = {}) =>
  authAxios().get(API, { params });

export const getEventById = (id) =>
  authAxios().get(`${API}/${id}`);

export const createEvent = (data) =>
  authAxios().post(API, data);

export const updateEvent = (id, data) =>
  authAxios().put(`${API}/${id}`, data);

export const deleteEvent = (id) =>
  authAxios().delete(`${API}/${id}`);

export const registerForEvent = (id, userId) =>
  authAxios().post(`${API}/${id}/register`, { userId });

export const cancelRegistration = (id, userId) =>
  authAxios().post(`${API}/${id}/cancel-registration`, { userId });

export const getMyEvents = (organizerId) =>
  authAxios().get(`${API}/organizer/${organizerId}`);

export const getEventAttendees = (id) =>
  authAxios().get(`${API}/${id}/attendees`);

export const publishEvent = (id) =>
  authAxios().patch(`${API}/${id}/publish`);

export const cancelEvent = (id) =>
  authAxios().patch(`${API}/${id}/cancel`);

export const getEventImage = (type) => {
  const imageMap = {
    conference: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
    seminar: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=400&fit=crop',
    workshop: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop',
    concert: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=400&fit=crop',
    exhibition: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop',
    sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=400&fit=crop',
    social: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&h=400&fit=crop',
    other: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=400&fit=crop',
  };
  return imageMap[type] || imageMap['other'];
};