import { v4 as uuidv4 } from 'uuid';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  date: string;
  messages: ChatMessage[];
}

export interface SearchRecord {
  id: string;
  keyword: string;
  city?: string;
  timestamp: number;
}

export interface UserProfile {
  id: string | number;
  phone?: string;
  nickname?: string;
  avatar?: string;
  isElderlyMode: boolean;
  preferences?: {
    crowd: string;
    style: string;
    cities: string[];
    emergencyContact?: string;
  };
}

export interface ItineraryRecord {
  id: string;
  destination: string;
  data: any; // 存储完整的行程规划 JSON 数据
  timestamp: number;
}

// ---------------- User & Auth ----------------

export const getUser = (): UserProfile | null => {
  const data = localStorage.getItem('user_profile');
  return data ? JSON.parse(data) : null;
};

export const saveUser = (user: UserProfile | null) => {
  if (user) {
    localStorage.setItem('user_profile', JSON.stringify(user));
  } else {
    localStorage.removeItem('user_profile');
  }
};

export const getElderlyMode = (): boolean => {
  const user = getUser();
  if (user) return user.isElderlyMode;
  return localStorage.getItem('elderly_mode') === 'true';
};

export const setElderlyMode = (isElderly: boolean) => {
  localStorage.setItem('elderly_mode', String(isElderly));
  const user = getUser();
  if (user) {
    user.isElderlyMode = isElderly;
    saveUser(user);
  }
};

export const getHasSeenOnboarding = (): boolean => {
  return localStorage.getItem('has_seen_onboarding') === 'true';
};

export const setHasSeenOnboarding = (seen: boolean) => {
  localStorage.setItem('has_seen_onboarding', String(seen));
};

export const getGuestItineraryCount = (): number => {
  return parseInt(localStorage.getItem('guest_itinerary_count') || '0', 10);
};

export const incrementGuestItineraryCount = () => {
  const count = getGuestItineraryCount();
  localStorage.setItem('guest_itinerary_count', String(count + 1));
};

// ---------------- Chat History ----------------

export const getHistory = (): ChatSession[] => {
  const data = localStorage.getItem('chat_history');
  return data ? JSON.parse(data) : [];
};

export const saveHistory = (sessions: ChatSession[]) => {
  localStorage.setItem('chat_history', JSON.stringify(sessions));
};

export const addMessageToHistory = (role: 'user' | 'ai', text: string) => {
  const sessions = getHistory();
  const today = new Date().toISOString().split('T')[0];
  
  let session = sessions.find(s => s.date === today);
  if (!session) {
    session = { id: uuidv4(), date: today, messages: [] };
    sessions.unshift(session);
  }
  
  session.messages.push({
    id: uuidv4(),
    role,
    text,
    timestamp: Date.now(),
  });
  
  saveHistory(sessions);
};

export const getSearchHistory = (): SearchRecord[] => {
  const data = localStorage.getItem('search_history');
  return data ? JSON.parse(data) : [];
};

export const saveSearchHistory = (records: SearchRecord[]) => {
  localStorage.setItem('search_history', JSON.stringify(records));
};

export const addSearchToHistory = (keyword: string, city?: string) => {
  const records = getSearchHistory();
  records.unshift({
    id: uuidv4(),
    keyword,
    city,
    timestamp: Date.now(),
  });
  saveSearchHistory(records);
};

export const clearSearchHistory = () => {
  localStorage.removeItem('search_history');
};

export const getItineraryHistory = (): ItineraryRecord[] => {
  const data = localStorage.getItem('itinerary_history');
  return data ? JSON.parse(data) : [];
};

export const saveItineraryHistory = (records: ItineraryRecord[]) => {
  localStorage.setItem('itinerary_history', JSON.stringify(records));
};

export const addItineraryToHistory = (destination: string, data: any) => {
  const records = getItineraryHistory();
  records.unshift({
    id: uuidv4(),
    destination,
    data,
    timestamp: Date.now(),
  });
  saveItineraryHistory(records);
};

export const clearItineraryHistory = () => {
  localStorage.removeItem('itinerary_history');
};
