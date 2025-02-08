import { createClient } from '@supabase/supabase-js';
import { SecureStorage } from '@nativescript/secure-storage';

const secureStorage = new SecureStorage();

// Initialize the Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
  {
    auth: {
      storage: {
        async getItem(key: string) {
          try {
            return await secureStorage.get(key);
          } catch {
            return null;
          }
        },
        async setItem(key: string, value: string) {
          await secureStorage.set(key, value);
        },
        async removeItem(key: string) {
          await secureStorage.remove(key);
        },
      },
    },
  }
);