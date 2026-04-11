import axios from 'axios';

const API = '/api/community';

const authAxios = () => {
  const token = sessionStorage.getItem('token');
  return axios.create({
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
};

export const getCommunityMembers = () =>
  authAxios().get(`${API}/members`);

export const getAvailableChats = () =>
  authAxios().get(`${API}/chats`);

export const getMessages = (communityId, params = {}) =>
  authAxios().get(`${API}/messages/${communityId}`, { params });

export const sendMessage = (data) =>
  authAxios().post(`${API}/messages`, data);

export const updateMessage = (id, data) =>
  authAxios().put(`${API}/messages/${id}`, data);

export const deleteMessage = (id) =>
  authAxios().delete(`${API}/messages/${id}`);

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('image', file); // Existing backend endpoint uses 'image' fieldname
  return authAxios().post('/api/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
