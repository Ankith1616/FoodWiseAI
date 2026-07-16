/**
 * FoodWiseAI — App Store
 *
 * Root application state using Zustand.
 */

import { create } from "zustand";

interface AppState {
  /** Whether the app has finished initial loading */
  isReady: boolean;
  
  /** Visual Appetite Profiler state */
  likedDishIds: number[];
  tasteRecommendations: any[];
  userVectorSummary: string;

  /** Actions */
  setReady: (ready: boolean) => void;
  setLikedDishIds: (ids: number[]) => void;
  setTasteRecommendations: (recs: any[]) => void;
  setUserVectorSummary: (summary: string) => void;
  resetProfile: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  isReady: false,
  likedDishIds: [],
  tasteRecommendations: [],
  userVectorSummary: "",

  setReady: (ready) => set({ isReady: ready }),
  setLikedDishIds: (ids) => set({ likedDishIds: ids }),
  setTasteRecommendations: (recs) => set({ tasteRecommendations: recs }),
  setUserVectorSummary: (summary) => set({ userVectorSummary: summary }),
  resetProfile: () => set({ likedDishIds: [], tasteRecommendations: [], userVectorSummary: "" }),
}));
