import { createStore, useStore } from 'zustand';
import type { TimeState } from '../game/systems/TimeSystem';
import { 
  CROPS_CONFIG, 
  type CropType, 
  type CropQuality, 
  CropQualityValues,
  selectCropQuality,
  QUALITY_PRICE_MULTIPLIER
} from '../game/config/CropsConfig';

type TileState = 'empty' | 'tilled' | 'planted' | 'grown' | 'watered';

interface SerializableFarmTile {
  state: TileState;
  plantedTime: number;
  isWatered: boolean;
  isFertilized: boolean;
  wateredDays: number;
  cropType?: CropType;
  isRegrowing?: boolean;
  consecutivePlantingDays?: number;
  lastCropType?: CropType;
  isGiant?: boolean;
  giantCenterRow?: number;
  giantCenterCol?: number;
  currentGrowthStage?: string;
}

type PlayerRank = '农夫' | '学徒' | '熟练工' | '专家' | '大师';

interface PlaceableItem {
  row: number;
  col: number;
  type: 'fence' | 'sprinkler';
}

interface Quest {
  id: string;
  title: string;
  description: string;
  requirement: {
    type: 'deliver' | 'harvest' | 'plant';
    item: string;
    current: number;
    target: number;
  };
  reward: {
    gold: number;
    exp: number;
  };
  completed: boolean;
  claimed: boolean;
}

interface Relationship {
  npcId: string;
  affection: number;
  lastInteractionTime: number;
}

export type SeedInventory = Record<CropType, number>;
export type CropInventory = Record<CropType, number>;
export type QualityCropInventory = Record<CropType, Record<CropQuality, number>>;

interface FarmingSkill {
  level: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface GameState {
  gold: number;
  hp: number;
  maxHp: number;
  inventory: {
    seeds: SeedInventory;
    crops: CropInventory;
    qualityCrops: QualityCropInventory;
    ores: number;
    stones: number;
    fertilizer: number;
    tools: {
      hoe: number;
      wateringCan: number;
      axe: number;
      pickaxe: number;
    };
  };
  selectedSeedType: CropType;
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

  playerLevel: number;
  playerExp: number;
  expToNextLevel: number;
  playerRank: PlayerRank;

  levelUpNotificationVisible: boolean;
  newLevel: number;
  unlockedSkillName: string | null;
  unlockedSkillDescription: string | null;
  unlockedSkillIcon: string | null;

  copperHoeUnlocked: boolean;
  qualityFarmingUnlocked: boolean;
  agriculturistUnlocked: boolean;

  selectedTool: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe' | 'fence' | 'sprinkler' | 'fertilizer' | null;
  placeableItems: PlaceableItem[];
  fenceCount: number;
  sprinklerCount: number;

  questBoardVisible: boolean;
  quests: Quest[];

  skillsPanelVisible: boolean;
  cropSelectionVisible: boolean;
  targetPlantingTile: { row: number; col: number } | null;
  pendingPlantingAction: { cropType: CropType; row: number; col: number } | null;
  inventoryVisible: boolean;

  addGold: (amount: number) => void;
  setGold: (amount: number) => void;
  addSeeds: (amount: number) => void;
  setSeeds: (amount: number) => void;
  addSeedByType: (cropType: CropType, amount: number) => void;
  setSeedByType: (cropType: CropType, amount: number) => void;
  getSeedCount: (cropType: CropType) => number;
  getTotalSeedCount: () => number;
  addCrops: (amount: number) => void;
  setCrops: (amount: number) => void;
  addCropByType: (cropType: CropType, amount: number) => void;
  setCropByType: (cropType: CropType, amount: number) => void;
  getCropCount: (cropType: CropType) => number;
  getTotalCropCount: () => number;
  selectSeedType: (cropType: CropType) => void;
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
  buySeedByType: (cropType: CropType, amount: number, price: number) => boolean;
  upgradeTool: (toolType: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe') => boolean;
  getToolUpgradeCost: (toolType: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe') => number;
  saveGame: () => void;
  loadGame: () => boolean;

  addExp: (amount: number) => void;
  checkLevelUp: () => void;
  getExpPercentage: () => number;

  selectTool: (tool: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe' | 'fence' | 'sprinkler' | 'fertilizer' | null) => void;
  buyFence: (amount: number, price: number) => boolean;
  buySprinkler: (amount: number, price: number) => boolean;
  placeFence: (row: number, col: number) => boolean;
  placeSprinkler: (row: number, col: number) => boolean;
  removePlaceableItem: (row: number, col: number) => boolean;

  showQuestBoard: () => void;
  hideQuestBoard: () => void;
  addQuestProgress: (type: 'deliver' | 'harvest' | 'plant', item: string, amount: number) => void;
  claimQuestReward: (questId: string) => boolean;

  showSkillsPanel: () => void;
  hideSkillsPanel: () => void;
  toggleSkillsPanel: () => void;
  showCropSelection: (row: number, col: number) => void;
  hideCropSelection: () => void;
  showInventory: () => void;
  hideInventory: () => void;
  toggleInventory: () => void;
  plantSelectedCrop: (cropType: CropType) => void;
  clearPendingPlantingAction: () => void;

  addFertilizer: (amount: number) => void;
  getFertilizerCount: () => number;
  buyFertilizer: (amount: number, price: number) => boolean;
  addCropWithQuality: (cropType: CropType, quality: CropQuality, amount: number) => void;
  sellQualityCrops: (cropType: CropType, quality: CropQuality) => { count: number; totalPrice: number };
  getQualityCropCount: (cropType: CropType, quality: CropQuality) => number;
  getTotalQualityCropCount: (cropType: CropType) => number;
  getCropQualityPrice: (cropType: CropType, quality: CropQuality) => number;
  harvestCropWithQuality: (cropType: CropType, isFertilized: boolean) => { quality: CropQuality; price: number };

  showLevelUpNotification: (newLevel: number) => void;
  hideLevelUpNotification: () => void;
  getHoeTillingRange: () => number;
  getQualityProbabilityMultiplier: () => number;
  getGrowthSpeedMultiplier: () => number;
  getFarmingSkills: () => FarmingSkill[];
}

const getFarmSizeForLevel = (level: number): number => {
  return 5 + (level - 1) * 2;
};

const getExpansionCostForLevel = (level: number): number => {
  return Math.pow(2, level) * 100;
};

const getExpToNextLevel = (level: number): number => {
  return Math.pow(level, 2) * 100;
};

const getRankForLevel = (level: number): PlayerRank => {
  if (level >= 20) return '大师';
  if (level >= 10) return '专家';
  if (level >= 5) return '熟练工';
  if (level >= 2) return '学徒';
  return '农夫';
};

const FARMING_SKILLS_CONFIG: Record<number, { name: string; description: string; icon: string }> = {
  2: {
    name: '铜质锄头',
    description: '锄地范围从 1 格变为 3 格',
    icon: '🔨'
  },
  5: {
    name: '优质耕作',
    description: '高品质作物概率翻倍',
    icon: '🌱'
  },
  10: {
    name: '农业学家',
    description: '作物生长速度加快 10%',
    icon: '👨‍🌾'
  }
};

const createEmptySeedInventory = (): SeedInventory => {
  const inventory: Partial<SeedInventory> = {};
  for (const cropType of Object.keys(CROPS_CONFIG) as CropType[]) {
    inventory[cropType] = 0;
  }
  return inventory as SeedInventory;
};

const createEmptyCropInventory = (): CropInventory => {
  const inventory: Partial<CropInventory> = {};
  for (const cropType of Object.keys(CROPS_CONFIG) as CropType[]) {
    inventory[cropType] = 0;
  }
  return inventory as CropInventory;
};

const createEmptyQualityCropInventory = (): QualityCropInventory => {
  const inventory: Partial<QualityCropInventory> = {};
  for (const cropType of Object.keys(CROPS_CONFIG) as CropType[]) {
    inventory[cropType] = {
      [CropQualityValues.Normal]: 0,
      [CropQualityValues.Silver]: 0,
      [CropQualityValues.Gold]: 0,
      [CropQualityValues.Iridium]: 0
    };
  }
  return inventory as QualityCropInventory;
};

const getDefaultSeedType = (): CropType => {
  return 'rice';
};

const createEmptyFarmGrid = (size: number): SerializableFarmTile[][] => {
  const grid: SerializableFarmTile[][] = [];
  for (let row = 0; row < size; row++) {
    grid[row] = [];
    for (let col = 0; col < size; col++) {
      grid[row][col] = {
        state: 'empty',
        plantedTime: 0,
        isWatered: false,
        isFertilized: false,
        wateredDays: 0
      };
    }
  }
  return grid;
};

const createInitialQuests = (): Quest[] => [
  {
    id: 'quest_001',
    title: '新手农夫',
    description: '收获 10 个作物',
    requirement: {
      type: 'harvest',
      item: 'crop',
      current: 0,
      target: 10
    },
    reward: {
      gold: 100,
      exp: 50
    },
    completed: false,
    claimed: false
  },
  {
    id: 'quest_002',
    title: '勤劳播种',
    description: '种植 5 颗种子',
    requirement: {
      type: 'plant',
      item: 'seed',
      current: 0,
      target: 5
    },
    reward: {
      gold: 50,
      exp: 30
    },
    completed: false,
    claimed: false
  },
  {
    id: 'quest_003',
    title: '收获时节',
    description: '交付 10 个萝卜（作物）',
    requirement: {
      type: 'deliver',
      item: 'crop',
      current: 0,
      target: 10
    },
    reward: {
      gold: 200,
      exp: 100
    },
    completed: false,
    claimed: false
  }
];

const STORAGE_KEY = 'valley_game_save';

const gameStore = createStore<GameState>((set, get) => ({
  gold: 1000,
  hp: 100,
  maxHp: 100,
  inventory: {
    seeds: {
      ...createEmptySeedInventory(),
      rice: 5
    },
    crops: createEmptyCropInventory(),
    qualityCrops: createEmptyQualityCropInventory(),
    ores: 0,
    stones: 0,
    fertilizer: 0,
    tools: {
      hoe: 1,
      wateringCan: 1,
      axe: 1,
      pickaxe: 1
    }
  },
  selectedSeedType: getDefaultSeedType(),
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

  playerLevel: 1,
  playerExp: 0,
  expToNextLevel: getExpToNextLevel(1),
  playerRank: '农夫',

  levelUpNotificationVisible: false,
  newLevel: 1,
  unlockedSkillName: null,
  unlockedSkillDescription: null,
  unlockedSkillIcon: null,

  copperHoeUnlocked: false,
  qualityFarmingUnlocked: false,
  agriculturistUnlocked: false,

  selectedTool: null,
  placeableItems: [],
  fenceCount: 0,
  sprinklerCount: 0,

  questBoardVisible: false,
  quests: createInitialQuests(),

  skillsPanelVisible: false,
  cropSelectionVisible: false,
  targetPlantingTile: null,
  pendingPlantingAction: null,
  inventoryVisible: false,

  addGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  setGold: (amount) => set(() => ({ gold: amount })),
  addSeeds: (amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      seeds: { 
        ...state.inventory.seeds, 
        [state.selectedSeedType]: (state.inventory.seeds[state.selectedSeedType] || 0) + amount 
      } 
    } 
  })),
  setSeeds: (amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      seeds: { 
        ...state.inventory.seeds, 
        [state.selectedSeedType]: amount 
      } 
    } 
  })),
  addSeedByType: (cropType, amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      seeds: { 
        ...state.inventory.seeds, 
        [cropType]: (state.inventory.seeds[cropType] || 0) + amount 
      } 
    } 
  })),
  setSeedByType: (cropType, amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      seeds: { 
        ...state.inventory.seeds, 
        [cropType]: amount 
      } 
    } 
  })),
  getSeedCount: (cropType) => {
    const state = get();
    return state.inventory.seeds[cropType] || 0;
  },
  getTotalSeedCount: () => {
    const state = get();
    return Object.values(state.inventory.seeds).reduce((sum, count) => sum + count, 0);
  },
  addCrops: (amount) => {
    const state = get();
    const currentType = state.selectedSeedType;
    set((s) => ({ 
      inventory: { 
        ...s.inventory, 
        crops: { 
          ...s.inventory.crops, 
          [currentType]: (s.inventory.crops[currentType] || 0) + amount 
        } 
      } 
    }));
    get().addQuestProgress('harvest', 'crop', amount);
    get().addQuestProgress('deliver', 'crop', amount);
  },
  setCrops: (amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      crops: { 
        ...state.inventory.crops, 
        [state.selectedSeedType]: amount 
      } 
    } 
  })),
  addCropByType: (cropType, amount) => {
    set((state) => ({ 
      inventory: { 
        ...state.inventory, 
        crops: { 
          ...state.inventory.crops, 
          [cropType]: (state.inventory.crops[cropType] || 0) + amount 
        } 
      } 
    }));
    get().addQuestProgress('harvest', 'crop', amount);
    get().addQuestProgress('deliver', 'crop', amount);
  },
  setCropByType: (cropType, amount) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      crops: { 
        ...state.inventory.crops, 
        [cropType]: amount 
      } 
    } 
  })),
  getCropCount: (cropType) => {
    const state = get();
    return state.inventory.crops[cropType] || 0;
  },
  getTotalCropCount: () => {
    const state = get();
    return Object.values(state.inventory.crops).reduce((sum, count) => sum + count, 0);
  },
  selectSeedType: (cropType) => set(() => ({ 
    selectedSeedType: cropType 
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
              plantedTime: 0,
              isWatered: false,
              isFertilized: false,
              wateredDays: 0
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
        inventory: { 
          ...state.inventory, 
          seeds: { 
            ...state.inventory.seeds, 
            [state.selectedSeedType]: (state.inventory.seeds[state.selectedSeedType] || 0) + amount 
          } 
        }
      });
      console.log(`购买了 ${amount} 颗种子，花费 ${totalCost} 金币`);
      return true;
    }
    console.log(`金币不足！需要 ${totalCost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  buySeedByType: (cropType, amount, price) => {
    const state = get();
    const totalCost = amount * price;
    if (state.gold >= totalCost) {
      set({
        gold: state.gold - totalCost,
        inventory: { 
          ...state.inventory, 
          seeds: { 
            ...state.inventory.seeds, 
            [cropType]: (state.inventory.seeds[cropType] || 0) + amount 
          } 
        }
      });
      const cropConfig = CROPS_CONFIG[cropType];
      console.log(`购买了 ${amount} 颗${cropConfig?.name || cropType}种子，花费 ${totalCost} 金币`);
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
      relationships: state.relationships.map(r => ({ ...r })),
      playerLevel: state.playerLevel,
      playerExp: state.playerExp,
      copperHoeUnlocked: state.copperHoeUnlocked,
      qualityFarmingUnlocked: state.qualityFarmingUnlocked,
      agriculturistUnlocked: state.agriculturistUnlocked,
      placeableItems: [...state.placeableItems],
      fenceCount: state.fenceCount,
      sprinklerCount: state.sprinklerCount,
      quests: state.quests.map(q => ({ ...q }))
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
      const playerLevel = parsed.playerLevel ?? 1;
      
      const convertSeeds = (savedSeeds: any): SeedInventory => {
        if (typeof savedSeeds === 'number') {
          return {
            ...createEmptySeedInventory(),
            rice: savedSeeds
          };
        }
        return {
          ...createEmptySeedInventory(),
          ...savedSeeds
        };
      };

      const convertCrops = (savedCrops: any): CropInventory => {
        if (typeof savedCrops === 'number') {
          return createEmptyCropInventory();
        }
        return {
          ...createEmptyCropInventory(),
          ...savedCrops
        };
      };

      const convertQualityCrops = (savedQualityCrops: any): QualityCropInventory => {
        if (!savedQualityCrops) {
          return createEmptyQualityCropInventory();
        }
        const result = createEmptyQualityCropInventory();
        for (const cropType of Object.keys(CROPS_CONFIG) as CropType[]) {
          if (savedQualityCrops[cropType]) {
            result[cropType] = {
              [CropQualityValues.Normal]: savedQualityCrops[cropType][CropQualityValues.Normal] ?? 0,
              [CropQualityValues.Silver]: savedQualityCrops[cropType][CropQualityValues.Silver] ?? 0,
              [CropQualityValues.Gold]: savedQualityCrops[cropType][CropQualityValues.Gold] ?? 0,
              [CropQualityValues.Iridium]: savedQualityCrops[cropType][CropQualityValues.Iridium] ?? 0
            };
          }
        }
        return result;
      };

      const convertFarmGrid = (savedGrid: any): SerializableFarmTile[][] => {
        if (!savedGrid) return createEmptyFarmGrid(5);
        return savedGrid.map((row: any[]) => 
          row.map((tile: any) => ({
            state: tile.state || 'empty',
            plantedTime: tile.plantedTime || 0,
            isWatered: tile.isWatered || false,
            isFertilized: tile.isFertilized || false,
            wateredDays: tile.wateredDays ?? 0,
            cropType: tile.cropType
          }))
        );
      };
      
      const loadedPlayerLevel = playerLevel;
      const copperHoeUnlocked = parsed.copperHoeUnlocked ?? (loadedPlayerLevel >= 2);
      const qualityFarmingUnlocked = parsed.qualityFarmingUnlocked ?? (loadedPlayerLevel >= 5);
      const agriculturistUnlocked = parsed.agriculturistUnlocked ?? (loadedPlayerLevel >= 10);
      
      set({
        gold: parsed.gold,
        hp: parsed.hp ?? 100,
        maxHp: parsed.maxHp ?? 100,
        inventory: {
          seeds: convertSeeds(parsed.inventory?.seeds ?? 5),
          crops: convertCrops(parsed.inventory?.crops ?? 0),
          qualityCrops: convertQualityCrops(parsed.inventory?.qualityCrops),
          ores: parsed.inventory?.ores ?? 0,
          stones: parsed.inventory?.stones ?? 0,
          fertilizer: parsed.inventory?.fertilizer ?? 0,
          tools: parsed.inventory?.tools ?? {
            hoe: 1,
            wateringCan: 1,
            axe: 1,
            pickaxe: 1
          }
        },
        selectedSeedType: parsed.selectedSeedType ?? getDefaultSeedType(),
        farmLevel: parsed.farmLevel,
        farmSize: parsed.farmSize,
        farmGrid: convertFarmGrid(parsed.farmGrid),
        gameTime: parsed.gameTime || 8,
        totalGameMinutes: parsed.totalGameMinutes || 0,
        relationships: parsed.relationships || [
          { npcId: 'blacksmith', affection: 0, lastInteractionTime: 0 },
          { npcId: 'shopkeeper', affection: 0, lastInteractionTime: 0 }
        ],
        playerLevel: loadedPlayerLevel,
        playerExp: parsed.playerExp ?? 0,
        expToNextLevel: getExpToNextLevel(loadedPlayerLevel),
        playerRank: getRankForLevel(loadedPlayerLevel),
        copperHoeUnlocked,
        qualityFarmingUnlocked,
        agriculturistUnlocked,
        placeableItems: parsed.placeableItems ?? [],
        fenceCount: parsed.fenceCount ?? 0,
        sprinklerCount: parsed.sprinklerCount ?? 0,
        quests: parsed.quests ?? createInitialQuests()
      });
      
      console.log('游戏读取成功！');
      return true;
    } catch (error) {
      console.error('读取游戏失败:', error);
      return false;
    }
  },

  addExp: (amount) => {
    const state = get();
    let newExp = state.playerExp + amount;
    let newLevel = state.playerLevel;
    let expToNext = state.expToNextLevel;
    let leveledUp = false;
    let highestNewLevel = state.playerLevel;
    
    while (newExp >= expToNext) {
      newExp -= expToNext;
      newLevel++;
      highestNewLevel = newLevel;
      expToNext = getExpToNextLevel(newLevel);
      leveledUp = true;
    }
    
    const newRank = getRankForLevel(newLevel);
    
    const updates: Partial<GameState> = {
      playerLevel: newLevel,
      playerExp: newExp,
      expToNextLevel: expToNext,
      playerRank: newRank
    };
    
    if (highestNewLevel >= 2 && !state.copperHoeUnlocked) {
      updates.copperHoeUnlocked = true;
    }
    if (highestNewLevel >= 5 && !state.qualityFarmingUnlocked) {
      updates.qualityFarmingUnlocked = true;
    }
    if (highestNewLevel >= 10 && !state.agriculturistUnlocked) {
      updates.agriculturistUnlocked = true;
    }
    
    set(updates);
    
    if (leveledUp) {
      const currentState = get();
      currentState.showLevelUpNotification(highestNewLevel);
      console.log(`升级了！当前等级: Lv.${newLevel} ${newRank}`);
    }
  },
  checkLevelUp: () => {
    const state = get();
    if (state.playerExp >= state.expToNextLevel) {
      state.addExp(0);
    }
  },
  getExpPercentage: () => {
    const state = get();
    return (state.playerExp / state.expToNextLevel) * 100;
  },

  showLevelUpNotification: (newLevel) => {
    const skillConfig = FARMING_SKILLS_CONFIG[newLevel];
    if (skillConfig) {
      set({
        levelUpNotificationVisible: true,
        newLevel,
        unlockedSkillName: skillConfig.name,
        unlockedSkillDescription: skillConfig.description,
        unlockedSkillIcon: skillConfig.icon
      });
    } else {
      set({
        levelUpNotificationVisible: true,
        newLevel,
        unlockedSkillName: null,
        unlockedSkillDescription: null,
        unlockedSkillIcon: null
      });
    }
  },

  hideLevelUpNotification: () => {
    set({
      levelUpNotificationVisible: false,
      unlockedSkillName: null,
      unlockedSkillDescription: null,
      unlockedSkillIcon: null
    });
  },

  getHoeTillingRange: () => {
    const state = get();
    return state.copperHoeUnlocked ? 3 : 1;
  },

  getQualityProbabilityMultiplier: () => {
    const state = get();
    return state.qualityFarmingUnlocked ? 2 : 1;
  },

  getGrowthSpeedMultiplier: () => {
    const state = get();
    return state.agriculturistUnlocked ? 1.1 : 1.0;
  },

  getFarmingSkills: () => {
    const state = get();
    const skills: FarmingSkill[] = [];
    
    for (const [levelStr, config] of Object.entries(FARMING_SKILLS_CONFIG)) {
      const level = parseInt(levelStr, 10);
      let unlocked = false;
      
      if (level === 2) unlocked = state.copperHoeUnlocked;
      else if (level === 5) unlocked = state.qualityFarmingUnlocked;
      else if (level === 10) unlocked = state.agriculturistUnlocked;
      
      skills.push({
        level,
        name: config.name,
        description: config.description,
        icon: config.icon,
        unlocked
      });
    }
    
    return skills.sort((a, b) => a.level - b.level);
  },

  selectTool: (tool) => set({ selectedTool: tool }),
  buyFence: (amount, price) => {
    const state = get();
    const totalCost = amount * price;
    if (state.gold >= totalCost) {
      set({
        gold: state.gold - totalCost,
        fenceCount: state.fenceCount + amount
      });
      console.log(`购买了 ${amount} 个篱笆，花费 ${totalCost} 金币`);
      return true;
    }
    console.log(`金币不足！需要 ${totalCost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  buySprinkler: (amount, price) => {
    const state = get();
    const totalCost = amount * price;
    if (state.gold >= totalCost) {
      set({
        gold: state.gold - totalCost,
        sprinklerCount: state.sprinklerCount + amount
      });
      console.log(`购买了 ${amount} 个洒水器，花费 ${totalCost} 金币`);
      return true;
    }
    console.log(`金币不足！需要 ${totalCost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },
  placeFence: (row, col) => {
    const state = get();
    if (state.fenceCount <= 0) {
      console.log('没有篱笆可放置！');
      return false;
    }
    
    const hasItem = state.placeableItems.some(item => item.row === row && item.col === col);
    if (hasItem) {
      console.log('该位置已有物品！');
      return false;
    }
    
    set({
      fenceCount: state.fenceCount - 1,
      placeableItems: [...state.placeableItems, { row, col, type: 'fence' }]
    });
    console.log(`在 (${row}, ${col}) 放置了篱笆`);
    return true;
  },
  placeSprinkler: (row, col) => {
    const state = get();
    if (state.sprinklerCount <= 0) {
      console.log('没有洒水器可放置！');
      return false;
    }
    
    const hasItem = state.placeableItems.some(item => item.row === row && item.col === col);
    if (hasItem) {
      console.log('该位置已有物品！');
      return false;
    }
    
    set({
      sprinklerCount: state.sprinklerCount - 1,
      placeableItems: [...state.placeableItems, { row, col, type: 'sprinkler' }]
    });
    console.log(`在 (${row}, ${col}) 放置了洒水器`);
    return true;
  },
  removePlaceableItem: (row, col) => {
    const state = get();
    const itemIndex = state.placeableItems.findIndex(item => item.row === row && item.col === col);
    
    if (itemIndex === -1) return false;
    
    const item = state.placeableItems[itemIndex];
    const newItems = state.placeableItems.filter((_, i) => i !== itemIndex);
    
    if (item.type === 'fence') {
      set({
        placeableItems: newItems,
        fenceCount: state.fenceCount + 1
      });
    } else if (item.type === 'sprinkler') {
      set({
        placeableItems: newItems,
        sprinklerCount: state.sprinklerCount + 1
      });
    }
    
    console.log(`移除了 (${row}, ${col}) 的 ${item.type === 'fence' ? '篱笆' : '洒水器'}`);
    return true;
  },

  showQuestBoard: () => set({ questBoardVisible: true }),
  hideQuestBoard: () => set({ questBoardVisible: false }),
  addQuestProgress: (type, item, amount) => {
    const state = get();
    const newQuests = state.quests.map(quest => {
      if (quest.completed || quest.claimed) return quest;
      if (quest.requirement.type !== type) return quest;
      if (quest.requirement.item !== item) return quest;
      
      const newCurrent = Math.min(
        quest.requirement.current + amount,
        quest.requirement.target
      );
      
      const completed = newCurrent >= quest.requirement.target;
      
      if (completed && !quest.completed) {
        state.showNotification(`📋 任务完成: ${quest.title}`);
      }
      
      return {
        ...quest,
        requirement: { ...quest.requirement, current: newCurrent },
        completed
      };
    });
    
    set({ quests: newQuests });
  },
  claimQuestReward: (questId) => {
    const state = get();
    const quest = state.quests.find(q => q.id === questId);
    
    if (!quest || !quest.completed || quest.claimed) {
      return false;
    }
    
    const newQuests = state.quests.map(q => 
      q.id === questId ? { ...q, claimed: true } : q
    );
    
    set({
      quests: newQuests,
      gold: state.gold + quest.reward.gold
    });
    
    state.addExp(quest.reward.exp);
    state.showNotification(`🎁 领取奖励: ${quest.reward.gold} 金币, ${quest.reward.exp} 经验`);
    console.log(`领取任务奖励: ${quest.reward.gold} 金币, ${quest.reward.exp} 经验`);
    
    return true;
  },

  showSkillsPanel: () => set({ skillsPanelVisible: true }),
  hideSkillsPanel: () => set({ skillsPanelVisible: false }),
  toggleSkillsPanel: () => set((state) => ({ skillsPanelVisible: !state.skillsPanelVisible })),

  showCropSelection: (row, col) => set({ 
    cropSelectionVisible: true,
    targetPlantingTile: { row, col }
  }),
  hideCropSelection: () => set({ 
    cropSelectionVisible: false,
    targetPlantingTile: null,
    pendingPlantingAction: null
  }),

  showInventory: () => set({ inventoryVisible: true }),
  hideInventory: () => set({ inventoryVisible: false }),
  toggleInventory: () => set((state) => ({ inventoryVisible: !state.inventoryVisible })),
  plantSelectedCrop: (cropType) => {
    const state = get();
    const tile = state.targetPlantingTile;
    
    if (!tile) return false;
    
    const seedCount = state.getSeedCount(cropType);
    if (seedCount <= 0) {
      state.showNotification('⚠️ 没有该类型的种子了！');
      return false;
    }

    set({
      cropSelectionVisible: false,
      targetPlantingTile: null,
      pendingPlantingAction: {
        cropType,
        row: tile.row,
        col: tile.col
      }
    });
    
    console.log(`准备种植 ${CROPS_CONFIG[cropType]?.name || cropType} 在 (${tile.row}, ${tile.col})`);
    return true;
  },
  clearPendingPlantingAction: () => set({ 
    pendingPlantingAction: null 
  }),

  addFertilizer: (amount) => set((state) => ({
    inventory: {
      ...state.inventory,
      fertilizer: state.inventory.fertilizer + amount
    }
  })),

  getFertilizerCount: () => {
    const state = get();
    return state.inventory.fertilizer;
  },

  buyFertilizer: (amount, price) => {
    const state = get();
    const totalCost = price;
    if (state.gold >= totalCost) {
      set({
        gold: state.gold - totalCost,
        inventory: {
          ...state.inventory,
          fertilizer: state.inventory.fertilizer + amount
        }
      });
      console.log(`购买了 ${amount} 个肥料，花费 ${totalCost} 金币`);
      return true;
    }
    console.log(`金币不足！需要 ${totalCost} 金币，当前只有 ${state.gold} 金币`);
    return false;
  },

  addCropWithQuality: (cropType, quality, amount) => {
    set((state) => {
      const currentQualityCount = state.inventory.qualityCrops[cropType]?.[quality] || 0;
      return {
        inventory: {
          ...state.inventory,
          qualityCrops: {
            ...state.inventory.qualityCrops,
            [cropType]: {
              ...state.inventory.qualityCrops[cropType],
              [quality]: currentQualityCount + amount
            }
          }
        }
      };
    });
    get().addQuestProgress('harvest', 'crop', amount);
    get().addQuestProgress('deliver', 'crop', amount);
  },

  sellQualityCrops: (cropType, quality) => {
    const state = get();
    const count = state.getQualityCropCount(cropType, quality);
    
    if (count <= 0) {
      return { count: 0, totalPrice: 0 };
    }

    const pricePerUnit = get().getCropQualityPrice(cropType, quality);
    const totalPrice = pricePerUnit * count;

    set((s) => ({
      gold: s.gold + totalPrice,
      inventory: {
        ...s.inventory,
        qualityCrops: {
          ...s.inventory.qualityCrops,
          [cropType]: {
            ...s.inventory.qualityCrops[cropType],
            [quality]: 0
          }
        }
      }
    }));

    return { count, totalPrice };
  },

  getQualityCropCount: (cropType, quality) => {
    const state = get();
    return state.inventory.qualityCrops[cropType]?.[quality] || 0;
  },

  getTotalQualityCropCount: (cropType) => {
    const state = get();
    const qualityCrops = state.inventory.qualityCrops[cropType];
    if (!qualityCrops) return 0;
    return Object.values(qualityCrops).reduce((sum, count) => sum + count, 0);
  },

  getCropQualityPrice: (cropType, quality) => {
    const cropConfig = CROPS_CONFIG[cropType];
    if (!cropConfig) return 0;
    const multiplier = QUALITY_PRICE_MULTIPLIER[quality];
    return Math.floor(cropConfig.sellPrice * multiplier);
  },

  harvestCropWithQuality: (cropType, isFertilized) => {
    const state = get();
    const qualityMultiplier = state.getQualityProbabilityMultiplier();
    const quality = selectCropQuality(state.playerLevel, isFertilized, qualityMultiplier);
    const price = get().getCropQualityPrice(cropType, quality);
    return { quality, price };
  }
}));

const useGameStore = () => useStore(gameStore);

export default useGameStore;
export { gameStore };
