import { createStore, useStore } from 'zustand';
import type { TimeState } from '../game/systems/TimeSystem';

type TileState = 'empty' | 'tilled' | 'planted' | 'grown';

interface SerializableFarmTile {
  state: TileState;
  plantedTime: number;
}

interface Relationship {
  npcId: string;
  affection: number;
  lastInteractionTime: number;
}

interface GameState {
  gold: number;
  hp: number;
  maxHp: number;
  inventory: {
    seeds: number;
    crops: number;
    ores: number;
    stones: number;
    tools: {
      hoe: number;
      wateringCan: number;
      axe: number;
      pickaxe: number;
    };
  };
  farmLevel: number;
  farmSize: number;
  farmGrid: SerializableFarmTile[][];
  gameTime: number;
  totalGameMinutes: number;
  timeState: TimeState | null;
  toolsDisabled: boolean;
  lanternLit: boolean[];
  relationships: Relationship[];
  dialogVisible: boolean;
  dialogSpeaker: string;
  dialogContent: string;
  shopVisible: boolean;
  blacksmithVisible: boolean;
  pendingInteraction: 'shop' | 'blacksmith' | null;
  addGold: (amount: number) => void;
  setGold: (amount: number) => void;
  addSeeds: (amount: number) => void;
  setSeeds: (amount: number) => void;
  addCrops: (amount: number) => void;
  setCrops: (amount: number) => void;
  addOres: (amount: number) => void;
  addStones: (amount: number) => void;
  setHp: (hp: number) => void;
  takeDamage: (amount: number) => boolean;
  heal: (amount: number) => void;
  getExpansionCost: () => number;
  canExpandFarm: () => boolean;
  expandFarm: () => boolean;
  setFarmGrid: (grid: SerializableFarmTile[][]) => void;
  updateFarmTile: (row: number, col: number, tile: SerializableFarmTile) => void;
  setGameTime: (time: number) => void;
  advanceTime: (hours: number) => void;
  setTotalGameMinutes: (minutes: number) => void;
  setTimeState: (timeState: TimeState) => void;
  setToolsDisabled: (disabled: boolean) => void;
  lightLantern: (index: number) => void;
  resetLanterns: () => void;
  showNotification: (message: string) => void;
  notificationMessage: string;
  notificationVisible: boolean;
  hideNotification: () => void;
  getRelationship: (npcId: string) => Relationship | undefined;
  updateRelationship: (npcId: string, affectionDelta: number) => void;
  showDialog: (speaker: string, content: string, pendingInteraction?: 'shop' | 'blacksmith') => void;
  hideDialog: () => void;
  showShop: () => void;
  hideShop: () => void;
  showBlacksmith: () => void;
  hideBlacksmith: () => void;
  buySeeds: (amount: number, price: number) => boolean;
  upgradeTool: (toolType: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe') => boolean;
  getToolUpgradeCost: (toolType: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe') => number;
  saveGame: () => void;
  loadGame: () => boolean;
}

const getFarmSizeForLevel = (level: number): number => {
  return 5 + (level - 1) * 2;
};

const getExpansionCostForLevel = (level: number): number => {
  return Math.pow(2, level) * 100;
};

const createEmptyFarmGrid = (size: number): SerializableFarmTile[][] => {
  const grid: SerializableFarmTile[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = {
        state: 'empty',
        plantedTime: 0
      };
    }
  }
  return grid;
};

const STORAGE_KEY = 'valley_game_save';

const gameStore = createStore<GameState>((set, get) => ({
  gold: 1000,
  hp: 100,
  maxHp: 100,
  inventory: {
    seeds: 5,
    crops: 0,
    ores: 0,
    stones: 0,
    tools: {
      hoe: 1,
      wateringCan: 1,
      axe: 1,
      pickaxe: 1
    }
  },
  farmLevel: 1,
  farmSize: 5,
  farmGrid: createEmptyFarmGrid(5),
  gameTime: 8,
  totalGameMinutes: 0,
  timeState: null,
  toolsDisabled: false,
  lanternLit: [false, false, false, false, false],
  notificationMessage: '',
  notificationVisible: false,
  relationships: [
    { npcId: 'blacksmith', affection: 0, lastInteractionTime: 0 },
    { npcId: 'shopkeeper', affection: 0, lastInteractionTime: 0 }
  ],
  dialogVisible: false,
  dialogSpeaker: '',
  dialogContent: '',
  shopVisible: false,
  blacksmithVisible: false,
  pendingInteraction: null,
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
  })),
  addOres: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, ores: state.inventory.ores + amount } 
  })),
  addStones: (amount) => set((state) => ({ 
    inventory: { ...state.inventory, stones: state.inventory.stones + amount } 
  })),
  setHp: (hp) => set((state) => ({ hp: Math.max(0, Math.min(state.maxHp, hp)) })),
  takeDamage: (amount) => {
    const state = get();
    const newHp = Math.max(0, state.hp - amount);
    set({ hp: newHp });
    return newHp <= 0;
  },
  heal: (amount) => set((state) => ({ hp: Math.min(state.maxHp, state.hp + amount) })),
  getExpansionCost: () => {
    const state = get();
    return getExpansionCostForLevel(state.farmLevel);
  },
  canExpandFarm: () => {
    const state = get();
    const cost = getExpansionCostForLevel(state.farmLevel);
    return state.gold >= cost;
  },
  expandFarm: () => {
    const state = get();
    const cost = getExpansionCostForLevel(state.farmLevel);
    
    if (state.gold >= cost) {
      const newLevel = state.farmLevel + 1;
      const newSize = getFarmSizeForLevel(newLevel);
      
      const newFarmGrid = [...state.farmGrid];
      const oldSize = state.farmSize;
      
      for (let row = 0; row < newSize; row++) {
        if (!newFarmGrid[row]) {
          newFarmGrid[row] = [];
        }
        for (let col = 0; col < newSize; col++) {
          const oldRow = row - 1;
          const oldCol = col - 1;
          
          if (oldRow >= 0 && oldRow < oldSize && oldCol >= 0 && oldCol < oldSize) {
            newFarmGrid[row][col] = { ...state.farmGrid[oldRow][oldCol] };
          } else if (!newFarmGrid[row][col]) {
            newFarmGrid[row][col] = {
              state: 'empty',
              plantedTime: 0
            };
          }
        }
      }
      
      set({
        gold: state.gold - cost,
        farmLevel: newLevel,
        farmSize: newSize,
        farmGrid: newFarmGrid
      });
      
      console.log(`农场升级成功！从 ${state.farmSize}x${state.farmSize} 扩展到 ${newSize}x${newSize}，花费 ${cost} 金币`);
      return true;
    }
    
    console.log(`金币不足！需要 ${cost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  setFarmGrid: (grid) => set(() => ({ farmGrid: grid })),
  updateFarmTile: (row, col, tile) => set((state) => {
    const newFarmGrid = state.farmGrid.map((r, ri) => 
      r.map((t, ci) => (ri === row && ci === col ? { ...tile } : t))
    );
    return { farmGrid: newFarmGrid };
  }),
  setGameTime: (time) => set(() => ({ gameTime: time })),
  advanceTime: (hours) => set((state) => {
    let newTime = state.gameTime + hours;
    if (newTime >= 24) {
      newTime = newTime - 24;
    }
    return { gameTime: newTime };
  }),
  setTotalGameMinutes: (minutes) => set(() => ({ totalGameMinutes: minutes })),
  setTimeState: (timeState) => set(() => ({ timeState })),
  setToolsDisabled: (disabled) => set(() => ({ toolsDisabled: disabled })),
  lightLantern: (index) => set((state) => {
    const newLanternLit = [...state.lanternLit];
    if (index >= 0 && index < newLanternLit.length) {
      newLanternLit[index] = true;
    }
    return { lanternLit: newLanternLit };
  }),
  resetLanterns: () => set(() => ({ lanternLit: [false, false, false, false, false] })),
  showNotification: (message) => set(() => ({
    notificationMessage: message,
    notificationVisible: true
  })),
  hideNotification: () => set(() => ({
    notificationVisible: false
  })),
  getRelationship: (npcId) => {
    const state = get();
    return state.relationships.find(r => r.npcId === npcId);
  },
  updateRelationship: (npcId, affectionDelta) => set((state) => {
    const newRelationships = state.relationships.map(r => {
      if (r.npcId === npcId) {
        const newAffection = Math.max(0, Math.min(255, r.affection + affectionDelta));
        return { ...r, affection: newAffection, lastInteractionTime: Date.now() };
      }
      return r;
    });
    return { relationships: newRelationships };
  }),
  showDialog: (speaker, content, pendingInteraction) => set(() => ({
    dialogVisible: true,
    dialogSpeaker: speaker,
    dialogContent: content,
    pendingInteraction: pendingInteraction || null
  })),
  hideDialog: () => set((state) => {
    const newState: Partial<GameState> = {
      dialogVisible: false,
      dialogSpeaker: '',
      dialogContent: ''
    };
    
    if (state.pendingInteraction === 'shop') {
      newState.shopVisible = true;
      newState.pendingInteraction = null;
    } else if (state.pendingInteraction === 'blacksmith') {
      newState.blacksmithVisible = true;
      newState.pendingInteraction = null;
    }
    
    return newState;
  }),
  showShop: () => set(() => ({ shopVisible: true })),
  hideShop: () => set(() => ({ shopVisible: false })),
  showBlacksmith: () => set(() => ({ blacksmithVisible: true })),
  hideBlacksmith: () => set(() => ({ blacksmithVisible: false })),
  buySeeds: (amount, price) => {
    const state = get();
    const totalCost = amount * price;
    if (state.gold >= totalCost) {
      set({
        gold: state.gold - totalCost,
        inventory: { ...state.inventory, seeds: state.inventory.seeds + amount }
      });
      console.log(`购买了 ${amount} 颗种子，花费 ${totalCost} 金币`);
      return true;
    }
    console.log(`金币不足！需要 ${totalCost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  getToolUpgradeCost: (toolType) => {
    const state = get();
    const currentLevel = state.inventory.tools[toolType];
    return Math.pow(2, currentLevel) * 100;
  },
  upgradeTool: (toolType) => {
    const state = get();
    const currentLevel = state.inventory.tools[toolType];
    const cost = Math.pow(2, currentLevel) * 100;
    
    if (state.gold >= cost) {
      const newLevel = currentLevel + 1;
      set({
        gold: state.gold - cost,
        inventory: {
          ...state.inventory,
          tools: {
            ...state.inventory.tools,
            [toolType]: newLevel
          }
        }
      });
      console.log(`升级 ${toolType} 成功！从 ${currentLevel} 级到 ${newLevel} 级，花费 ${cost} 金币`);
      return true;
    }
    console.log(`金币不足！升级 ${toolType} 需要 ${cost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  saveGame: () => {
    const state = get();
    const saveData = {
      gold: state.gold,
      hp: state.hp,
      maxHp: state.maxHp,
      inventory: { ...state.inventory },
      farmLevel: state.farmLevel,
      farmSize: state.farmSize,
      farmGrid: state.farmGrid.map(row => row.map(tile => ({ ...tile }))),
      gameTime: state.gameTime,
      totalGameMinutes: state.totalGameMinutes,
      relationships: state.relationships.map(r => ({ ...r }))
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      console.log('游戏保存成功！');
    } catch (error) {
      console.error('保存游戏失败:', error);
    }
  },
  loadGame: () => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.log('没有找到保存的游戏数据');
        return false;
      }
      
      const parsed = JSON.parse(savedData);
      
      set({
        gold: parsed.gold,
        hp: parsed.hp ?? 100,
        maxHp: parsed.maxHp ?? 100,
        inventory: {
          seeds: parsed.inventory?.seeds ?? 5,
          crops: parsed.inventory?.crops ?? 0,
          ores: parsed.inventory?.ores ?? 0,
          stones: parsed.inventory?.stones ?? 0,
          tools: parsed.inventory?.tools ?? {
            hoe: 1,
            wateringCan: 1,
            axe: 1,
            pickaxe: 1
          }
        },
        farmLevel: parsed.farmLevel,
        farmSize: parsed.farmSize,
        farmGrid: parsed.farmGrid.map((row: SerializableFarmTile[]) => 
          row.map((tile: SerializableFarmTile) => ({ ...tile }))
        ),
        gameTime: parsed.gameTime || 8,
        totalGameMinutes: parsed.totalGameMinutes || 0,
        relationships: parsed.relationships || [
          { npcId: 'blacksmith', affection: 0, lastInteractionTime: 0 },
          { npcId: 'shopkeeper', affection: 0, lastInteractionTime: 0 }
        ]
      });
      
      console.log('游戏读取成功！');
      return true;
    } catch (error) {
      console.error('读取游戏失败:', error);
      return false;
    }
  }
}));

const useGameStore = () => useStore(gameStore);

export default useGameStore;
export { gameStore };
