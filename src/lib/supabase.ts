import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Tamanho máximo de cada chunk de cookie (3KB para ter margem de segurança)
const CHUNK_SIZE = 3000;

const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {} as Record<string, string>);

    // Verifica se existe o cookie direto (sem chunks)
    if (cookies[key]) {
      return decodeURIComponent(cookies[key]);
    }

    // Tenta reconstruir de chunks
    let result = '';
    let chunkIndex = 0;
    while (cookies[`${key}.${chunkIndex}`]) {
      result += decodeURIComponent(cookies[`${key}.${chunkIndex}`]);
      chunkIndex++;
    }

    return result || null;
  },

  setItem: (key: string, value: string): void => {
    if (typeof document === 'undefined') return;

    const encodedValue = encodeURIComponent(value);
    const cookieOptions = '; domain=.ensinoplus.com.br; path=/; max-age=31536000; SameSite=Lax; Secure';

    cookieStorage.removeItem(key);

    if (encodedValue.length <= CHUNK_SIZE) {
      document.cookie = `${key}=${encodedValue}${cookieOptions}`;
      return;
    }

    const chunks = [];
    for (let i = 0; i < encodedValue.length; i += CHUNK_SIZE) {
      chunks.push(encodedValue.slice(i, i + CHUNK_SIZE));
    }

    chunks.forEach((chunk, index) => {
      document.cookie = `${key}.${index}=${chunk}${cookieOptions}`;
    });
  },

  removeItem: (key: string): void => {
    if (typeof document === 'undefined') return;

    const expireOptions = '; domain=.ensinoplus.com.br; path=/; max-age=0';

    document.cookie = `${key}=${expireOptions}`;

    for (let i = 0; i < 10; i++) {
      document.cookie = `${key}.${i}=${expireOptions}`;
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true
  }
});
