
import React, { useState } from 'react';
import { UserProfile, NutritionTargets } from '../types';
import { ChevronRight, ArrowRight, Activity, Target, Utensils, AlertTriangle } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile, targets: NutritionTargets) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({});

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const calculateTargets = () => {
    if (!profile.weight || !profile.height || !profile.age || !profile.gender) return null;

    // Harris-Benedict BMR
    let bmr = 0;
    if (profile.gender === 'Male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Activity Multiplier
    let multiplier = 1.2;
    switch(profile.activityLevel) {
        case 'Lightly Active': multiplier = 1.375; break;
        case 'Moderately Active': multiplier = 1.55; break;
        case 'Very Active': multiplier = 1.725; break;
    }

    let tdee = Math.round(bmr * multiplier);

    // Goal Adjustment
    if (profile.goal === 'Weight Loss') tdee -= 500;
    if (profile.goal === 'Muscle Gain') tdee += 300;

    // Macro Split
    const protein = Math.round((tdee * 0.3) / 4);
    const carbs = Math.round((tdee * 0.35) / 4);
    const fat = Math.round((tdee * 0.35) / 9);
    const water = Math.round(profile.weight * 35);

    return {
        calories: tdee,
        protein,
        carbs,
        fat,
        water
    };
  };

  const finish = () => {
      const targets = calculateTargets();
      if (targets) {
          onComplete(profile, targets);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-xl w-full max-w-sm p-8 relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-2 bg-gray-100 w-full">
            <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
            ></div>
        </div>

        <div className="mt-6 mb-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                {step === 1 && '1️⃣'}
                {step === 2 && '2️⃣'}
                {step === 3 && '3️⃣'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
                {step === 1 && 'Tell us about you'}
                {step === 2 && 'Your Goals'}
                {step === 3 && 'Preferences'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
                {step === 1 && 'We need this to calculate your metabolism.'}
                {step === 2 && 'What do you want to achieve?'}
                {step === 3 && 'Any dietary restrictions?'}
            </p>
        </div>

        {step === 1 && (
            <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Age</label>
                         <input type="number" value={profile.age || ''} onChange={(e) => setProfile({...profile, age: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="25" autoFocus />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Gender</label>
                         <select value={profile.gender || ''} onChange={(e) => setProfile({...profile, gender: e.target.value as any})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                             <option value="">Select</option>
                             <option value="Male">Male</option>
                             <option value="Female">Female</option>
                             <option value="Other">Other</option>
                         </select>
                     </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Height (cm)</label>
                         <input type="number" value={profile.height || ''} onChange={(e) => setProfile({...profile, height: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="175" />
                     </div>
                     <div>
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Weight (kg)</label>
                         <input type="number" value={profile.weight || ''} onChange={(e) => setProfile({...profile, weight: parseInt(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="70" />
                     </div>
                </div>
                <button onClick={handleNext} disabled={!profile.age || !profile.gender || !profile.height || !profile.weight} className="w-full mt-6 bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2">
                    Next Step <ChevronRight size={20} />
                </button>
            </div>
        )}

        {step === 2 && (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Activity size={18} className="text-emerald-500" /> Activity Level</label>
                    <div className="grid grid-cols-1 gap-2">
                        {['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active'].map((level) => (
                            <button 
                                key={level}
                                onClick={() => setProfile({...profile, activityLevel: level as any})}
                                className={`p-4 rounded-xl text-left border transition-all ${profile.activityLevel === level ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500' : 'border-gray-200 hover:border-emerald-200'}`}
                            >
                                <div className="font-bold text-sm">{level}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Target size={18} className="text-emerald-500" /> Main Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Weight Loss', 'Maintenance', 'Muscle Gain'].map((goal) => (
                            <button 
                                key={goal}
                                onClick={() => setProfile({...profile, goal: goal as any})}
                                className={`p-3 rounded-xl text-center border transition-all text-xs font-bold ${profile.goal === goal ? 'bg-black text-white border-black' : 'border-gray-200 hover:border-emerald-200'}`}
                            >
                                {goal.replace('Weight ', '')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                     <button onClick={handleBack} className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Back</button>
                     <button onClick={handleNext} disabled={!profile.activityLevel || !profile.goal} className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                        Next <ChevronRight size={20} />
                     </button>
                </div>
            </div>
        )}

        {step === 3 && (
            <div className="space-y-6 animate-fade-in">
                 <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Utensils size={18} className="text-emerald-500" /> Dietary Preference</label>
                    <select 
                        value={profile.dietaryPreference || 'None'} 
                        onChange={(e) => setProfile({...profile, dietaryPreference: e.target.value as any})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="None">None</option>
                        <option value="Vegetarian">Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Keto">Keto</option>
                        <option value="Paleo">Paleo</option>
                    </select>
                </div>

                <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><AlertTriangle size={18} className="text-orange-500" /> Allergies (Optional)</label>
                    <input 
                        type="text" 
                        value={profile.allergies || ''} 
                        onChange={(e) => setProfile({...profile, allergies: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-emerald-500" 
                        placeholder="e.g. Peanuts, Gluten" 
                    />
                </div>

                <div className="flex gap-3 mt-8">
                     <button onClick={handleBack} className="px-6 py-4 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Back</button>
                     <button onClick={finish} className="flex-1 bg-black text-white font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-2">
                        Get Started <ArrowRight size={20} />
                     </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
