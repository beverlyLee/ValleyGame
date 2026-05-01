import { createStore, useStore } from 'zustand';

interface GameState {
  gold: number;
  inventory: {
    seeds: number;
    crops: number;
  };
  addGold: (amount: number) => void;
  setGold: (amount: number) => void;
  addSeeds: (amount: number) => void;
  setSeeds: (amount: number) => void;
  addCrops: (amount: number) => void;
  setCrops: (amount: number) => void;
}

const gameStore = createStore<GameState>((set) => ({
  gold: 1000,
  inventory: {
    seeds: 5,
    crops: 0
  },
  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  setGold: (amount) => set(() => ({ gold: amount })),
  addSeeds: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, seeds: state.inventory.seeds + amount } 
  })),
  setSeeds: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, seeds: amount } 
  })),
  addCrops: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, crops: state.inventory.crops + amount } 
  })),
  setCrops: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, crops: amount } 
  }))
}));

const useGameStore = () => useStore(gameStore);

export default useGameStore;
export { gameStore };
