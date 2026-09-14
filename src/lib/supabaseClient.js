import { createClient } from "@supabase/supabase-js";
import { getPurdueDateString } from "./purdueDate";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev rather than silently issuing requests with `undefined`.
  console.error(
    "Missing REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY environment variables."
  );
}

// Anon key only — public, read-only via RLS. The service role key must never
// appear in client code; it lives solely in the GitHub Actions scraper job.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function fetchTodaysMenuItems(date = getPurdueDateString()) {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("date", date);

  if (error) throw error;
  return data;
}
