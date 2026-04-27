import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  user: { name: string; role: string; email: string } | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email, password) => {
        // Mock login delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Accept any login for now as a mock
        if (email && password) {
          set({ 
            isAuthenticated: true, 
            user: { name: 'Admin User', role: 'ADMIN', email } 
          });
        } else {
          throw new Error('กรุณากรอกอีเมลและรหัสผ่าน');
        }
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      }
    }),
    {
      name: 'auth-storage', // name of the item in the storage (must be unique)
    }
  )
);

