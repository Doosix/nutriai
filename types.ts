
export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MicroNutrients {
  sugar?: number; // g
  fiber?: number; // g
  sodium?: number; // mg
  cholesterol?: number; // mg
  potassium?: number; // mg
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number; // in ml
}

export interface NotificationSettings {
  enabled: boolean;
  breakfastTime: string;
  lunchTime: string;
  dinnerTime: string;
  workoutTime: string;
  sleepTime: string;
  waterInterval: number; // in minutes (e.g. 60, 90, 120)
}

export interface UserProfile {
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  weight?: number; // kg
  height?: number; // cm
  activityLevel?: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active';
  goal?: 'Weight Loss' | 'Maintenance' | 'Muscle Gain';
  dietaryPreference?: 'None' | 'Vegetarian' | 'Vegan' | 'Keto' | 'Paleo' | 'Pescatarian';
  allergies?: string;
  medicalConditions?: string;
  consultationBooked?: boolean;
  notifications?: NotificationSettings;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface FoodItem extends NutritionData, MicroNutrients {
  id: string;
  name: string;
  timestamp: number;
  imageUrl?: string;
  mealType: MealType;
  servingSize?: string;
  servingUnit?: string;
  quantity?: number;
  healthScore?: number; // 1-100
  healthReason?: string;
  warnings?: string[];
  allergens?: string[];
}

export interface ExerciseItem {
  id: string;
  name: string;
  caloriesBurned: number;
  durationMinutes: number;
  timestamp: number;
}

export interface DailyStats extends NutritionData {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterIntake: number;
  waterTarget: number;
  caloriesBurned: number;
  dailyScore: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  LOG_FOOD = 'LOG_FOOD',
  CHAT = 'CHAT',
  PLAN = 'PLAN',
  INSIGHTS = 'INSIGHTS',
}

export interface FoodSearchResult extends NutritionData, MicroNutrients {
  name: string;
  brand?: string;
  servingSize: string;
  servingUnit: string;
  healthScore?: number;
  healthReason?: string;
  warnings?: string[];
  allergens?: string[];
}

// --- Meal Planner Types ---

export interface Ingredient {
  item: string;
  amount: string;
  checked?: boolean;
}

export interface Recipe extends NutritionData {
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
}

export interface Workout {
  id: string;
  name: string;
  duration: string; // e.g. "30 mins"
  intensity: 'Low' | 'Medium' | 'High';
  caloriesEstimate: number;
  instructions: string[];
  isCompleted: boolean;
}

export interface PlannedMeal {
  id: string;
  type: MealType;
  recipe: Recipe;
  isLogged: boolean;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  meals: PlannedMeal[];
  workouts: Workout[];
}

// --- Insights Types ---

export interface MoodEntry {
  id: string;
  timestamp: number;
  mood: 'Stressed' | 'Tired' | 'Sore' | 'Cravings' | 'Happy' | 'Energetic';
}

export interface HabitInsight {
  score: number; // 0-100
  streak: number;
  trendTitle: string;
  trendDescription: string;
  advice: string;
  eatingWindowStart?: string;
  eatingWindowEnd?: string;
  lateNightSnacks: number;
}
