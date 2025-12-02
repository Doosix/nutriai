
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, UserPlus, CheckCircle2, X, Camera, ImagePlus, Paperclip, Zap, Brain, Activity, Utensils } from 'lucide-react';
import { ChatMessage, UserProfile, DailyStats, NutritionTargets, MoodEntry } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatProps {
  userProfile?: UserProfile;
  stats?: DailyStats;
  targets?: NutritionTargets;
  onLogMood: (mood: MoodEntry['mood']) => void;
}

const Chat: React.FC<ChatProps> = ({ userProfile, stats, targets, onLogMood }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! 👋 I'm your AI Diet Coach. I know your goals and what you've eaten today. \n\nTell me how you're feeling or ask for a meal idea! 🥗",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultBooked, setConsultBooked] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setSelectedImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  const handleSendMessage = async (text: string) => {
    if ((!text.trim() && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };

    const displayMsg = { ...userMsg, text: selectedImage ? `${text} 📷 [Image]` : text };

    setMessages(prev => [...prev, displayMsg]);
    setInputText('');
    const imageToSend = selectedImage ? selectedImage.split(',')[1] : null; 
    setSelectedImage(null); 
    setIsLoading(true);

    try {
        const history = messages.map(m => ({ role: m.role, text: m.text.replace(' 📷 [Image]', '') }));
        
        const responseText = await sendChatMessage(history, userMsg.text, imageToSend, userProfile, stats, targets);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText || "I'm having trouble thinking right now. 🧠",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        const errorMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: "Sorry, I can't connect to the server right now. Please try again later. 🔌",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleMoodClick = (mood: any, prompt: string) => {
      onLogMood(mood); // Log the mood for insights
      handleSendMessage(prompt); // Continue chat flow
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  const moodChips = [
    { label: "😤 Stressed", mood: "Stressed", icon: <Brain size={12} />, prompt: "I'm feeling super stressed. What foods help reduce stress?" },
    { label: "😴 Tired", mood: "Tired", icon: <Zap size={12} />, prompt: "I have low energy. Suggest a natural energy boosting snack." },
    { label: "🤕 Sore", mood: "Sore", icon: <Activity size={12} />, prompt: "I'm sore from a workout. What should I eat for recovery?" },
    { label: "🍔 Cravings", mood: "Cravings", icon: <Utensils size={12} />, prompt: "I have bad cravings. How do I manage them healthily?" },
  ];

  const actionChips = [
    { label: "📊 Analyze Day", prompt: "Analyze my intake today. Am I on track or do I need to fix something?" },
    { label: "🍽️ Dinner Idea", prompt: "Suggest a dinner recipe that fits my remaining calories perfectly." },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] relative">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles size={16} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">Diet Coach</h1>
                <p className="text-xs text-gray-500">AI Powered</p>
            </div>
        </div>
        <button 
            onClick={() => setShowConsultModal(true)}
            className="text-[10px] font-bold bg-white border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full shadow-sm hover:bg-emerald-50 transition-colors flex items-center gap-1"
        >
            <UserPlus size={12} /> Book Human Expert
        </button>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4 no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === 'model' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-600'
            }`}>
                {msg.role === 'model' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div
              className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-gray-900 text-white rounded-tr-none'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3 animate-fade-in">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Bot size={18} />
                 </div>
                 <div className="bg-white border border-gray-100 shadow-sm p-4 rounded-2xl rounded-tl-none">
                    <div className="flex space-x-1.5">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {selectedImage && (
          <div className="mb-2 relative inline-block">
              <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-gray-200" />
              <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-black text-white rounded-full p-1"><X size={12} /></button>
          </div>
      )}

      {/* Mood & Action Chips */}
      {!isLoading && (
        <div className="mb-2 space-y-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                {moodChips.map((chip, i) => (
                    <button 
                        key={i}
                        onClick={() => handleMoodClick(chip.mood, chip.prompt)}
                        className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-xl hover:bg-purple-100 transition-colors border border-purple-100"
                    >
                        {chip.icon}
                        {chip.label}
                    </button>
                ))}
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1">
                {actionChips.map((chip, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSendMessage(chip.prompt)}
                        className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
                    >
                        <Sparkles size={12} />
                        {chip.label}
                    </button>
                ))}
            </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-1 relative flex items-center gap-2">
        <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageSelect} 
        />
        <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors"
        >
            <ImagePlus size={20} />
        </button>
        
        <div className="relative flex-1">
            <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={selectedImage ? "Describe this image..." : "Ask coach..."}
            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-3xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block p-4 pr-12 shadow-sm outline-none transition-all"
            />
            <button
            type="submit"
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
            className="absolute inset-y-0 right-2 flex items-center pr-2 text-emerald-600 hover:text-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <div className="bg-emerald-600 text-white rounded-full p-2 hover:bg-emerald-700 transition-colors"><Send size={16} /></div>}
            </button>
        </div>
      </form>

      {/* Consultation Modal */}
      {showConsultModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
                <button onClick={() => setShowConsultModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                
                {!consultBooked ? (
                    <>
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <UserPlus size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">1-on-1 Consultation</h3>
                        <p className="text-gray-500 text-center text-sm mb-6">Book a 30-minute session with a certified nutritionist to discuss your custom diet plan.</p>
                        
                        <div className="space-y-3">
                            <button onClick={() => setConsultBooked(true)} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-emerald-700 transition-all">Book Now ($29.99)</button>
                            <button onClick={() => setShowConsultModal(false)} className="w-full text-gray-500 font-medium text-sm py-2">Maybe later</button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                            <CheckCircle2 size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-center text-gray-900 mb-2">Request Sent!</h3>
                        <p className="text-gray-500 text-center text-sm mb-6">A nutritionist will reach out to your email shortly to schedule your session.</p>
                        <button onClick={() => setShowConsultModal(false)} className="w-full bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all">Close</button>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
