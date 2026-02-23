import { useState, createContext, useContext } from 'react';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    // Mock login - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      name: email.split('@')[0],
      email,
    });
  };

  const register = async (name, email, password) => {
    // Mock registration - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser({
      id: '1',
      name,
      email,
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
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
