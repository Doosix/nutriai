
import React, { useState, useRef, useEffect } from 'react';
import { FoodItem, DailyStats, NutritionTargets, UserProfile, ExerciseItem } from '../types';
import { analyzeExercise } from '../services/geminiService';
import { 
    Trash2, Settings, X, Save, User, Target, Plus, Minus, 
    Droplets, Calculator, Flame, Activity, Utensils, Zap, Loader2, Trophy, Footprints, Watch, ChevronRight,
    ArrowRight, Bell, Moon, Sun, Coffee, AlertTriangle, Cloud, CloudOff
} from 'lucide-react';

interface DashboardProps {
  foodLog: FoodItem[];
  exerciseLog: ExerciseItem[];
  stats: DailyStats;
  targets: NutritionTargets;
  userProfile: UserProfile;
  steps: number;
  isCloudConnected?: boolean;
  onUpdateTargets: (targets: NutritionTargets) => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onRemoveItem: (id: string) => void;
  onRemoveExercise: (id: string) => void;
  onAddWater: (amount: number) => void;
  onNavigateToLog: () => void;
  onAddExercise: (item: Omit<ExerciseItem, 'id' | 'timestamp'>) => void;
  onConnectDevice: () => void;
}

interface SwipeableActivityItemProps {
  item: any;
  onRemove: () => void;
}

const SwipeableActivityItem: React.FC<SwipeableActivityItemProps> = ({ item, onRemove }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const startY = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diffX = currentX - startX.current;
        const diffY = e.touches[0].clientY - startY.current;

        if (Math.abs(diffY) > Math.abs(diffX)) return;
        
        if (diffX < 0) {
            setOffsetX(diffX);
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        if (offsetX < -100) {
            onRemove();
        }
        setOffsetX(0);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl mb-3 select-none group">
            <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-2xl">
                <Trash2 size={20} className="text-white" />
            </div>

            <div 
                className="relative bg-white p-4 rounded-2xl border border-gray-100/50 shadow-sm flex justify-between items-center transition-transform bg-opacity-80 backdrop-blur-sm"
                style={{ 
                    transform: `translateX(${offsetX}px)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    touchAction: 'pan-y'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.type === 'food' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                        {item.type === 'food' ? (item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover rounded-full" alt={item.name} /> : <Utensils size={18} />) : <Activity size={18} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-800 capitalize text-sm">{item.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            {item.type === 'food' ? (
                                <>
                                    <span className="font-medium text-emerald-600">+{item.calories} kcal</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{item.mealType}</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-orange-600">-{item.caloriesBurned} kcal</span>
                                    <span className="text-gray-300">•</span>
                                    <span>{item.durationMinutes} min</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  foodLog, 
  exerciseLog,
  stats, 
  targets, 
  userProfile, 
  steps,
  isCloudConnected = false,
  onUpdateTargets, 
  onUpdateProfile, 
  onRemoveItem,
  onRemoveExercise,
  onAddWater,
  onNavigateToLog, 
  onAddExercise,
  onConnectDevice
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'targets' | 'profile' | 'notifications'>('targets');
  const [editTargets, setEditTargets] = useState<NutritionTargets>(targets);
  const [editProfile, setEditProfile] = useState<UserProfile>(userProfile);
  const [exerciseInput, setExerciseInput] = useState('');
  const [isAnalyzingExercise, setIsAnalyzingExercise] = useState(false);
  const [dismissAlert, setDismissAlert] = useState(false);

  // Auto-open settings if profile is incomplete
  useEffect(() => {
    if (!userProfile.age || !userProfile.goal) {
        setIsSettingsOpen(true);
        setSettingsTab('profile');
    }
  }, [userProfile]);

  useEffect(() => {
      setEditTargets(targets);
      setEditProfile(userProfile);
  }, [targets, userProfile, isSettingsOpen]);

  const handleExerciseSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!exerciseInput.trim()) return;
      setIsAnalyzingExercise(true);
      try {
          const result = await analyzeExercise(exerciseInput, userProfile);
          onAddExercise(result);
          setExerciseInput('');
          setIsExerciseModalOpen(false);
      } catch (err) {
          alert('Could not understand exercise.');
      } finally {
          setIsAnalyzingExercise(false);
      }
  };

  const calculateAutoTargets = () => {
    if (!editProfile.weight || !editProfile.height || !editProfile.age || !editProfile.gender) {
        alert("Please fill in Age, Gender, Height, and Weight first.");
        return;
    }

    // Harris-Benedict BMR
    let bmr = 0;
    if (editProfile.gender === 'Male') {
        bmr = 10 * editProfile.weight + 6.25 * editProfile.height - 5 * editProfile.age + 5;
    } else {
        bmr = 10 * editProfile.weight + 6.25 * editProfile.height - 5 * editProfile.age - 161;
    }

    // Activity Multiplier
    let multiplier = 1.2;
    switch(editProfile.activityLevel) {
        case 'Lightly Active': multiplier = 1.375; break;
        case 'Moderately Active': multiplier = 1.55; break;
        case 'Very Active': multiplier = 1.725; break;
    }

    let tdee = Math.round(bmr * multiplier);

    // Goal Adjustment
    if (editProfile.goal === 'Weight Loss') tdee -= 500;
    if (editProfile.goal === 'Muscle Gain') tdee += 300;

    // Macro Split (Moderate: 30% P, 35% C, 35% F)
    const protein = Math.round((tdee * 0.3) / 4);
    const carbs = Math.round((tdee * 0.35) / 4);
    const fat = Math.round((tdee * 0.35) / 9);
    const water = Math.round(editProfile.weight * 35); // 35ml per kg

    setEditTargets({
        calories: tdee,
        protein,
        carbs,
        fat,
        water
    });
  };

  const saveSettings = () => {
      onUpdateProfile(editProfile);
      onUpdateTargets(editTargets);
      setIsSettingsOpen(false);
  };

  const combinedLog = [
      ...foodLog.map(f => ({ ...f, type: 'food' as const })),
      ...exerciseLog.map(e => ({ ...e, type: 'exercise' as const, mealType: 'Exercise' }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  const netCalories = stats.calories - stats.caloriesBurned;
  const remainingCalories = Math.max(0, stats.targetCalories - netCalories);
  const progressPercent = Math.min(100, (netCalories / stats.targetCalories) * 100);

  // Smart Diet Alert Logic
  const getSmartAlert = () => {
      if (dismissAlert) return null;
      const hour = new Date().getHours();
      
      if (stats.calories > stats.targetCalories * 1.05) {
          return { type: 'warning', msg: "You've exceeded your calorie goal. Try a light activity or drink water!", color: 'bg-red-50 text-red-700 border-red-100' };
      }
      if (hour >= 18 && stats.protein < stats.targetProtein * 0.6) {
          return { type: 'tip', msg: "Protein is low today. Consider a high-protein dinner like chicken or tofu.", color: 'bg-blue-50 text-blue-700 border-blue-100' };
      }
      if (hour >= 20 && stats.waterIntake < stats.waterTarget * 0.5) {
          return { type: 'tip', msg: "Don't forget to hydrate! You're behind on your water goal.", color: 'bg-blue-50 text-blue-700 border-blue-100' };
      }
      return null;
  };
  
  const smartAlert = getSmartAlert();

  const ProgressRing = ({ percentage, color }: { percentage: number, color: string }) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
        <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20" />
            <circle cx="50%" cy="50%" r={radius} stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
    );
  };

  const MacroCard = ({ label, value, target, color, bg }: any) => (
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center flex-1 min-w-[100px]">
          <div className="relative w-12 h-12 mb-2">
              <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                  <circle cx="24" cy="24" r="20" stroke={color} strokeWidth="4" fill="transparent" 
                    strokeDasharray={2 * Math.PI * 20} 
                    strokeDashoffset={2 * Math.PI * 20 - (Math.min(100, (value/target)*100) / 100) * 2 * Math.PI * 20} 
                    strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
                  {Math.round((value/target)*100)}%
              </div>
          </div>
          <div className="text-sm font-bold text-gray-900">{value}g</div>
          <div className="text-[10px] text-gray-500 uppercase font-semibold">{label}</div>
      </div>
  );

  return (
    <div className="space-y-6 pb-32 animate-fade-in relative px-1">
      {/* Header */}
      <header className="flex justify-between items-center py-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-900">Hello, {userProfile.age ? 'Friend' : 'Guest'} 👋</h1>
            <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
                {isCloudConnected ? <span className="flex items-center gap-1 text-emerald-600"><Cloud size={12} fill="currentColor" /> Synced</span> : <span className="flex items-center gap-1 text-gray-400"><CloudOff size={12} /> Offline Mode</span>}
            </p>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors">
            <Settings size={20} />
        </button>
      </header>

      {/* Smart Diet Alert */}
      {smartAlert && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 relative ${smartAlert.color} animate-fade-in`}>
              <div className="bg-white/50 p-1.5 rounded-full"><AlertTriangle size={16} /></div>
              <div className="flex-1">
                  <p className="text-sm font-bold">Smart Insight</p>
                  <p className="text-xs opacity-90 leading-relaxed">{smartAlert.msg}</p>
              </div>
              <button onClick={() => setDismissAlert(true)} className="text-current opacity-50 hover:opacity-100"><X size={16} /></button>
          </div>
      )}

      {/* Hero Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10 flex items-center justify-between">
              <div>
                  <div className="text-emerald-100 text-sm font-semibold mb-1 uppercase tracking-wider">Calories Left</div>
                  <div className="text-5xl font-bold tracking-tight mb-2">{Math.round(remainingCalories)}</div>
                  <div className="flex items-center gap-4 text-sm font-medium opacity-90">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-300"></div> Eaten {stats.calories}</div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Burned {stats.caloriesBurned}</div>
                  </div>
              </div>
              <div className="w-24 h-24 relative">
                  <ProgressRing percentage={progressPercent} color="#ffffff" />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Flame size={24} className="text-white/90" fill="currentColor" />
                  </div>
              </div>
          </div>
          
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-300" />
                  <span className="font-semibold text-emerald-50">Daily Score: {stats.dailyScore}</span>
              </div>
              <button onClick={() => setIsExerciseModalOpen(true)} className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1">
                  <Plus size={14} /> Log Exercise
              </button>
          </div>
      </div>

      {/* Macros */}
      <div className="flex gap-3">
          <MacroCard label="Protein" value={stats.protein} target={stats.targetProtein} color="#3b82f6" />
          <MacroCard label="Carbs" value={stats.carbs} target={stats.targetCarbs} color="#10b981" />
          <MacroCard label="Fat" value={stats.fat} target={stats.targetFat} color="#f59e0b" />
      </div>

      {/* Wellness Row */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50/50 rounded-[2rem] p-5 border border-blue-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Droplets size={64} className="text-blue-500" fill="currentColor" />
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-blue-100 rounded-full text-blue-600"><Droplets size={16} fill="currentColor" /></div>
                      <span className="text-xs font-bold text-blue-500 uppercase">Hydration</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{stats.waterIntake}<span className="text-sm text-gray-500 font-normal ml-1">/ {stats.waterTarget}ml</span></div>
                  <div className="flex gap-2 mt-4">
                      <button onClick={() => onAddWater(250)} className="flex-1 bg-blue-500 text-white h-9 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 hover:bg-blue-600 active:scale-95 transition-all"><Plus size={18} /></button>
                      <button onClick={() => onAddWater(-250)} className="w-9 bg-white text-blue-500 h-9 rounded-xl flex items-center justify-center shadow-sm hover:bg-blue-50 active:scale-95 transition-all"><Minus size={18} /></button>
                  </div>
              </div>
          </div>

          <div className="bg-purple-50/50 rounded-[2rem] p-5 border border-purple-100 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Footprints size={64} className="text-purple-500" fill="currentColor" />
              </div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                      <div className="p-2 bg-purple-100 rounded-full text-purple-600"><Footprints size={16} fill="currentColor" /></div>
                      <span className="text-xs font-bold text-purple-500 uppercase">Movement</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{steps.toLocaleString()}</div>
                  <button onClick={onConnectDevice} className="mt-4 w-full bg-white text-purple-600 text-xs font-bold py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-purple-50 transition-all">
                      <Watch size={14} /> Sync Device
                  </button>
              </div>
          </div>
      </div>

      {/* Activity Log */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <button className="text-emerald-600 text-xs font-bold hover:underline">View All</button>
        </div>
        <div className="space-y-3 min-h-[100px]">
            {combinedLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <Activity size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No activity recorded today.</p>
                </div>
            ) : (
                combinedLog.map((item: any) => (
                    <SwipeableActivityItem 
                        key={item.id} 
                        item={item} 
                        onRemove={() => item.type === 'food' ? onRemoveItem(item.id) : onRemoveExercise(item.id)} 
                    />
                ))
            )}
        </div>
      </div>

       {/* Enhanced Settings Modal */}
       {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-xl font-bold text-gray-900">Settings</h3>
                    <button onClick={() => setIsSettingsOpen(false)}><X size={24} className="text-gray-400" /></button>
                </div>

                <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-6 shrink-0">
                    <button 
                        onClick={() => setSettingsTab('targets')} 
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'targets' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        My Targets
                    </button>
                    <button 
                        onClick={() => setSettingsTab('profile')} 
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${settingsTab === 'profile' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Profile
                    </button>
                    <button 
                        onClick={() => setSettingsTab('notifications')} 
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center ${settingsTab === 'notifications' ? 'bg-white shadow-md text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Bell size={18} />
                    </button>
                </div>
                
                <div className="overflow-y-auto pr-2 -mr-2 space-y-4 flex-1">
                     {settingsTab === 'targets' && (
                         <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                             <div className="flex justify-between items-center mb-4">
                                 <h4 className="font-bold text-gray-900">Daily Targets</h4>
                                 <button onClick={calculateAutoTargets} className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100"><Calculator size={12} /> Auto-Calc</button>
                             </div>
                             <div className="space-y-4">
                                 <div>
                                     <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Calories</label>
                                     <input type="number" value={editTargets.calories} onChange={(e) => setEditTargets({...editTargets, calories: parseInt(e.target.value) || 0})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                 </div>
                                 <div className="grid grid-cols-3 gap-3">
                                     <div>
                                         <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Protein (g)</label>
                                         <input type="number" value={editTargets.protein} onChange={(e) => setEditTargets({...editTargets, protein: parseInt(e.target.value) || 0})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                     </div>
                                     <div>
                                         <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Carbs (g)</label>
                                         <input type="number" value={editTargets.carbs} onChange={(e) => setEditTargets({...editTargets, carbs: parseInt(e.target.value) || 0})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                     </div>
                                     <div>
                                         <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Fat (g)</label>
                                         <input type="number" value={editTargets.fat} onChange={(e) => setEditTargets({...editTargets, fat: parseInt(e.target.value) || 0})} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Water Goal (ml)</label>
                                     <input type="number" value={editTargets.water} onChange={(e) => setEditTargets({...editTargets, water: parseInt(e.target.value) || 0})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-blue-500 focus:ring-2 focus:ring-blue-500 outline-none" />
                                 </div>
                             </div>
                         </div>
                     )}

                     {settingsTab === 'profile' && (
                         <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Age</label>
                                    <input type="number" value={editProfile.age || ''} onChange={(e) => setEditProfile({...editProfile, age: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="25" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Gender</label>
                                    <select value={editProfile.gender || ''} onChange={(e) => setEditProfile({...editProfile, gender: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Height (cm)</label>
                                    <input type="number" value={editProfile.height || ''} onChange={(e) => setEditProfile({...editProfile, height: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="175" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Weight (kg)</label>
                                    <input type="number" value={editProfile.weight || ''} onChange={(e) => setEditProfile({...editProfile, weight: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="70" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Activity Level</label>
                                <select value={editProfile.activityLevel || ''} onChange={(e) => setEditProfile({...editProfile, activityLevel: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="">Select Activity</option>
                                    <option value="Sedentary">Sedentary (Office Job)</option>
                                    <option value="Lightly Active">Lightly Active (1-3 days/wk)</option>
                                    <option value="Moderately Active">Moderately Active (3-5 days/wk)</option>
                                    <option value="Very Active">Very Active (6-7 days/wk)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Main Goal</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Weight Loss', 'Maintenance', 'Muscle Gain'].map(g => (
                                        <button 
                                            key={g} 
                                            onClick={() => setEditProfile({...editProfile, goal: g as any})}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${editProfile.goal === g ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'}`}
                                        >
                                            {g.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Diet Preference</label>
                                <select value={editProfile.dietaryPreference || ''} onChange={(e) => setEditProfile({...editProfile, dietaryPreference: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                                    <option value="None">None (No restrictions)</option>
                                    <option value="Vegetarian">Vegetarian</option>
                                    <option value="Vegan">Vegan</option>
                                    <option value="Keto">Keto</option>
                                    <option value="Paleo">Paleo</option>
                                    <option value="Pescatarian">Pescatarian</option>
                                </select>
                            </div>

                            <button onClick={calculateAutoTargets} className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2">
                                <Calculator size={18} /> Recalculate My Targets
                            </button>
                         </div>
                     )}

                     {settingsTab === 'notifications' && (
                         <div className="space-y-4">
                             <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                 <div>
                                     <h4 className="font-bold text-gray-900">Push Notifications</h4>
                                     <p className="text-xs text-gray-500">Enable daily reminders</p>
                                 </div>
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={editProfile.notifications?.enabled ?? false} onChange={(e) => setEditProfile({...editProfile, notifications: { ...(editProfile.notifications || {} as any), enabled: e.target.checked } })} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                             </div>

                             {editProfile.notifications?.enabled && (
                                <div className="space-y-3 animate-fade-in">
                                    {[
                                        { label: 'Breakfast', key: 'breakfastTime', icon: <Coffee size={16} /> },
                                        { label: 'Lunch', key: 'lunchTime', icon: <Utensils size={16} /> },
                                        { label: 'Dinner', key: 'dinnerTime', icon: <Utensils size={16} /> },
                                        { label: 'Workout', key: 'workoutTime', icon: <Activity size={16} /> },
                                        { label: 'Sleep', key: 'sleepTime', icon: <Moon size={16} /> },
                                    ].map((item: any) => (
                                        <div key={item.key} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="text-gray-400">{item.icon}</div>
                                                <span className="font-bold text-sm text-gray-700">{item.label}</span>
                                            </div>
                                            <input 
                                                type="time" 
                                                value={(editProfile.notifications as any)?.[item.key] || ''} 
                                                onChange={(e) => setEditProfile({...editProfile, notifications: { ...editProfile.notifications!, [item.key]: e.target.value }})}
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </div>
                                    ))}
                                    
                                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="text-blue-400"><Droplets size={16} /></div>
                                            <span className="font-bold text-sm text-gray-700">Water Interval</span>
                                        </div>
                                        <select 
                                            value={editProfile.notifications?.waterInterval || 0}
                                            onChange={(e) => setEditProfile({...editProfile, notifications: { ...editProfile.notifications!, waterInterval: parseInt(e.target.value) }})}
                                            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value={0}>Off</option>
                                            <option value={60}>Every 1h</option>
                                            <option value={90}>Every 1.5h</option>
                                            <option value={120}>Every 2h</option>
                                            <option value={180}>Every 3h</option>
                                        </select>
                                    </div>
                                </div>
                             )}
                         </div>
                     )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={saveSettings} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
       )}

       {/* Exercise Modal */}
       {isExerciseModalOpen && (
         <div className="fixed inset-0 bg-black/40 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-2xl font-bold text-gray-900">Log Activity</h3>
                     <button onClick={() => setIsExerciseModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleExerciseSubmit}>
                     <textarea 
                         value={exerciseInput}
                         onChange={(e) => setExerciseInput(e.target.value)}
                         placeholder="e.g. Ran 5km in 30 mins..."
                         className="w-full bg-gray-50 border-0 rounded-2xl p-4 h-32 resize-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400 text-lg mb-6"
                         autoFocus
                     />
                     <button 
                         type="submit" 
                         disabled={isAnalyzingExercise || !exerciseInput.trim()}
                         className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                     >
                         {isAnalyzingExercise ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" className="text-yellow-400" />} 
                         {isAnalyzingExercise ? 'Calculating...' : 'Log Workout'}
                     </button>
                  </form>
              </div>
         </div>
       )}
    </div>
  );
};

export default Dashboard;
