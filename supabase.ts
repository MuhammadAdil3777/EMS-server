import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure Supabase client with retries and better error handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'etams'
    },
    // Add fetch options for better network handling
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    }
  },
  db: {
    schema: 'public'
  },
  // Add realtime subscription options
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Enhanced error handling with more specific messages
export const handleSupabaseError = (error: unknown): string => {
  if (error instanceof Error) {
    // Network errors
    if (error.message === 'Failed to fetch') {
      return 'Connection error. Please check your internet connection and try again.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    if (error.message.includes('abort')) {
      return 'Request was cancelled. Please try again.';
    }
    
    // Auth errors
    if (error.message.includes('auth')) {
      return 'Authentication error. Please sign in again.';
    }

    // Database errors
    if (error.message.includes('duplicate key')) {
      return 'This record already exists.';
    }
    if (error.message.includes('foreign key')) {
      return 'Invalid reference to another record.';
    }

    // Return the original error message if none of the above
    return error.message;
  }

  // Handle Supabase-specific error objects
  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; details?: string; hint?: string };
    return supabaseError.message || supabaseError.details || supabaseError.hint || 'An unexpected error occurred';
  }

  return 'An unexpected error occurred';
};

// Enhanced retry wrapper with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if it's not a network error
      if (error instanceof Error && 
          !error.message.includes('Failed to fetch') &&
          !error.message.includes('timeout') &&
          !error.message.includes('network')) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, i);
      
      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 200;
      
      // Wait before retrying, but don't wait on the last attempt
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }
  
  throw lastError;
}

// Add a helper to check connection status
export async function checkConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    return !error && data !== null;
  } catch {
    return false;
  }
}