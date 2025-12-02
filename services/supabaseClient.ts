
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scgfzismtslihubzlrsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjZ2Z6aXNtdHNsaWh1YnpscnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDc1NTYsImV4cCI6MjA3OTI4MzU1Nn0.3oB-se3Sy4Bx11-ifT2Yyzf8KIcmRb-cSNV3yGDXXXA';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to get or create a persistent "Guest" User ID
export const getUserId = (): string => {
  try {
    let uid = localStorage.getItem('nutri_user_id');
    if (!uid) {
      // Robust fallback for environments where crypto.randomUUID is not available
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        uid = crypto.randomUUID();
      } else {
        uid = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      }
      localStorage.setItem('nutri_user_id', uid);
    }
    return uid;
  } catch (e) {
    console.warn("LocalStorage access denied, using temporary session ID");
    return 'guest_session_' + Math.random().toString(36).substr(2, 5);
  }
};
