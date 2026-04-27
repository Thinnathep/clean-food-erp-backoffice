import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../config/supabase';

interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isInitializing: boolean;
  user: AuthUser | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setInitializing: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isInitializing: true,
      user: null,
      
      setInitializing: (val) => set({ isInitializing: val }),

      setUser: (user) => {
        set({ 
          user, 
          isAuthenticated: !!user,
          isInitializing: false
        });
      },

      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message === 'Invalid login credentials') {
            throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          }
          throw new Error(error.message);
        }

        if (data.user) {
          set({ 
            isAuthenticated: true, 
            user: { 
              id: data.user.id,
              email: data.user.email || '',
              name: data.user.user_metadata?.full_name || 'Admin User',
              role: data.user.user_metadata?.role || 'ADMIN'
            } 
          });
        }
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ isAuthenticated: false, user: null });
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);

