import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_BACKEND_URL
  ? `${import.meta.env.VITE_BACKEND_URL}/api/v1`
  : 'https://digidata.onrender.com/api/v1';

const STORAGE_KEY = 'digidata_owner_pin';

const AdminContext = createContext({
  isAdmin: false,
  adminPin: '',
  isPinModalOpen: false,
  openPinModal: () => {},
  closePinModal: () => {},
  unlock: async () => ({ success: false }),
  lock: () => {},
  getAuthHeaders: () => ({}),
});

export const AdminProvider = ({ children }) => {
  const [adminPin, setAdminPin] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [isAdmin, setIsAdmin] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)));
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Validate saved PIN on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetch(`${API_BASE}/trades/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: saved }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setIsAdmin(true);
            setAdminPin(saved);
          } else {
            // Expired or changed PIN
            localStorage.removeItem(STORAGE_KEY);
            setIsAdmin(false);
            setAdminPin('');
          }
        })
        .catch(() => {
          // If offline or network error, trust local for offline use
          setIsAdmin(true);
        });
    }
  }, []);

  const openPinModal = useCallback((onSuccessCallback = null) => {
    setPendingAction(() => onSuccessCallback);
    setIsPinModalOpen(true);
  }, []);

  const closePinModal = useCallback(() => {
    setIsPinModalOpen(false);
    setPendingAction(null);
  }, []);

  const unlock = useCallback(async (pin) => {
    try {
      const res = await fetch(`${API_BASE}/trades/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(STORAGE_KEY, pin);
        setAdminPin(pin);
        setIsAdmin(true);
        setIsPinModalOpen(false);
        toast.success('Owner Mode Unlocked! 🚀');
        if (pendingAction && typeof pendingAction === 'function') {
          pendingAction();
          setPendingAction(null);
        }
        return { success: true };
      }
      return { success: false, message: data.message || 'Incorrect Owner PIN' };
    } catch (e) {
      return { success: false, message: 'Server connection error' };
    }
  }, [pendingAction]);

  const lock = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdminPin('');
    setIsAdmin(false);
    toast('Logged out — Switched to Visitor Mode 🔒');
  }, []);

  const getAuthHeaders = useCallback(() => {
    return {
      'x-admin-pin': adminPin || localStorage.getItem(STORAGE_KEY) || '',
    };
  }, [adminPin]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminPin,
        isPinModalOpen,
        openPinModal,
        closePinModal,
        unlock,
        lock,
        getAuthHeaders,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => useContext(AdminContext);
