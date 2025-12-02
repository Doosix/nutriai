
import { supabase, getUserId } from './supabaseClient';
import { FoodItem, UserProfile, ExerciseItem, DayPlan, NutritionTargets } from '../types';

/* 
  FALLBACK STORAGE:
  This service implements an "Offline-First" strategy. 
  1. It attempts to read/write to Supabase.
  2. If Supabase fails (e.g. tables missing, offline), it falls back to LocalStorage.
  3. This ensures the app works immediately even without the SQL setup.
  
  REQUIRED SQL (Run in Supabase SQL Editor):
  create table profiles ( user_id text primary key, updated_at bigint, data jsonb );
  create table food_logs ( id text primary key, user_id text, timestamp bigint, data jsonb );
  create table exercise_logs ( id text primary key, user_id text, timestamp bigint, data jsonb );
  create table meal_plans ( date text, user_id text, data jsonb, primary key (user_id, date) );
*/

const USER_ID = getUserId();

// --- Connection Check ---

export const checkConnection = async (): Promise<boolean> => {
  try {
    // Attempt to check if the profiles table exists and is accessible
    const { error } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
};

// --- Helpers for LocalStorage ---

const getLocal = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch { return defaultVal; }
};

const setLocal = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Local save failed", e); }
};

// --- Profile & Targets ---

export const saveUserProfile = async (profile: UserProfile, targets: NutritionTargets) => {
  // 1. Save Local
  setLocal('user_profile_backup', { profile, targets });

  // 2. Try Remote
  const { error } = await supabase
    .from('profiles')
    .upsert({ 
      user_id: USER_ID, 
      updated_at: Date.now(), 
      data: { profile, targets } 
    });
  
  if (error) console.warn('Supabase save profile failed (using local):', error.message);
};

export const getUserProfile = async () => {
  // 1. Try Remote
  const { data, error } = await supabase
    .from('profiles')
    .select('data')
    .eq('user_id', USER_ID)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
        console.warn('Supabase fetch profile failed (using local):', error.message);
    }
    // 2. Fallback Local
    return getLocal<{ profile: UserProfile, targets: NutritionTargets }>('user_profile_backup', { profile: {}, targets: { calories: 2000, protein: 150, carbs: 200, fat: 65, water: 2500 } });
  }

  // 3. Update Local Cache on success
  setLocal('user_profile_backup', data.data);
  return data.data as { profile: UserProfile, targets: NutritionTargets };
};

// --- Food Logs ---

export const addFoodLog = async (item: FoodItem) => {
  // 1. Save Local
  const local = getLocal<FoodItem[]>('food_log_backup', []);
  const updated = [...local, item];
  setLocal('food_log_backup', updated);

  // 2. Try Remote
  const { error } = await supabase
    .from('food_logs')
    .insert({
      id: item.id,
      user_id: USER_ID,
      timestamp: item.timestamp,
      data: item
    });
  if (error) console.warn('Supabase add food failed (using local):', error.message);
};

export const removeFoodLog = async (id: string) => {
  // 1. Save Local
  const local = getLocal<FoodItem[]>('food_log_backup', []);
  const updated = local.filter(i => i.id !== id);
  setLocal('food_log_backup', updated);

  // 2. Try Remote
  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID);
    
  if (error) console.warn('Supabase remove food failed (using local):', error.message);
};

export const getFoodLogs = async (): Promise<FoodItem[]> => {
  // 1. Try Remote
  const { data, error } = await supabase
    .from('food_logs')
    .select('data')
    .eq('user_id', USER_ID);
  
  if (error) {
    console.warn('Supabase fetch food failed (using local):', error.message);
    return getLocal<FoodItem[]>('food_log_backup', []);
  }

  // 2. Map and Update Local Cache
  const mapped = data.map((row: any) => row.data);
  setLocal('food_log_backup', mapped);
  return mapped;
};

// --- Exercise Logs ---

export const addExerciseLog = async (item: ExerciseItem) => {
  const local = getLocal<ExerciseItem[]>('exercise_log_backup', []);
  setLocal('exercise_log_backup', [...local, item]);

  const { error } = await supabase
    .from('exercise_logs')
    .insert({
      id: item.id,
      user_id: USER_ID,
      timestamp: item.timestamp,
      data: item
    });
  if (error) console.warn('Supabase add exercise failed (using local):', error.message);
};

export const removeExerciseLog = async (id: string) => {
  const local = getLocal<ExerciseItem[]>('exercise_log_backup', []);
  setLocal('exercise_log_backup', local.filter(i => i.id !== id));

  const { error } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID);
  if (error) console.warn('Supabase remove exercise failed (using local):', error.message);
};

export const getExerciseLogs = async (): Promise<ExerciseItem[]> => {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('data')
    .eq('user_id', USER_ID);
  
  if (error) {
    console.warn('Supabase fetch exercise failed (using local):', error.message);
    return getLocal<ExerciseItem[]>('exercise_log_backup', []);
  }
  
  const mapped = data.map((row: any) => row.data);
  setLocal('exercise_log_backup', mapped);
  return mapped;
};

// --- Meal Plans ---

export const saveMealPlan = async (plans: DayPlan[]) => {
  setLocal('meal_plan_backup', plans);

  const updates = plans.map(day => ({
    user_id: USER_ID,
    date: day.date,
    data: day
  }));

  const { error } = await supabase
    .from('meal_plans')
    .upsert(updates);
    
  if (error) console.warn('Supabase save plan failed (using local):', error.message);
};

export const getMealPlans = async (): Promise<DayPlan[]> => {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('data')
    .eq('user_id', USER_ID);
    
  if (error) {
    console.warn('Supabase fetch plans failed (using local):', error.message);
    return getLocal<DayPlan[]>('meal_plan_backup', []);
  }
  
  const mapped = data.map((row: any) => row.data);
  setLocal('meal_plan_backup', mapped);
  return mapped;
};
