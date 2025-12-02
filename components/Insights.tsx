
import React, { useEffect, useState } from 'react';
import { FoodItem, MoodEntry, UserProfile, HabitInsight } from '../types';
import { analyzeHabits } from '../services/geminiService';
import { Brain, Flame, Clock, Moon, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface InsightsProps {
  foodLog: FoodItem[];
  waterIntake: number;
  moodLog: MoodEntry[];
  userProfile: UserProfile;
}

const Insights: React.FC<InsightsProps> = ({ foodLog, waterIntake, moodLog, userProfile }) => {
  const [insight, setInsight] = useState<HabitInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      const result = await analyzeHabits(foodLog, waterIntake, moodLog, userProfile);
      setInsight(result);
      setLoading(false);
    };
    fetchInsights();
  }, [foodLog, waterIntake, moodLog]);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-full pb-32">
            <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium animate-pulse">Analyzing behavior patterns...</p>
        </div>
    );
  }

  if (!insight) return null;

  return (
    <div className="h-full flex flex-col pb-32 animate-fade-in px-1">
        <header className="mb-6 pt-2">
            <h1 className="text-2xl font-bold text-gray-900">Habit Insights</h1>
            <p className="text-sm text-gray-500">AI-detected patterns & trends</p>
        </header>

        <div className="space-y-4 overflow-y-auto no-scrollbar pb-4">
            {/* Top Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col items-center justify-center">
                     <div className="relative w-20 h-20 mb-2">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="36" stroke="#f3f4f6" strokeWidth="8" fill="transparent" />
                            <circle cx="50%" cy="50%" r="36" stroke={insight.score > 70 ? '#10b981' : '#f59e0b'} strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 - (insight.score / 100) * 2 * Math.PI * 36} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-900">{insight.score}</div>
                     </div>
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Habit Score</span>
                </div>

                <div className="bg-orange-50 rounded-[2rem] p-6 shadow-sm border border-orange-100 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-3">
                        <Flame size={24} fill="currentColor" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">{insight.streak} Day</div>
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Streak</span>
                </div>
            </div>

            {/* Main Insight Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-indigo-200">
                <div className="flex items-start gap-4">
                    <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                        <Brain size={24} className="text-indigo-200" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold mb-1 opacity-90">{insight.trendTitle}</h3>
                        <p className="text-sm opacity-75 leading-relaxed">{insight.trendDescription}</p>
                    </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-yellow-300" />
                        <span className="font-bold text-sm text-indigo-100">AI Recommendation</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{insight.advice}</p>
                </div>
            </div>

            {/* Eating Window */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={18} className="text-emerald-500" /> Eating Window</h3>
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg">
                        {insight.eatingWindowStart && insight.eatingWindowEnd ? 
                            `${insight.eatingWindowStart} - ${insight.eatingWindowEnd}` : 
                            'Not enough data'}
                    </span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full w-full overflow-hidden">
                     {/* Simplified visual representation of day 06:00 to 24:00 */}
                     <div className="absolute left-[25%] right-[25%] top-0 bottom-0 bg-emerald-200 rounded-full"></div>
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-gray-400 font-bold uppercase">
                    <span>6 AM</span>
                    <span>12 PM</span>
                    <span>6 PM</span>
                    <span>12 AM</span>
                </div>
            </div>

            {/* Late Night Stats */}
            {insight.lateNightSnacks > 0 && (
                <div className="bg-slate-900 text-slate-200 rounded-[2rem] p-6 shadow-lg flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white flex items-center gap-2 mb-1"><Moon size={18} className="text-blue-400" /> Late Night Snacking</h3>
                        <p className="text-xs opacity-60">Detected after 9:00 PM</p>
                    </div>
                    <div className="text-2xl font-bold text-white">{insight.lateNightSnacks} <span className="text-sm font-normal text-slate-500">items</span></div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Insights;
