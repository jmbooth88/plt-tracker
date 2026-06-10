import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Load user's workout data from Supabase ─────────────────────────────────
export async function loadFromSupabase(userId) {
  const { data, error } = await supabase
    .from("workout_data")
    .select("program, log")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data ?? null;
}

// ── Save user's workout data to Supabase ───────────────────────────────────
export async function saveToSupabase(userId, program, log) {
  const { error } = await supabase
    .from("workout_data")
    .upsert({ user_id: userId, program, log, updated_at: new Date().toISOString() },
      { onConflict: "user_id" });
  if (error) throw error;
}
