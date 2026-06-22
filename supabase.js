// ============================================================
//  SUPABASE CONFIG
//  Replace these with your own values from supabase.com
//  Project Settings → API → Project URL & anon/public key
//  You can set them in supabase-config.js or directly below.
// ============================================================

const SUPABASE_URL  = window.SUPABASE_CONFIG?.url || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY  = window.SUPABASE_CONFIG?.key || 'YOUR_SUPABASE_ANON_KEY';

// Load Supabase from CDN (injected in pages that need it)
// Each page that uses auth must include this script BEFORE auth.js

async function getSupabase() {
  if (window._supabase) return window._supabase;

  // Dynamically load the Supabase JS client if not already present
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  window._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return window._supabase;
}
