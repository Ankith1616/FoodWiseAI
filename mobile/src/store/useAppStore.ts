/**
 * FoodWiseAI — App Store
 * Root application state using Zustand.
 */

import { create } from "zustand";

export interface OrderItem {
  id: string;
  dishId: number;
  dishName: string;
  restaurant: string;
  price: number;
  quantity: number;
  totalPrice: number;
  image: string;
  category: string;
  spiceLevel: string;
  mealTime: "Breakfast 🌅" | "Lunch ☀️" | "Evening Snacks ☕" | "Dinner 🌙";
  instructions?: string;
  date: string;
  status: "Preparing 🍳" | "In Transit 🛵" | "Delivered ✅";
  kcal: number;
  proteinGrams: number;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  isDefault: boolean;
}

export interface SurveyResponse {
  question: string;
  answer: string;
}

export type DietaryMode = 'all' | 'veg' | 'non-veg';

export interface UserSurveyPreferences {
  favoriteCuisines: string[];
  favoriteFoods: string[];
  allergies: string[];
  dietaryRestrictions: string[];
  healthGoals: string[];
  mealTimings: string[];
  orderingFrequency: string;
  spicePreference: string;
  sweetPreference: string;
  budget: string;
  selectedCity: string;
  nonVegFastDays: string[];
  enableOrderHistoryBias: boolean;
  activeTimeSlot: 'Morning (Breakfast)' | 'Afternoon (Lunch)' | 'Evening (Snacks)' | 'Night (Dinner)';
  isAutoLocation: boolean;
}

interface AppState {
  /** Whether the app has finished initial loading */
  isReady: boolean;

  /** Visual Appetite Profiler state */
  likedDishIds: number[];
  tasteRecommendations: any[];
  userVectorSummary: string;

  /** Past & Active Orders State */
  orders: OrderItem[];

  /** Global dietary filter */
  dietaryMode: DietaryMode;

  /** User location & profile survey preferences */
  selectedCity: string;
  userSurveyPreferences: UserSurveyPreferences;

  /** Legacy helper profile getters/actions */
  savedAddresses: SavedAddress[];
  favoriteFoods: string[];
  preferredCuisines: string[];
  dietaryPreference: 'Veg' | 'Non-Veg';
  budgetPreference: '₹' | '₹₹' | '₹₹₹';
  mealPreferences: string[];
  healthGoals: string[];
  surveyResponses: SurveyResponse[];

  /** Actions */
  setReady: (ready: boolean) => void;
  setLikedDishIds: (ids: number[]) => void;
  setTasteRecommendations: (recs: any[]) => void;
  setUserVectorSummary: (summary: string) => void;
  setSelectedCity: (city: string) => void;
  updateSurveyPreferences: (prefs: Partial<UserSurveyPreferences>) => void;
  placeOrder: (order: Omit<OrderItem, "id" | "date" | "status">) => OrderItem;
  resetProfile: () => void;
  setDietaryMode: (mode: DietaryMode) => void;
  setDietaryPreference: (pref: 'Veg' | 'Non-Veg') => void;
  setBudgetPreference: (pref: '₹' | '₹₹' | '₹₹₹') => void;
  toggleMealPreference: (meal: string) => void;
  addSavedAddress: (address: SavedAddress) => void;
  removeSavedAddress: (id: string) => void;
}

const SEED_ORDERS: OrderItem[] = [
  {
    id: "ORD-9482",
    dishId: 1,
    dishName: "Chicken Lollipop Drums",
    restaurant: "Spice Station",
    price: 260,
    quantity: 2,
    totalPrice: 520,
    image: "best_chicken_lollipop_drums_of_chicken-500x500.jpg",
    category: "Indian",
    spiceLevel: "Medium",
    mealTime: "Dinner 🌙",
    instructions: "Extra mint chutney please",
    date: "Yesterday at 8:30 PM",
    status: "Delivered ✅",
    kcal: 450,
    proteinGrams: 32,
  },
  {
    id: "ORD-8391",
    dishId: 14,
    dishName: "Chicken Dum Biryani",
    restaurant: "Biryani Zone",
    price: 280,
    quantity: 1,
    totalPrice: 280,
    image: "images (10).jpeg",
    category: "Indian",
    spiceLevel: "Spicy",
    mealTime: "Lunch ☀️",
    date: "2 days ago at 1:15 PM",
    status: "Delivered ✅",
    kcal: 510,
    proteinGrams: 32,
  },
  {
    id: "ORD-7290",
    dishId: 20,
    dishName: "Italian Pizza with Olives",
    restaurant: "Toscano Pizzeria",
    price: 380,
    quantity: 1,
    totalPrice: 380,
    image: "pizza-with-olives-tomatoes-olives-it_1268410-858.avif",
    category: "Italian",
    spiceLevel: "Mild",
    mealTime: "Dinner 🌙",
    date: "4 days ago at 9:00 PM",
    status: "Delivered ✅",
    kcal: 560,
    proteinGrams: 20,
  },
];

const SEED_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-1",
    label: "Home",
    address: "42, 3rd Cross, Koramangala 5th Block, Bangalore - 560095",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "College",
    address: "Amrita School of Engineering, Kasavanahalli, Bangalore - 560035",
    isDefault: false,
  },
  {
    id: "addr-3",
    label: "Office",
    address: "91 Springboard, Indiranagar, Bangalore - 560038",
    isDefault: false,
  },
];

const SEED_SURVEY_RESPONSES: SurveyResponse[] = [
  { question: "What is your primary health goal?", answer: "Lean Muscle Gain & Caloric Management" },
  { question: "How often do you eat out per week?", answer: "4–5 times a week" },
  { question: "Do you have any food allergies?", answer: "None" },
  { question: "What cuisines do you enjoy most?", answer: "Indian, Italian" },
  { question: "What is your preferred spice level?", answer: "Medium to Spicy" },
  { question: "What is your average meal budget?", answer: "₹200 – ₹400 per meal" },
  { question: "Which meals do you usually order?", answer: "Lunch and Dinner" },
  { question: "Do you prefer home-cooked style or restaurant style?", answer: "Restaurant style with authentic flavours" },
];

const DEFAULT_SURVEY_PREFS: UserSurveyPreferences = {
  selectedCity: "Bangalore",
  favoriteCuisines: ["Indian", "Italian", "Fast Food"],
  favoriteFoods: ["Chicken Biryani", "Paneer Tikka", "Masala Dosa", "Gulab Jamun", "Pizza"],
  allergies: ["Peanuts (Mild)"],
  dietaryRestrictions: ["None"],
  healthGoals: ["Lean Muscle Gain", "High Protein", "Caloric Management"],
  mealTimings: ["Lunch ☀️", "Dinner 🌙"],
  orderingFrequency: "4–5 times a week",
  spicePreference: "Medium to Spicy 🌶️",
  sweetPreference: "Moderate Sweet Tooth 🍯",
  budget: "₹200 – ₹400 per meal (₹₹)",
  nonVegFastDays: ["Thursday 🌿", "Saturday 🌿"],
  enableOrderHistoryBias: true,
  activeTimeSlot: "Afternoon (Lunch)",
  isAutoLocation: true,
};

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  likedDishIds: [],
  tasteRecommendations: [],
  userVectorSummary: "",
  orders: SEED_ORDERS,
  dietaryMode: 'all',

  selectedCity: "Bangalore",
  userSurveyPreferences: DEFAULT_SURVEY_PREFS,

  // User profile data
  savedAddresses: SEED_ADDRESSES,
  favoriteFoods: DEFAULT_SURVEY_PREFS.favoriteFoods,
  preferredCuisines: DEFAULT_SURVEY_PREFS.favoriteCuisines,
  dietaryPreference: 'Non-Veg',
  budgetPreference: '₹₹',
  mealPreferences: ["Lunch", "Dinner"],
  healthGoals: DEFAULT_SURVEY_PREFS.healthGoals,
  surveyResponses: SEED_SURVEY_RESPONSES,

  setReady: (ready) => set({ isReady: ready }),
  setLikedDishIds: (ids) => set({ likedDishIds: ids }),
  setTasteRecommendations: (recs) => set({ tasteRecommendations: recs }),
  setUserVectorSummary: (summary) => set({ userVectorSummary: summary }),
  setSelectedCity: (city) =>
    set((state) => ({
      selectedCity: city,
      userSurveyPreferences: { ...state.userSurveyPreferences, selectedCity: city },
    })),
  updateSurveyPreferences: (newPrefs) =>
    set((state) => ({
      userSurveyPreferences: { ...state.userSurveyPreferences, ...newPrefs },
      favoriteFoods: newPrefs.favoriteFoods || state.favoriteFoods,
      preferredCuisines: newPrefs.favoriteCuisines || state.preferredCuisines,
      healthGoals: newPrefs.healthGoals || state.healthGoals,
    })),
  setDietaryMode: (mode) => set({ dietaryMode: mode }),
  setDietaryPreference: (pref) => set({ dietaryPreference: pref }),
  setBudgetPreference: (pref) => set({ budgetPreference: pref }),
  toggleMealPreference: (meal) =>
    set((state) => ({
      mealPreferences: state.mealPreferences.includes(meal)
        ? state.mealPreferences.filter((m) => m !== meal)
        : [...state.mealPreferences, meal],
    })),
  addSavedAddress: (address) =>
    set((state) => ({ savedAddresses: [...state.savedAddresses, address] })),
  removeSavedAddress: (id) =>
    set((state) => ({
      savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
    })),

  placeOrder: (orderData) => {
    const newOrder: OrderItem = {
      ...orderData,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      mealTime: orderData.mealTime || "Lunch ☀️",
      date: "Just Now",
      status: "Preparing 🍳",
    };
    set((state) => ({
      orders: [newOrder, ...state.orders],
    }));

    // Post order interaction event to backend DB with Hard-Negative Classifier
    try {
      fetch('http://localhost:8000/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'USR_PROD_APP_USER',
          food_id: orderData.dishId,
          interaction_type: 'order',
          rating_val: 5.0,
          recommendation_source: 'explore',
        }),
      }).catch((e) => console.warn('Order interaction track note:', e));
    } catch (e) {}

    return newOrder;
  },

  trackInteraction: (foodId: number, type: string, rating?: number, dwellSec?: number, source?: string) => {
    try {
      fetch('http://localhost:8000/api/v1/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'USR_PROD_APP_USER',
          food_id: foodId,
          interaction_type: type,
          rating_val: rating,
          dwell_time_sec: dwellSec || 1.5,
          recommendation_source: source || 'explore',
        }),
      }).catch((e) => console.warn('Interaction track note:', e));
    } catch (e) {}
  },

  resetProfile: () =>
    set({
      likedDishIds: [],
      tasteRecommendations: [],
      userVectorSummary: "",
    }),
}));
