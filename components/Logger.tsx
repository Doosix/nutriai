
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, Loader2, ImagePlus, Type, Utensils, Coffee, Moon, Sun, Search, ScanBarcode, Star, Clock, ChevronRight, Plus, X, Barcode, Minus, AlertTriangle, HeartPulse, Info, ArrowLeft, ArrowRight, Save, Edit3 } from 'lucide-react';
import { analyzeTextLog, analyzeImageLog, searchFoodDatabase, lookupBarcode } from '../services/geminiService';
import { FoodItem, MealType, FoodSearchResult, UserProfile } from '../types';

declare var Html5QrcodeScanner: any;

interface LoggerProps {
  onAddFood: (item: Omit<FoodItem, 'id' | 'timestamp'>) => void;
  onSuccess: () => void;
  recentFoods: FoodItem[];
  favorites: FoodItem[];
  onToggleFavorite: (item: FoodItem) => void;
  userProfile: UserProfile;
}

const Logger: React.FC<LoggerProps> = ({ onAddFood, onSuccess, recentFoods, favorites, onToggleFavorite, userProfile }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'scan' | 'camera'>('search');
  const [mealType, setMealType] = useState<MealType>('Breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Selection & Portion Control
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Manual Entry State
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
      name: '',
      brand: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      servingSize: '1 serving'
  });

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time-based Meal Type
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setMealType('Breakfast');
    else if (hour >= 11 && hour < 16) setMealType('Lunch');
    else if (hour >= 16 && hour < 22) setMealType('Dinner');
    else setMealType('Snack');
  }, []);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(async () => {
        if (searchQuery.trim().length > 2 && activeTab === 'search') {
            setIsSearching(true);
            const results = await searchFoodDatabase(searchQuery);
            setSearchResults(results);
            setIsSearching(false);
        }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Barcode Scanner Lifecycle
  useEffect(() => {
    if (activeTab === 'scan' && !selectedFood && !isManualEntryOpen) {
        setTimeout(() => {
             if (document.getElementById('reader')) {
                scannerRef.current = new Html5QrcodeScanner(
                    "reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false
                );
                scannerRef.current.render(onScanSuccess, (err: any) => console.log(err));
             }
        }, 100);
    } else {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
            scannerRef.current = null;
        }
    }
    return () => {
        if (scannerRef.current) scannerRef.current.clear().catch(console.error);
    };
  }, [activeTab, selectedFood, isManualEntryOpen]);

  const onScanSuccess = async (decodedText: string) => {
      if (scannerRef.current) scannerRef.current.pause();
      setIsAnalyzing(true);
      const result = await lookupBarcode(decodedText, userProfile);
      setIsAnalyzing(false);
      if (result) {
          setSelectedFood(result);
      } else {
          // Open Manual Entry instead of alerting
          setManualEntryData(prev => ({ ...prev, name: '' })); // Reset or keep blank
          setIsManualEntryOpen(true);
      }
  };

  const handleManualEntrySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const food: FoodSearchResult = {
          name: manualEntryData.name || "Unknown Food",
          brand: manualEntryData.brand,
          calories: parseInt(manualEntryData.calories) || 0,
          protein: parseInt(manualEntryData.protein) || 0,
          carbs: parseInt(manualEntryData.carbs) || 0,
          fat: parseInt(manualEntryData.fat) || 0,
          servingSize: manualEntryData.servingSize,
          servingUnit: 'serving',
          healthScore: 50, // Default for manual
          healthReason: "Manually entered",
          warnings: [],
          allergens: []
      };
      setIsManualEntryOpen(false);
      setSelectedFood(food);
  };

  const cancelManualEntry = () => {
      setIsManualEntryOpen(false);
      if (activeTab === 'scan' && scannerRef.current) {
          scannerRef.current.resume();
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    try {
      const base64Data = selectedImage.split(',')[1];
      const data = await analyzeImageLog(base64Data, userProfile);
      setSelectedFood(data);
    } catch (err) {
      alert("Could not identify food.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmLog = () => {
      if (!selectedFood) return;
      onAddFood({
          ...selectedFood,
          calories: Math.round(selectedFood.calories * quantity),
          protein: Math.round(selectedFood.protein * quantity),
          carbs: Math.round(selectedFood.carbs * quantity),
          fat: Math.round(selectedFood.fat * quantity),
          quantity,
          mealType,
          imageUrl: selectedImage || undefined
      });
      setSelectedFood(null);
      setQuantity(1);
      setSearchQuery('');
      onSuccess();
  };

  const getHealthColor = (score?: number) => {
    if (score === undefined) return 'bg-gray-300';
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  return (
    <div className="h-full flex flex-col pb-32 animate-fade-in relative">
      <div className="px-1 pt-2 pb-4">
          <div className="flex items-center gap-3 mb-6">
              <button onClick={onSuccess} className="bg-gray-100 p-2 rounded-full text-gray-600"><ArrowLeft size={20} /></button>
              <h1 className="text-2xl font-bold text-gray-900">Add Food</h1>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6">
              {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type: any) => (
                  <button 
                    key={type} 
                    onClick={() => setMealType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${mealType === type ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                      {type}
                  </button>
              ))}
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-2 flex items-center mb-6">
               <div className="pl-4 text-gray-400"><Search size={20} /></div>
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setActiveTab('search'); }}
                  placeholder="Search for food..."
                  className="w-full bg-transparent p-4 outline-none text-lg font-medium text-gray-900 placeholder-gray-400"
               />
               {isSearching && <Loader2 className="animate-spin text-emerald-500 mr-4" />}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => setActiveTab('scan')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${activeTab === 'scan' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-white text-gray-500'}`}>
                  <ScanBarcode size={24} />
                  <span className="text-xs font-bold">Scan Barcode</span>
              </button>
              <button onClick={() => setActiveTab('camera')} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${activeTab === 'camera' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 bg-white text-gray-500'}`}>
                  <Camera size={24} />
                  <span className="text-xs font-bold">AI Plate Scan</span>
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 no-scrollbar rounded-t-[2.5rem] bg-gray-50 -mx-6 px-6 pt-6 border-t border-gray-100">
          {activeTab === 'search' && (
              <div className="space-y-4">
                  {searchResults.length > 0 ? searchResults.map((item, idx) => (
                      <div key={idx} onClick={() => setSelectedFood(item)} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer active:scale-95 transition-transform">
                          <div>
                              <div className="font-bold text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-500">{item.brand} • {item.servingSize}</div>
                          </div>
                          <div className="flex items-center gap-3">
                              {item.healthScore !== undefined && (
                                  <div className={`w-2.5 h-2.5 rounded-full ${getHealthColor(item.healthScore)}`} title={`Health Score: ${item.healthScore}`} />
                              )}
                              <div className="font-bold text-emerald-600">{item.calories} kcal</div>
                          </div>
                      </div>
                  )) : (
                      <>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-400 text-sm">Recent & Favorites</h3>
                        </div>
                        {favorites.map((item, idx) => (
                             <div key={idx} onClick={() => setSelectedFood(item as any)} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center cursor-pointer">
                                 <div className="flex items-center gap-3">
                                     <Star size={16} className="fill-amber-400 text-amber-400" />
                                     <div className="font-bold text-gray-900">{item.name}</div>
                                 </div>
                                 <Plus size={18} className="text-gray-300" />
                             </div>
                        ))}
                      </>
                  )}
              </div>
          )}

          {activeTab === 'scan' && (
              <div className="rounded-3xl overflow-hidden shadow-lg bg-black">
                  <div id="reader" className="w-full"></div>
                  <div className="p-4 bg-gray-900 text-white text-center text-sm">
                      <p>Point at a barcode.</p>
                      <button onClick={() => setIsManualEntryOpen(true)} className="mt-2 text-emerald-400 font-bold hover:underline">
                          Product not found? Enter manually
                      </button>
                  </div>
              </div>
          )}

          {activeTab === 'camera' && (
              <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center h-64">
                   {selectedImage ? (
                       <div className="relative w-full h-full">
                           <img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-2xl" />
                           <button onClick={analyzeImage} disabled={isAnalyzing} className="absolute bottom-4 left-4 right-4 bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg">
                                {isAnalyzing ? 'Analyzing Plate...' : 'Identify Meal'}
                           </button>
                       </div>
                   ) : (
                       <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                           <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4"><Camera size={32} /></div>
                           <span className="font-bold text-gray-900">Take a Photo</span>
                           <span className="text-sm text-gray-500 mt-1">Multi-food & Restaurant Support</span>
                           <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                       </label>
                   )}
              </div>
          )}
      </div>

      {/* Manual Entry Modal */}
      {isManualEntryOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">Add Item Manually</h2>
                      <button onClick={cancelManualEntry} className="bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleManualEntrySubmit} className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Food Name</label>
                          <input 
                            required
                            type="text" 
                            value={manualEntryData.name} 
                            onChange={e => setManualEntryData({...manualEntryData, name: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. Granola Bar"
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Calories</label>
                          <input 
                            required
                            type="number" 
                            value={manualEntryData.calories} 
                            onChange={e => setManualEntryData({...manualEntryData, calories: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="0"
                          />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Protein</label>
                              <input type="number" value={manualEntryData.protein} onChange={e => setManualEntryData({...manualEntryData, protein: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Carbs</label>
                              <input type="number" value={manualEntryData.carbs} onChange={e => setManualEntryData({...manualEntryData, carbs: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                          </div>
                          <div>
                              <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Fat</label>
                              <input type="number" value={manualEntryData.fat} onChange={e => setManualEntryData({...manualEntryData, fat: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-3 font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="0" />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Serving Size</label>
                          <input 
                            type="text" 
                            value={manualEntryData.servingSize} 
                            onChange={e => setManualEntryData({...manualEntryData, servingSize: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                            placeholder="e.g. 1 package"
                          />
                      </div>
                      
                      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2">
                          <Edit3 size={18} /> Add Details
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {selectedFood && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
              <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 leading-tight">{selectedFood.name}</h2>
                      <button onClick={() => setSelectedFood(null)} className="bg-gray-100 p-2 rounded-full text-gray-500 shrink-0"><X size={20} /></button>
                  </div>
                  
                  <div className="flex items-center justify-between bg-emerald-50 rounded-2xl p-6 mb-6">
                      <button onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))} className="w-10 h-10 bg-white rounded-full text-emerald-600 shadow-sm flex items-center justify-center"><Minus size={20} /></button>
                      <div className="text-center">
                          <div className="text-4xl font-bold text-gray-900">{Math.round(selectedFood.calories * quantity)}</div>
                          <div className="text-emerald-600 font-medium text-sm mt-1">{quantity} x {selectedFood.servingSize}</div>
                      </div>
                      <button onClick={() => setQuantity(quantity + 0.5)} className="w-10 h-10 bg-white rounded-full text-emerald-600 shadow-sm flex items-center justify-center"><Plus size={20} /></button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-8">
                       <div className="bg-gray-50 p-3 rounded-2xl text-center"><div className="font-bold text-gray-900">{Math.round(selectedFood.protein * quantity)}g</div><div className="text-[10px] text-gray-500 uppercase font-bold">Protein</div></div>
                       <div className="bg-gray-50 p-3 rounded-2xl text-center"><div className="font-bold text-gray-900">{Math.round(selectedFood.carbs * quantity)}g</div><div className="text-[10px] text-gray-500 uppercase font-bold">Carbs</div></div>
                       <div className="bg-gray-50 p-3 rounded-2xl text-center"><div className="font-bold text-gray-900">{Math.round(selectedFood.fat * quantity)}g</div><div className="text-[10px] text-gray-500 uppercase font-bold">Fat</div></div>
                  </div>

                  <button onClick={handleConfirmLog} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2">
                      Log Meal <ArrowRight size={20} />
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Logger;
