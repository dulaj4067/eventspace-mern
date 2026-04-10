import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  Users, Hash, MessageSquare, Send, Search, Plus, 
  Settings, User, Briefcase, Calendar, 
  MoreVertical, Activity, Globe, Sidebar, 
  FileText, Paperclip, X, Image as ImageIcon,
  Edit, Trash2, AtSign, Smile, BarChart3, Bell, Lock, Info, ExternalLink,
  ChevronDown, Download, CheckCircle2, Clock
} from 'lucide-react';
import { 
  getCommunityMembers, getMessages, sendMessage, 
  getAvailableChats, uploadFile, deleteMessage, updateMessage 
} from '../../services/communityService';
import { Button } from '../ui/button.jsx';
import { toast } from 'sonner';

export const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const [members, setMembers] = useState([]);
  const [availableChats, setAvailableChats] = useState({ facilities: [], events: [] });
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('general'); 
  const [activeTabName, setActiveTabName] = useState('General Community');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // ID of message with open dropdown
  
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchMembers();
    if (isAuthenticated) {
      fetchChats();
    }
    fetchMessages('general');
    
    const interval = setInterval(fetchMembers, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const fetchMembers = async () => {
    try {
      const response = await getCommunityMembers();
      setMembers(response.data.members || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await getAvailableChats();
      setAvailableChats(response.data);
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  const fetchMessages = async (communityId) => {
    setLoading(true);
    try {
      const isDirect = communityId.startsWith('dm_');
      const params = isDirect ? { isDirect: true, recipientId: communityId.replace('dm_', ''), limit: 100 } : { limit: 100 };
      const actualId = isDirect ? 'direct' : communityId;
      
      const response = await getMessages(actualId, params);
      setMessages(response.data.messages || []);
      setLoading(false);
      
      setTimeout(() => scrollToBottom('auto'), 50);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to send messages');
      return;
    }
    if (!newMessage.trim() && !attachedFile) return;

    if (editingMessage) {
      handleUpdate();
      return;
    }

    try {
      let fileData = null;
      if (attachedFile) {
        setIsUploading(true);
        const uploadRes = await uploadFile(attachedFile);
        fileData = { url: uploadRes.data.imageUrl, name: attachedFile.name };
        setIsUploading(false);
      }

      const isDirect = activeTab.startsWith('dm_');
      const isFacility = activeTab.startsWith('facility_');
      const isEvent = activeTab.startsWith('event_');

      const payload = {
        content: newMessage,
        communityId: isDirect ? 'direct' : activeTab,
        isDirect,
        recipient: isDirect ? activeTab.replace('dm_', '') : undefined,
        fileUrl: fileData?.url,
        fileName: fileData?.name,
        facilityId: isFacility ? activeTab.replace('facility_', '') : undefined,
        eventId: isEvent ? activeTab.replace('event_', '') : undefined
      };

      const response = await sendMessage(payload);
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      setAttachedFile(null);
      scrollToBottom('smooth');
    } catch (err) {
      toast.error('Failed to send message');
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const response = await updateMessage(editingMessage._id, { content: newMessage });
      const updatedMessages = messages.map(m => m._id === editingMessage._id ? { ...m, content: response.data.message.content, updatedAt: response.data.message.updatedAt } : m);
      setMessages(updatedMessages);
      setEditingMessage(null);
      setNewMessage('');
      toast.success('Message updated');
    } catch (err) {
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMessage(id);
      setMessages(messages.filter(m => m._id !== id));
      setActiveDropdown(null);
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  const scrollToBottom = (behavior = 'smooth') => {
    if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = scrollRef.current;
        const isNearBottom = scrollHeight - clientHeight - scrollTop < 350;
        if (isNearBottom || behavior === 'auto') {
            chatEndRef.current?.scrollIntoView({ behavior });
        }
    } else {
        chatEndRef.current?.scrollIntoView({ behavior });
    }
  };

  const selectRoom = (id, name) => {
    if (!isAuthenticated && id !== 'general') {
        toast.error('Please login to access sub-communities or direct messages');
        return;
    }
    setActiveTab(id);
    setActiveTabName(name);
    fetchMessages(id);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    const lastChar = value[value.length - 1];
    if (lastChar === '@' && isAuthenticated) {
        setShowMentionList(true);
    } else if (value.indexOf('@') === -1 || value.endsWith(' ')) {
        setShowMentionList(false);
    }
  };

  const addMention = (name) => {
    setNewMessage(prev => prev + name + ' ');
    setShowMentionList(false);
    inputRef.current?.focus();
  };

  const getFilteredGroups = () => {
    const query = searchQuery.toLowerCase();
    const facilityMatches = availableChats.facilities.filter(f => 
      f.name.toLowerCase().includes(query) || (f.owner?.name.toLowerCase().includes(query))
    );
    const eventMatches = availableChats.events.filter(e => 
      e.name.toLowerCase().includes(query) || (e.organizer?.name.toLowerCase().includes(query))
    );
    const memberMatches = members.filter(m => 
      m.name.toLowerCase().includes(query) || (m.association?.toLowerCase()?.includes(query))
    );
    return { facilityMatches, eventMatches, memberMatches };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const { facilityMatches, eventMatches, memberMatches } = getFilteredGroups();

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50 font-inter">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r flex flex-col shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-600" />
            Community
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search members, events..." 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {/* Channels */}
          <div>
            <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                Public
                {isAuthenticated && <Plus className="w-3 h-3 cursor-pointer hover:text-indigo-600" />}
            </h3>
            <div className="space-y-1">
              <button 
                onClick={() => selectRoom('general', 'General Community')}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                    <Hash className="w-4 h-4" />
                    Global Chat
                </div>
                <div className="w-2 h-2 rounded-full bg-green-400 border border-white"></div>
              </button>
            </div>
          </div>

          {/* Sub-communities */}
          {isAuthenticated && (
              <>
                {facilityMatches.length > 0 && (
                     <div>
                        <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Facilities</h3>
                        <div className="space-y-1">
                            {facilityMatches.map(f => (
                                <button 
                                    key={f._id}
                                    onClick={() => selectRoom(`facility_${f._id}`, f.name)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === `facility_${f._id}` ? 'bg-teal-600 text-white shadow-lg shadow-teal-100' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${activeTab === `facility_${f._id}` ? 'bg-white/20' : 'bg-teal-50 text-teal-600'}`}>
                                        <Briefcase className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="truncate w-40">{f.name}</p>
                                        <p className={`text-[10px] opacity-70`}>{f.owner?.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                {eventMatches.length > 0 && (
                     <div>
                        <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Events</h3>
                        <div className="space-y-1">
                            {eventMatches.map(e => (
                                <button 
                                    key={e._id}
                                    onClick={() => selectRoom(`event_${e._id}`, e.name)}
                                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === `event_${e._id}` ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${activeTab === `event_${e._id}` ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>
                                        <Calendar className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="truncate w-40">{e.name}</p>
                                        <p className={`text-[10px] opacity-70`}>{e.organizer?.name}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                <div>
                    <h3 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Messages</h3>
                    <div className="space-y-1">
                    {memberMatches.map(member => (
                        member._id !== user?.id && (
                        <button 
                            key={member._id}
                            onClick={() => selectRoom(`dm_${member._id}`, member.name)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all ${activeTab === `dm_${member._id}` ? 'bg-white border shadow-md font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <div className="relative flex-shrink-0">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                                {member.name.charAt(0)}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white rounded-full ${member.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            </div>
                            <div className="flex-1 text-left min-w-0">
                            <div className="flex justify-between items-center mb-0.5">
                                <p className="font-bold text-gray-900 truncate">{member.name}</p>
                                {member.unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full font-bold">{member.unreadCount}</span>}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate font-semibold uppercase tracking-tight">
                                {member.role} {member.association && `• ${member.association}`}
                            </p>
                            </div>
                        </button>
                        )
                    ))}
                    </div>
                </div>
              </>
          )}

          {!isAuthenticated && (
              <div className="p-4 bg-indigo-50 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-600 text-center">Login to access facilities, events and private messaging.</p>
              </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xl shadow-indigo-100">
              {user?.name?.charAt(0) || 'G'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest User'}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">{user?.role || 'Viewer'}</p>
            </div>
            {isAuthenticated && (
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'}`}
                >
                <Settings className={`w-5 h-5 ${showSettings ? 'animate-spin-slow' : ''}`} />
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

        {/* Chat Header */}
        <div className="h-20 border-b px-8 flex items-center justify-between shadow-sm z-20 bg-white/80 backdrop-blur-md sticky top-0">
          <div className="flex items-center gap-5">
            <div className={`p-4 rounded-2xl shadow-sm ${
                activeTab.startsWith('dm_') ? 'bg-indigo-50 text-indigo-600' : 
                activeTab.startsWith('facility_') ? 'bg-teal-50 text-teal-600' : 
                activeTab.startsWith('event_') ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {activeTab.startsWith('dm_') ? <User className="w-6 h-6" /> : 
               activeTab.startsWith('facility_') ? <Briefcase className="w-6 h-6" /> :
               activeTab.startsWith('event_') ? <Calendar className="w-6 h-6" /> :
               <Hash className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  {activeTabName}
                  {activeTab.startsWith('dm_') && members.find(m => m._id === activeTab.replace('dm_', ''))?.isOnline && (
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                  )}
              </h1>
              <p className="text-xs text-gray-400 font-bold tracking-wide uppercase flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                {isAuthenticated ? 'Secure Encrypted Channel' : 'View Only Mode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowStats(!showStats)}
                className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-2xl font-bold text-sm transition-all ${showStats ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'border-gray-100 hover:border-indigo-100 hover:text-indigo-600 text-gray-600'}`}
            >
              <BarChart3 className="w-4 h-4" />
              Insights
            </button>
          </div>
        </div>

        {/* Messages Container */}
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-10 space-y-8 z-10 scroll-smooth"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="p-10 bg-indigo-50 rounded-[3rem] mb-8">
                <MessageSquare className="w-16 h-16 text-indigo-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Channel Initialized</h3>
              <p className="text-sm font-medium text-gray-400">No messages found here yet.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg._id} 
                className={`flex gap-5 group transition-all animate-in slide-in-from-bottom-5 duration-500 ${msg.sender?._id === user?.id ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0 self-end">
                  <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-white font-black shadow-lg ${msg.sender?._id === user?.id ? 'bg-indigo-600' : 'bg-gray-800'}`}>
                    {msg.sender?.name?.charAt(0) || '?'}
                  </div>
                </div>
                
                <div className={`max-w-[75%] relative ${msg.sender?._id === user?.id ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                  <div className="flex items-center gap-3 px-2">
                    <span className="text-xs font-black text-gray-900 tracking-tight uppercase">{msg.sender?.name}</span>
                    <span className="text-[10px] text-gray-300 font-bold">{formatDate(msg.createdAt)}</span>
                  </div>
                  
                  <div className="relative flex items-center gap-2">
                    {isAuthenticated && msg.sender?._id === user?.id && (
                        <button 
                            onClick={() => setActiveDropdown(activeDropdown === msg._id ? null : msg._id)}
                            className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all text-gray-400"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    )}

                    <div className={`p-5 rounded-[2.25rem] shadow-sm text-[15px] font-medium leading-relaxed group-hover:shadow-md transition-shadow relative ${
                        user && msg.sender?._id === user?.id 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border text-gray-800 rounded-tl-none'
                    }`}>
                        {msg.content}
                        
                        {msg.fileUrl && (
                            <div className={`mt-4 p-4 rounded-2xl flex items-center gap-4 border transition-colors ${
                                user && msg.sender?._id === user?.id ? 'bg-white/10 border-white/20' : 'bg-gray-50 border-gray-100'
                            }`}>
                                <div className="p-3 bg-indigo-500 rounded-xl text-white">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{msg.fileName}</p>
                                    <a href={`http://localhost:5000${msg.fileUrl}`} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest hover:underline">View File</a>
                                </div>
                            </div>
                        )}

                        {activeDropdown === msg._id && isAuthenticated && (
                            <div className="absolute top-0 right-full mr-2 w-40 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                                <button 
                                    onClick={() => {
                                        setEditingMessage(msg);
                                        setNewMessage(msg.content);
                                        setActiveDropdown(null);
                                        inputRef.current?.focus();
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4 text-indigo-600" />
                                    Edit
                                </button>
                                <button 
                                    onClick={() => handleDelete(msg._id)}
                                    className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Modals */}
        {showStats && (
            <div className="absolute top-24 right-8 w-96 bg-white rounded-[2rem] shadow-3xl border border-gray-100 p-8 z-50 animate-in slide-in-from-right-10 duration-500">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900">Room Info</h3>
                    <button onClick={() => setShowStats(false)}><X className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm font-bold text-gray-600">Active Participants: {members.filter(m => m.isOnline).length}</p>
                    <p className="text-sm font-bold text-gray-600">Total History: {messages.length} messages</p>
                </div>
            </div>
        )}

        {showSettings && isAuthenticated && (
            <div className="absolute bottom-24 left-8 w-72 bg-white rounded-[2rem] shadow-3xl border border-gray-100 p-6 z-50">
                <h3 className="text-lg font-black text-gray-900 mb-4 px-2">Settings</h3>
                <div className="space-y-1">
                    <button className="w-full p-3 flex items-center gap-3 font-bold text-sm text-gray-600 hover:bg-gray-50 rounded-xl">
                        <Bell className="w-4 h-4" /> Notifications
                    </button>
                    <button className="w-full p-3 flex items-center gap-3 font-bold text-sm text-gray-600 hover:bg-gray-50 rounded-xl">
                        <Lock className="w-4 h-4" /> Privacy
                    </button>
                </div>
            </div>
        )}

        {/* Mention Dropdown */}
        {showMentionList && (
            <div className="absolute bottom-24 left-10 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                {members.map(m => (
                    <button 
                        key={m._id}
                        onClick={() => addMention(m.name)}
                        className="w-full p-4 flex items-center gap-3 hover:bg-indigo-50 transition-colors border-b last:border-0"
                    >
                        <span className="text-sm font-bold text-gray-700">{m.name}</span>
                    </button>
                ))}
            </div>
        )}

        {/* Input Area */}
        <div className="p-10 border-t bg-white z-20">
          {isAuthenticated ? (
              <form onSubmit={handleSend} className="relative flex items-center gap-4">
                <div className="relative flex-1 group">
                    {editingMessage && (
                        <div className="absolute -top-10 left-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-t-xl flex justify-between items-center">
                            Editing Mode
                            <X className="w-3 h-3 cursor-pointer" onClick={() => { setEditingMessage(null); setNewMessage(''); }} />
                        </div>
                    )}
                    <input 
                      type="text" 
                      ref={inputRef}
                      placeholder={editingMessage ? "Update your message..." : `Type your message here...`}
                      className={`w-full pl-6 pr-14 py-5 bg-gray-50 border-2 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-semibold text-gray-700 shadow-inner ${editingMessage ? 'border-indigo-600' : 'border-gray-50'}`}
                      value={newMessage}
                      onChange={handleInputChange}
                      autoComplete="off"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-gray-400 hover:text-indigo-600"><Paperclip className="w-5 h-5" /></button>
                    </div>
                </div>
                
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachedFile(e.target.files[0])} />

                <button 
                  type="submit"
                  disabled={isUploading || (!newMessage.trim() && !attachedFile)}
                  className="p-5 bg-indigo-600 text-white rounded-[2rem] hover:bg-indigo-700 shadow-2xl transition-all active:scale-95 group"
                >
                  {isUploading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div> : editingMessage ? <CheckCircle2 className="w-6 h-6" /> : <Send className="w-6 h-6" />}
                </button>
              </form>
          ) : (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-sm font-bold text-gray-400">Please sign in to participate in the conversation.</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
