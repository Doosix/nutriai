
import React, { useState } from 'react';
import { DayPlan, UserProfile, PlannedMeal, Recipe, Ingredient, Workout } from '../types';
import { generateMealPlan, suggestSwap } from '../services/geminiService';
import { Loader2, RefreshCw, ShoppingCart, Clock, ChefHat, Flame, X, Check, Dumbbell, Zap, Calendar, ArrowRight, DollarSign, ListOrdered, Utensils } from 'lucide-react';

interface MealPlannerProps {
  userProfile: UserProfile;
  mealPlan: DayPlan[];
  onUpdatePlan: (plan: DayPlan[]) => void;
  onLogMeal: (meal: PlannedMeal) => void;
  onLogWorkout: (workout: Workout) => void;
}

const MealPlanner: React.FC<MealPlannerProps> = ({ userProfile, mealPlan, onUpdatePlan, onLogMeal, onLogWorkout }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'meals' | 'workouts'>('meals');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [isSwapping, setIsSwapping] = useState<string | null>(null);
  
  // Generation Settings
  const [planDuration, setPlanDuration] = useState<3 | 7>(3);
  const [budgetLevel, setBudgetLevel] = useState<'Economy' | 'Standard' | 'Premium'>('Standard');

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const plan = await generateMealPlan(userProfile, planDuration, budgetLevel);
      onUpdatePlan(plan);
      setSelectedDayIndex(0);
    } catch (error) {
      alert("Failed to generate plan.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwap = async (dayIndex: number, mealId: string, currentRecipe: Recipe) => {
    setIsSwapping(mealId);
    try {
        const newRecipe = await suggestSwap(currentRecipe, userProfile);
        const newPlan = [...mealPlan];
        const mealIdx = newPlan[dayIndex].meals.findIndex(m => m.id === mealId);
        if (mealIdx >= 0) {
            newPlan[dayIndex].meals[mealIdx].recipe = newRecipe;
            onUpdatePlan(newPlan);
        }
    } catch (e) {
        alert("Could not swap meal.");
    } finally {
        setIsSwapping(null);
    }
  };

  const currentDay = mealPlan[selectedDayIndex];

  return (
    <div className="h-full flex flex-col pb-32 animate-fade-in relative px-1">
        <div className="flex justify-between items-center mb-4 pt-2">
             <h1 className="text-2xl font-bold text-gray-900">Your Plan</h1>
             <div className="flex gap-2">
                 {mealPlan.length > 0 && (
                     <button onClick={() => onUpdatePlan([])} className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200" title="Reset Plan">
                        <RefreshCw size={20} />
                     </button>
                 )}
                 {mealPlan.length > 0 && (
                     <button onClick={() => setShowGroceryList(true)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100">
                        <ShoppingCart size={20} />
                     </button>
                 )}
             </div>
        </div>

        {mealPlan.length === 0 ? (
            <div className="flex flex-col flex-1 p-2">
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center flex-1 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6"><Zap size={40} fill="currentColor" /></div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Meal Planner</h3>
                    <p className="text-gray-500 mb-8 max-w-xs mx-auto">Build a tailored {userProfile.dietaryPreference !== 'None' ? userProfile.dietaryPreference : ''} plan that fits your {userProfile.goal} goal.</p>
                    
                    <div className="w-full max-w-sm space-y-4 mb-8">
                        {/* Duration Selector */}
                        <div className="bg-gray-50 p-1.5 rounded-2xl flex relative">
                             {[3, 7].map(days => (
                                 <button 
                                    key={days} 
                                    onClick={() => setPlanDuration(days as any)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${planDuration === days ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400'}`}
                                 >
                                    <ListOrdered size={16} /> {days} Days
                                 </button>
                             ))}
                        </div>

                        {/* Budget Selector */}
                        <div className="bg-gray-50 p-1.5 rounded-2xl flex relative">
                             {['Economy', 'Standard', 'Premium'].map((b) => (
                                 <button 
                                    key={b} 
                                    onClick={() => setBudgetLevel(b as any)}
                                    className={`flex-1 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${budgetLevel === b ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400'}`}
                                 >
                                    <DollarSign size={12} /> {b}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <button onClick={handleGenerate} disabled={isGenerating} className="w-full max-w-sm bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                        {isGenerating ? <Loader2 className="animate-spin" /> : <RefreshCw size={20} />}
                        {isGenerating ? 'Designing Plan...' : 'Generate Plan'}
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div className="flex overflow-x-auto no-scrollbar gap-3 mb-6 px-1">
                    {mealPlan.map((day, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`flex-shrink-0 px-5 py-4 rounded-2xl transition-all text-center min-w-[70px] ${
                                selectedDayIndex === idx 
                                ? 'bg-black text-white shadow-lg' 
                                : 'bg-white text-gray-400 border border-gray-100'
                            }`}
                        >
                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Day</div>
                            <div className="text-xl font-bold">{idx + 1}</div>
                        </button>
                    ))}
                </div>

                <div className="flex p-1 bg-gray-100 rounded-2xl mb-6 mx-1">
                    <button onClick={() => setActiveTab('meals')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'meals' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Meals</button>
                    <button onClick={() => setActiveTab('workouts')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'workouts' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-400'}`}>Workouts</button>
                </div>

                <div className="space-y-4 px-1 pb-4">
                    {activeTab === 'meals' ? (
                        currentDay?.meals.map((meal) => (
                            <div key={meal.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                                <div className="pl-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{meal.type}</span>
                                        <button onClick={() => handleSwap(selectedDayIndex, meal.id, meal.recipe)} className="text-emerald-600 p-1 hover:bg-emerald-50 rounded-lg">
                                            {isSwapping === meal.id ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                                        </button>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{meal.recipe.name}</h3>
                                    <div className="flex gap-4 text-xs font-medium text-gray-500 mb-4">
                                        <span className="flex items-center gap-1"><Flame size={12} className="text-orange-500" /> {meal.recipe.calories} kcal</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {meal.recipe.prepTime}</span>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setSelectedRecipe(meal.recipe)} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold">Details</button>
                                        <button onClick={() => onLogMeal(meal)} disabled={meal.isLogged} className={`flex-1 py-2 rounded-xl text-xs font-bold ${meal.isLogged ? 'bg-emerald-100 text-emerald-700' : 'bg-black text-white shadow-lg'}`}>
                                            {meal.isLogged ? 'Logged' : 'Eat This'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                         currentDay?.workouts.map((workout) => (
                            <div key={workout.id} className="bg-gray-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10"><Dumbbell size={80} /></div>
                                <div className="relative z-10">
                                    <div className="flex gap-2 mb-2">
                                        <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">{workout.intensity}</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{workout.name}</h3>
                                    <p className="text-gray-400 text-sm mb-4">{workout.duration} • {workout.caloriesEstimate} kcal</p>
                                    <button onClick={() => onLogWorkout(workout)} disabled={workout.isCompleted} className={`w-full py-3 rounded-xl font-bold text-sm ${workout.isCompleted ? 'bg-white/10 text-gray-400' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                                        {workout.isCompleted ? 'Completed' : 'Mark Complete'}
                                    </button>
                                </div>
                            </div>
                         ))
                    )}
                </div>
            </>
        )}

        {/* Re-use existing modals code structure but styling update is implicit due to Tailwind classes being standard */}
        {selectedRecipe && (
             <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
                 <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 max-h-[85vh] overflow-y-auto">
                     <div className="flex justify-between items-start mb-6">
                         <h2 className="text-2xl font-bold text-gray-900">{selectedRecipe.name}</h2>
                         <button onClick={() => setSelectedRecipe(null)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
                     </div>
                     <div className="space-y-6">
                         <div className="flex gap-2">
                             <div className="flex-1 bg-blue-50 p-4 rounded-2xl text-center"><div className="font-bold text-blue-700">{selectedRecipe.protein}g</div><div className="text-[10px] uppercase font-bold text-blue-400">Protein</div></div>
                             <div className="flex-1 bg-emerald-50 p-4 rounded-2xl text-center"><div className="font-bold text-emerald-700">{selectedRecipe.carbs}g</div><div className="text-[10px] uppercase font-bold text-emerald-400">Carbs</div></div>
                             <div className="flex-1 bg-amber-50 p-4 rounded-2xl text-center"><div className="font-bold text-amber-700">{selectedRecipe.fat}g</div><div className="text-[10px] uppercase font-bold text-amber-400">Fat</div></div>
                         </div>
                         <div>
                             <h3 className="font-bold text-gray-900 mb-3">Ingredients</h3>
                             <ul className="space-y-2 text-sm text-gray-600">
                                 {selectedRecipe.ingredients.map((ing, i) => <li key={i} className="flex justify-between border-b border-gray-50 pb-2"><span>{ing.item}</span><span className="font-medium text-gray-900">{ing.amount}</span></li>)}
                             </ul>
                         </div>
                         <div>
                             <h3 className="font-bold text-gray-900 mb-3">Instructions</h3>
                             <ol className="space-y-4 text-sm text-gray-600">
                                 {selectedRecipe.instructions.map((step, i) => <li key={i} className="flex gap-3"><span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xs shrink-0">{i+1}</span>{step}</li>)}
                             </ol>
                         </div>
                     </div>
                 </div>
             </div>
        )}

        {showGroceryList && (
             <div className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                 <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 max-h-[80vh] overflow-y-auto">
                     <div className="flex justify-between items-center mb-6">
                         <h2 className="text-xl font-bold">Grocery List</h2>
                         <button onClick={() => setShowGroceryList(false)}><X size={24} /></button>
                     </div>
                     <div className="space-y-3">
                         {mealPlan.length > 0 && mealPlan.flatMap(d => d.meals).flatMap(m => m.recipe.ingredients).map((ing, i) => (
                             <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                 <input type="checkbox" className="w-5 h-5 rounded-md text-emerald-600 focus:ring-emerald-500" />
                                 <div className="text-sm font-medium">{ing.item} <span className="text-gray-400 font-normal">- {ing.amount}</span></div>
                             </label>
                         ))}
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default MealPlanner;
