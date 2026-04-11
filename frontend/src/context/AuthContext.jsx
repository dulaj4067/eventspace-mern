import { useEffect, useState, createContext, useContext } from 'react';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (!token || !storedUser) return;

    try {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      sessionStorage.removeItem('user');
    }
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (name, email, password) => {
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    await login(email, password);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: sessionStorage.getItem('token'),
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}