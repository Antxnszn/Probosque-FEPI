import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile;
  role: UserRole;
  isOnline: boolean;
  switchRole: (role: UserRole) => void;
}

const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  TECHNICIAN: {
    id: 'tech-juan-perez',
    name: 'Ing. Juan Pérez',
    email: 'juan.perez@probosque.edomex.gob.mx',
    role: 'TECHNICIAN',
    region: 'Valle de Toluca y Bravo',
    assignedPlotsCount: 4,
    completedAuditsCount: 14,
    deviceModel: 'Samsung Galaxy A15 (Android 14)',
    lastSyncAt: '07/10/2026 14:32',
  },
  ADMIN: {
    id: 'admin-elena-ramos',
    name: 'Dra. Elena Ramos',
    email: 'elena.ramos@probosque.edomex.gob.mx',
    role: 'ADMIN',
    region: 'Dirección General de Auditoría y Fomento',
    assignedPlotsCount: 1248,
    completedAuditsCount: 876,
    deviceModel: 'Estación Central Probosque',
    lastSyncAt: '07/10/2026 16:50',
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('probosque_role');
    return (saved === 'ADMIN' || saved === 'TECHNICIAN') ? saved : 'TECHNICIAN';
  });

  const currentUser = DEFAULT_USERS[role];
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    localStorage.setItem('probosque_role', role);
  }, [role]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem('probosque_role', newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isOnline,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
