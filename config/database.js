import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Regular Supabase client
export const supabase = createClient(
    process.env.VITE_SUPABASE_URL, 
    process.env.VITE_SUPABASE_ANON_KEY
);

// Admin Supabase client with service role key
export const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
