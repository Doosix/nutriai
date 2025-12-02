
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppView, FoodItem, DailyStats, NutritionTargets, UserProfile, ExerciseItem, DayPlan, PlannedMeal, Workout, MoodEntry } from './types';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Logger from './components/Logger';
import Chat from './components/Chat';
import MealPlanner from './components/MealPlanner';
import Onboarding from './components/Onboarding';
import Insights from './components/Insights';
import * as DB from './services/databaseService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  
  // State
  const [foodLog, setFoodLog] = useState<FoodItem[]>([]);
  const [exerciseLog, setExerciseLog] = useState<ExerciseItem[]>([]);
  const [waterIntake, setWaterIntake] = useState<number>(0); // Keeping local for now, could move to DB
  const [steps, setSteps] = useState<number>(4520);
  
  const [targets, setTargets] = useState<NutritionTargets>({ 
    calories: 2000, protein: 150, carbs: 200, fat: 65, water: 2500 
  });
  
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  
  const [favorites, setFavorites] = useState<FoodItem[]>(() => {
    try {
      const saved = localStorage.getItem('favorites');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [mealPlan, setMealPlan] = useState<DayPlan[]>([]);
  
  const [moodLog, setMoodLog] = useState<MoodEntry[]>(() => {
    try {
        const saved = localStorage.getItem('mood_log');
        return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        try {
            // Check Cloud Status
            const connected = await DB.checkConnection();
            setIsCloudConnected(connected);

            // Load Profile
            const userData = await DB.getUserProfile();
            if (userData) {
                setUserProfile(userData.profile);
                setTargets(userData.targets);
            }

            // Load Logs
            const foods = await DB.getFoodLogs();
            setFoodLog(foods);

            const exercises = await DB.getExerciseLogs();
            setExerciseLog(exercises);

            const plans = await DB.getMealPlans();
            setMealPlan(plans);

        } catch (e) {
            console.error("Failed to load data", e);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  // -- Persistence Effects (Supabase) --
  
  // We trigger DB saves in the handlers directly to ensure sync, 
  // but we can also use effects for things that update frequently if needed.
  // Currently, we will move logic to handlers for explicit saves.

  // LocalStorage backups/auxiliary data
  useEffect(() => localStorage.setItem('water_intake', JSON.stringify(waterIntake)), [waterIntake]);
  useEffect(() => localStorage.setItem('daily_steps', JSON.stringify(steps)), [steps]);
  useEffect(() => localStorage.setItem('favorites', JSON.stringify(favorites)), [favorites]);
  useEffect(() => localStorage.setItem('mood_log', JSON.stringify(moodLog)), [moodLog]);

  // Notification Logic
  const lastNotificationTime = useRef<number>(0);

  useEffect(() => {
    if (userProfile.notifications?.enabled && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    }

    const checkReminders = () => {
        if (!userProfile.notifications?.enabled || Notification.permission !== 'granted') return;
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        if (Date.now() - lastNotificationTime.current < 60000) return;

        const notify = (title: string, body: string) => {
            new Notification(title, { body, icon: '/favicon.ico' });
            lastNotificationTime.current = Date.now();
        };

        const { breakfastTime, lunchTime, dinnerTime, workoutTime, sleepTime, waterInterval } = userProfile.notifications;
        if (currentTime === breakfastTime) notify("Breakfast Time! 🍳", "Start your day with a healthy meal.");
        if (currentTime === lunchTime) notify("Lunch Time! 🥗", "Fuel up for the afternoon.");
        if (currentTime === dinnerTime) notify("Dinner Time! 🍲", "Time for a balanced dinner.");
        if (currentTime === workoutTime) notify("Workout Reminder 💪", "Time to get moving!");
        if (currentTime === sleepTime) notify("Sleep Time 😴", "Time to wind down for better recovery.");
        
        if (waterInterval && waterInterval > 0) {
            const minutesToday = now.getHours() * 60 + now.getMinutes();
            if (minutesToday % waterInterval === 0) {
                notify("Hydration Check 💧", "Time to drink some water!");
            }
        }
    };

    const intervalId = setInterval(checkReminders, 30000);
    return () => clearInterval(intervalId);
  }, [userProfile.notifications]);

  // Derived Stats
  const recentFoods = useMemo(() => {
    const unique = new Map();
    [...foodLog].reverse().forEach(item => {
        if (!unique.has(item.name)) unique.set(item.name, item);
    });
    return Array.from(unique.values());
  }, [foodLog]);

  const dailyStats: DailyStats = useMemo(() => {
    const foodTotals = foodLog.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const burnedCalories = exerciseLog.reduce((acc, item) => acc + item.caloriesBurned, 0);
    const netCalories = foodTotals.calories - burnedCalories;
    const calorieDiff = Math.abs(netCalories - targets.calories);
    const calorieScore = Math.max(0, 100 - (calorieDiff / targets.calories) * 100);
    const proteinScore = Math.min(100, (foodTotals.protein / targets.protein) * 100);
    const waterScore = Math.min(100, (waterIntake / targets.water) * 100);
    const dailyScore = Math.round((calorieScore * 0.5) + (proteinScore * 0.3) + (waterScore * 0.2));

    return {
      ...foodTotals,
      caloriesBurned: burnedCalories,
      targetCalories: targets.calories,
      targetProtein: targets.protein,
      targetCarbs: targets.carbs,
      targetFat: targets.fat,
      waterIntake: waterIntake,
      waterTarget: targets.water,
      dailyScore
    };
  }, [foodLog, exerciseLog, targets, waterIntake]);

  // Handlers
  const handleAddFood = (item: Omit<FoodItem, 'id' | 'timestamp'>) => {
    const newItem: FoodItem = { ...item, id: Date.now().toString(), timestamp: Date.now() };
    setFoodLog((prev) => [...prev, newItem]);
    DB.addFoodLog(newItem); // Save to Cloud
  };

  const handleRemoveFood = (id: string) => {
      setFoodLog((prev) => prev.filter(item => item.id !== id));
      DB.removeFoodLog(id); // Remove from Cloud
  };

  const handleAddExercise = (item: Omit<ExerciseItem, 'id' | 'timestamp'>) => {
      const newItem: ExerciseItem = { ...item, id: Date.now().toString(), timestamp: Date.now() };
      setExerciseLog(prev => [...prev, newItem]);
      DB.addExerciseLog(newItem); // Save to Cloud
  };

  const handleRemoveExercise = (id: string) => {
      setExerciseLog((prev) => prev.filter(item => item.id !== id));
      DB.removeExerciseLog(id); // Remove from Cloud
  };

  const handleUpdateProfile = (profile: UserProfile) => {
      setUserProfile(profile);
      DB.saveUserProfile(profile, targets);
  };

  const handleUpdateTargets = (newTargets: NutritionTargets) => {
      setTargets(newTargets);
      DB.saveUserProfile(userProfile, newTargets);
  };

  const handleToggleFavorite = (item: FoodItem) => {
      setFavorites(prev => {
          if (prev.some(f => f.name === item.name)) {
              return prev.filter(f => f.name !== item.name);
          }
          return [...prev, item];
      });
  };

  const handleLogMood = (mood: MoodEntry['mood']) => {
      const newEntry: MoodEntry = { id: Date.now().toString(), timestamp: Date.now(), mood };
      setMoodLog(prev => [...prev, newEntry]);
  };

  const handleAddWater = (amount: number) => setWaterIntake(prev => Math.max(0, prev + amount));

  const handleUpdateMealPlan = (plan: DayPlan[]) => {
      setMealPlan(plan);
      DB.saveMealPlan(plan);
  };

  const handleLogPlannedMeal = (plannedMeal: PlannedMeal) => {
      // Mark as logged locally
      const updatedPlan = mealPlan.map(day => ({
          ...day,
          meals: day.meals.map(m => m.id === plannedMeal.id ? { ...m, isLogged: true } : m)
      }));
      setMealPlan(updatedPlan);
      DB.saveMealPlan(updatedPlan); // Update plan status in DB

      // Add to food log
      handleAddFood({
          name: plannedMeal.recipe.name,
          calories: plannedMeal.recipe.calories,
          protein: plannedMeal.recipe.protein,
          carbs: plannedMeal.recipe.carbs,
          fat: plannedMeal.recipe.fat,
          mealType: plannedMeal.type,
          servingSize: '1 portion',
          quantity: 1
      });
  };

  const handleLogPlannedWorkout = (workout: Workout) => {
      const updatedPlan = mealPlan.map(day => ({
          ...day,
          workouts: day.workouts.map(w => w.id === workout.id ? { ...w, isCompleted: true } : w)
      }));
      setMealPlan(updatedPlan);
      DB.saveMealPlan(updatedPlan);

      handleAddExercise({
          name: workout.name,
          caloriesBurned: workout.caloriesEstimate,
          durationMinutes: parseInt(workout.duration) || 30
      });
  };

  const handleConnectDevice = () => {
      alert("Simulating connection to Fitbit...");
      setTimeout(() => {
          setSteps(8432);
          alert("Connected! Steps synced.");
      }, 1000);
  };

  const handleOnboardingComplete = (profile: UserProfile, newTargets: NutritionTargets) => {
      setUserProfile(profile);
      setTargets(newTargets);
      
      if (!profile.notifications) {
          const defaultNotifications = {
              enabled: false,
              breakfastTime: '08:00',
              lunchTime: '13:00',
              dinnerTime: '19:00',
              workoutTime: '17:00',
              sleepTime: '23:00',
              waterInterval: 120
          };
          setUserProfile(prev => ({ ...prev, notifications: defaultNotifications }));
      }
      
      DB.saveUserProfile(profile, newTargets);
  };

  if (isLoading) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-emerald-600 font-bold">Loading Data...</div>;
  }

  // Show onboarding if essential profile info is missing (and we've finished loading)
  if (!userProfile.age || !userProfile.goal) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <main className="flex-1 p-6 pb-32 max-w-md mx-auto w-full">
        {currentView === AppView.DASHBOARD && (
          <Dashboard 
            foodLog={foodLog} 
            exerciseLog={exerciseLog}
            stats={dailyStats}
            targets={targets}
            userProfile={userProfile}
            steps={steps}
            isCloudConnected={isCloudConnected}
            onUpdateTargets={handleUpdateTargets}
            onUpdateProfile={handleUpdateProfile}
            onRemoveItem={handleRemoveFood}
            onRemoveExercise={handleRemoveExercise}
            onAddWater={handleAddWater}
            onNavigateToLog={() => setCurrentView(AppView.LOG_FOOD)}
            onAddExercise={handleAddExercise}
            onConnectDevice={handleConnectDevice}
          />
        )}
        
        {currentView === AppView.PLAN && (
          <MealPlanner 
            userProfile={userProfile}
            mealPlan={mealPlan}
            onUpdatePlan={handleUpdateMealPlan}
            onLogMeal={handleLogPlannedMeal}
            onLogWorkout={handleLogPlannedWorkout}
          />
        )}

        {currentView === AppView.LOG_FOOD && (
          <Logger 
            onAddFood={handleAddFood} 
            onSuccess={() => setCurrentView(AppView.DASHBOARD)}
            recentFoods={recentFoods}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            userProfile={userProfile}
          />
        )}
        
        {currentView === AppView.CHAT && (
          <Chat 
            userProfile={userProfile} 
            stats={dailyStats}
            targets={targets}
            onLogMood={handleLogMood}
          />
        )}

        {currentView === AppView.INSIGHTS && (
          <Insights 
            foodLog={foodLog}
            waterIntake={waterIntake}
            moodLog={moodLog}
            userProfile={userProfile}
          />
        )}
      </main>

      <Navigation currentView={currentView} setView={setCurrentView} />
    </div>
  );
};

export default App;
