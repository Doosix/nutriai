
import { GoogleGenAI, Type } from "@google/genai";
import { NutritionData, UserProfile, FoodSearchResult, DayPlan, Recipe, MealType, DailyStats, NutritionTargets, FoodItem, MoodEntry, HabitInsight } from "../types";

// Polyfill for types if @types/node isn't picked up immediately by tsc
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Schema for detailed food analysis
const foodLogSchema = {
  type: Type.OBJECT,
  properties: {
    foodName: { type: Type.STRING, description: "Descriptive name of the food or full meal (e.g. 'Steak with Fries and Salad')." },
    calories: { type: Type.NUMBER, description: "Estimated total calories." },
    protein: { type: Type.NUMBER, description: "Estimated total protein in grams." },
    carbs: { type: Type.NUMBER, description: "Estimated total carbohydrates in grams." },
    fat: { type: Type.NUMBER, description: "Estimated total fat in grams." },
    sugar: { type: Type.NUMBER, description: "Estimated total sugar in grams." },
    fiber: { type: Type.NUMBER, description: "Estimated total fiber in grams." },
    sodium: { type: Type.NUMBER, description: "Estimated total sodium in mg." },
    servingSize: { type: Type.STRING, description: "e.g., '1 full plate', '1 bowl', '2 slices'" },
    servingUnit: { type: Type.STRING, description: "The unit of measurement." },
    healthScore: { type: Type.NUMBER, description: "A score from 0 (unhealthy) to 100 (very healthy)." },
    healthReason: { type: Type.STRING, description: "Short explanation for the score." },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g. 'High Sugar', 'High Sodium', 'Processed', 'High Fat'" },
    allergens: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of potential allergens detected." },
  },
  required: ["foodName", "calories", "protein", "carbs", "fat"],
};

export const searchFoodDatabase = async (query: string): Promise<FoodSearchResult[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Search for food items matching "${query}". Return a list of 5 distinct items with nutrition facts and a health score (0-100). JSON only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            brand: { type: Type.STRING },
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fat: { type: Type.NUMBER },
                            servingSize: { type: Type.STRING },
                            servingUnit: { type: Type.STRING },
                            healthScore: { type: Type.NUMBER }
                        },
                        required: ["name", "calories", "protein", "carbs", "fat", "servingSize", "servingUnit"]
                    }
                }
            }
        });

        const jsonStr = response.text;
        if (!jsonStr) return [];
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}

export const lookupBarcode = async (barcode: string, userProfile?: UserProfile): Promise<FoodSearchResult | null> => {
    try {
        // Use Google Search grounding to find the product name from the barcode
        const searchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Identify the food product for barcode "${barcode}". Return the product name and brand.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const productName = searchResponse.text;
        if (!productName) return null;
        
        // Now get detailed nutrition
        return analyzeTextLog(productName, userProfile);

    } catch (error) {
        console.error("Barcode lookup failed:", error);
        return null;
    }
}

export const analyzeTextLog = async (text: string, userProfile?: UserProfile): Promise<FoodSearchResult> => {
  try {
    let prompt = `Analyze this food: "${text}". Estimate detailed nutrition per serving including sugar, fiber, and sodium. Rate its healthiness (0-100) and provide a reason.`;
    
    // Check if it's a URL
    if (text.startsWith('http')) {
        prompt = `Analyze the recipe or food at this URL: "${text}". Extract nutrition facts.`;
    }

    if (userProfile?.allergies) {
        prompt += ` CHECK FOR ALLERGENS matching: "${userProfile.allergies}". If found, add to 'allergens' array and 'warnings'.`;
    }
    
    prompt += ` Flag 'High Sugar' (>15g), 'High Sodium' (>500mg), or 'High Fat' (>20g) in warnings.`;

    const config: any = {
        model: 'gemini-2.5-flash',
        contents: prompt,
    };
    
    // Use search if URL
    if (text.startsWith('http')) {
        config.config = { tools: [{ googleSearch: {} }] };
    } else {
        config.config = { responseMimeType: "application/json", responseSchema: foodLogSchema };
    }

    const response = await ai.models.generateContent(config);
    let jsonStr = response.text;

    if (!jsonStr) throw new Error("No response from AI");
    
    // Attempt to parse JSON. If using Search, response might be text, so we need to extract JSON block or parse manually (simulated here by trusting Schema for text input)
    // For URL search, we might get text. For now, assuming schema enforcement works or we parse a block.
    if (text.startsWith('http')) {
       // Simple regex extraction for demo robustness if Schema isn't forced with Tools
       const match = jsonStr.match(/\{[\s\S]*\}/);
       if (match) jsonStr = match[0];
    }
    
    const data = JSON.parse(jsonStr);
    return {
      name: data.foodName || "Unknown Food",
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      sugar: data.sugar,
      fiber: data.fiber,
      sodium: data.sodium,
      servingSize: data.servingSize || "1 serving",
      servingUnit: data.servingUnit || "serving",
      healthScore: data.healthScore,
      healthReason: data.healthReason,
      warnings: data.warnings || [],
      allergens: data.allergens || []
    };
  } catch (error) {
    console.error("Error analyzing text log:", error);
    throw error;
  }
};

export const analyzeImageLog = async (base64Image: string, userProfile?: UserProfile): Promise<FoodSearchResult> => {
  try {
    let promptText = `
      Analyze this food image to provide a comprehensive nutritional log.
      
      Tasks:
      1. MULTI-FOOD DETECTION: Identify ALL distinct food items on the plate (e.g., "Grilled Chicken, Quinoa, and Broccoli").
      2. PORTION ESTIMATION: Estimate the portion size for each component visually.
      3. RESTAURANT RECOGNITION: If this looks like a specific restaurant dish (e.g., "Pad Thai", "Big Mac", "Chipotle Bowl"), identify it.
      4. TOTAL NUTRITION: Calculate the AGGREGATED calories, protein, carbs, fat, sugar, fiber, and sodium for the ENTIRE meal shown.
      5. HEALTH SCORE: Rate the overall healthiness (0-100).

      Output Requirement:
      - 'foodName': A descriptive title summarizing the meal (e.g., "Salmon Bowl with Avocado & Rice").
      - 'servingSize': e.g., "1 full plate", "1 bowl".
    `;
    
    if (userProfile?.allergies) {
        promptText += ` CHECK FOR ALLERGENS: "${userProfile.allergies}". Flag them in 'warnings' and 'allergens' list.`;
    }
    
    promptText += ` Detect high sugar/sodium.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: foodLogSchema
      }
    });

    let text = response.text || "{}";
    const data = JSON.parse(text);
    
    return {
      name: data.foodName || "Unknown Food",
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      sugar: data.sugar,
      fiber: data.fiber,
      sodium: data.sodium,
      servingSize: data.servingSize || "1 serving",
      servingUnit: data.servingUnit || "serving",
      healthScore: data.healthScore,
      healthReason: data.healthReason,
      warnings: data.warnings || [],
      allergens: data.allergens || []
    };

  } catch (error) {
    console.error("Error analyzing image log:", error);
    throw error;
  }
};

export const analyzeExercise = async (text: string, userProfile?: UserProfile): Promise<{ name: string; caloriesBurned: number; durationMinutes: number }> => {
  try {
    let context = "";
    if (userProfile?.weight) {
      context = `The user weighs ${userProfile.weight}kg.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Estimate the calories burned for this exercise: "${text}". ${context} Return JSON only.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            caloriesBurned: { type: Type.NUMBER },
            durationMinutes: { type: Type.NUMBER },
          },
          required: ["name", "caloriesBurned", "durationMinutes"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("No response from AI");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error analyzing exercise:", error);
    throw error;
  }
};

export const generateMealPlan = async (userProfile: UserProfile, duration: number = 3, budget: 'Economy' | 'Standard' | 'Premium' = 'Standard'): Promise<DayPlan[]> => {
    try {
        const prompt = `
            Create a comprehensive ${duration}-day health plan for a user with the following profile:
            - Goal: ${userProfile.goal || 'General Health'}
            - Diet: ${userProfile.dietaryPreference || 'No restrictions'}
            - Allergies: ${userProfile.allergies || 'None'}
            - Calories/day: ${userProfile.weight ? userProfile.weight * 25 : 2000} approx
            - Budget Strategy: ${budget} (Economy = budget ingredients/leftovers, Premium = high-end ingredients).
            
            Return ONLY JSON. Array of ${duration} DayPlan objects.
            Include 1-2 suggested workouts per day suitable for the goal.

            Format:
            [
                {
                    "date": "Day 1",
                    "meals": [
                        {
                            "type": "Breakfast",
                            "recipe": {
                                "name": "Meal Name",
                                "description": "Short description",
                                "calories": number,
                                "protein": number,
                                "carbs": number,
                                "fat": number,
                                "prepTime": "15 mins",
                                "ingredients": [{"item": "Egg", "amount": "2 large"}],
                                "instructions": ["Step 1..."]
                            }
                        },
                        ... (Lunch, Dinner, Snack)
                    ],
                    "workouts": [
                        {
                            "name": "HIIT Cardio",
                            "duration": "20 mins",
                            "intensity": "High",
                            "caloriesEstimate": 250,
                            "instructions": ["Jumping jacks", "Burpees"]
                        }
                    ]
                }
            ]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text || "[]";
        const plans = JSON.parse(text);
        
        // Post-process to ensure IDs and dates are correct
        const today = new Date();
        return plans.map((day: any, i: number) => {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            return {
                date: date.toISOString().split('T')[0],
                meals: day.meals.map((m: any) => ({
                    ...m,
                    id: Math.random().toString(36).substr(2, 9),
                    isLogged: false
                })),
                workouts: (day.workouts || []).map((w: any) => ({
                    ...w,
                    id: Math.random().toString(36).substr(2, 9),
                    isCompleted: false
                }))
            };
        });

    } catch (error) {
        console.error("Meal plan generation failed:", error);
        throw error;
    }
};

export const suggestSwap = async (originalMeal: Recipe, userProfile: UserProfile): Promise<Recipe> => {
    try {
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest a healthier or different alternative to: ${originalMeal.name}. 
            User preferences: ${userProfile.dietaryPreference || 'None'}, Goal: ${userProfile.goal || 'Health'}.
            Return JSON matching the Recipe interface exactly.`,
            config: {
                responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        calories: { type: Type.NUMBER },
                        protein: { type: Type.NUMBER },
                        carbs: { type: Type.NUMBER },
                        fat: { type: Type.NUMBER },
                        prepTime: { type: Type.STRING },
                        ingredients: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { item: {type: Type.STRING}, amount: {type: Type.STRING} } 
                            } 
                        },
                        instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch(e) {
        console.error("Swap failed", e);
        throw e;
    }
}

export const analyzeHabits = async (foodLog: FoodItem[], waterIntake: number, moodLog: MoodEntry[], userProfile: UserProfile): Promise<HabitInsight> => {
    try {
        // Prepare simplified data for prompt
        const simpleLogs = foodLog.map(f => ({ name: f.name, time: new Date(f.timestamp).getHours(), calories: f.calories, healthScore: f.healthScore }));
        const simpleMoods = moodLog.map(m => ({ mood: m.mood, time: new Date(m.timestamp).getHours() }));
        
        const prompt = `
            Analyze these user habits for today and provide behavioral insights.
            
            Data:
            - Food Logs: ${JSON.stringify(simpleLogs)}
            - Water: ${waterIntake}ml
            - Moods: ${JSON.stringify(simpleMoods)}
            - Profile: Goal ${userProfile.goal}, Diet ${userProfile.dietaryPreference}

            Tasks:
            1. Calculate a "Habit Score" (0-100) based on consistency, health scores of food, and water.
            2. Identify a major trend (e.g. "Late Night Snacking", "Low Water Intake", "Stress Eating", "Consistent & Healthy").
            3. Provide specific advice to improve.
            4. Detect Eating Window (First meal time to Last meal time).
            5. Count snacks after 9PM.

            Return JSON matching HabitInsight schema.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER },
                        streak: { type: Type.NUMBER, description: "Estimated streak days based on quality." },
                        trendTitle: { type: Type.STRING },
                        trendDescription: { type: Type.STRING },
                        advice: { type: Type.STRING },
                        eatingWindowStart: { type: Type.STRING },
                        eatingWindowEnd: { type: Type.STRING },
                        lateNightSnacks: { type: Type.NUMBER }
                    },
                    required: ["score", "trendTitle", "trendDescription", "advice"]
                }
            }
        });

        return JSON.parse(response.text || "{}");

    } catch (e) {
        console.error("Insight analysis failed", e);
        // Fallback default
        return {
            score: 75,
            streak: 1,
            trendTitle: "Gathering Data",
            trendDescription: "Log more meals to see trends.",
            advice: "Keep logging to unlock insights!",
            lateNightSnacks: 0
        };
    }
}

export const sendChatMessage = async (
  history: { role: 'user' | 'model', text: string }[], 
  newMessage: string,
  imageBase64: string | null,
  userProfile?: UserProfile,
  stats?: DailyStats,
  targets?: NutritionTargets
) => {
  try {
    let systemInstruction = `You are a personalized AI Diet Coach 🥗.
    
    YOUR ROLE: Act as a supportive, knowledgeable nutritionist who cares about the user's specific daily context.
    
    KEY CAPABILITIES:
    1. 🍽️ CALORIE-AWARE SUGGESTIONS: If the user asks "What should I eat?", look at their REMAINING calories in the context provided. Suggest meals that fit EXACTLY or slightly under that limit.
    2. 🧠 MOOD & HEALTH: 
       - If user says "Stressed" -> Suggest Magnesium-rich foods (Dark chocolate, nuts, seeds).
       - If "Tired" -> Suggest Iron/B12 (Spinach, eggs, lean meat).
       - If "Bloated" -> Suggest Potassium/Probiotics (Yogurt, banana, ginger).
       - If "Sore" -> Suggest Protein/Antioxidants (Berries, tart cherry, protein shake).
    3. 📊 COURSE CORRECTION: If asked "How am I doing?", analyze the provided macros. 
       - If Protein is low, suggest a specific snack.
       - If Calories are high, suggest a light walk or low-cal dinner.
       
    TONE: Friendly, energetic, Emoji-rich 🍎🥑💪. Short and sweet answers (mobile optimized).`;
    
    if (userProfile) {
      const details = [];
      if (userProfile.age) details.push(`Age: ${userProfile.age}`);
      if (userProfile.goal) details.push(`Goal: ${userProfile.goal}`);
      if (userProfile.dietaryPreference) details.push(`Diet: ${userProfile.dietaryPreference}`);
      if (userProfile.allergies) details.push(`Allergies: ${userProfile.allergies}`);
      if (details.length > 0) systemInstruction += `\n\nUSER PROFILE:\n${details.join('\n')}`;
    }

    if (stats && targets) {
        const remainingCals = targets.calories - (stats.calories - stats.caloriesBurned);
        systemInstruction += `\n\n🚨 REAL-TIME CONTEXT (TODAY):\n- Calories Consumed: ${stats.calories} / ${targets.calories}\n- NET CALORIES REMAINING: ${Math.round(remainingCals)}\n- Protein: ${stats.protein}g / ${targets.protein}g\n- Carbs: ${stats.carbs}g / ${targets.carbs}g\n- Fat: ${stats.fat}g / ${targets.fat}g\n\nUse this data to give specific advice.`;
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      config: {
        systemInstruction: systemInstruction,
      }
    });

    let response;
    if (imageBase64) {
        response = await chat.sendMessage({ 
            message: [
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: newMessage || "Analyze this image and tell me if it fits my goals." }
            ]
        });
    } else {
        response = await chat.sendMessage({ message: newMessage });
    }

    return response.text;
  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
};
