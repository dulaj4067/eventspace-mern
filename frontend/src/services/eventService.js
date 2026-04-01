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