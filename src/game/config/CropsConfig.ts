import type { Season } from '../systems/TimeSystem';

export type CropType = 
  | 'rice' | 'peony' | 'strawberry'
  | 'corn' | 'watermelon' | 'sunflower'
  | 'pumpkin' | 'carrot' | 'ginseng'
  | 'radish' | 'cabbage' | 'snowLotus'
  | 'coffee' | 'blueberry' | 'ancientSeed' | 'ancientFruit';

export type GrowthStage = 'seed' | 'sprout' | 'flower' | 'mature';

export type GrowthStageAction = 'water' | 'fertilizer' | 'time';

export const GROWTH_STAGE_REQUIREMENTS: Record<GrowthStage, {
  name: string;
  description: string;
  requiredAction: GrowthStageAction;
  daysToNext: number;
}> = {
  seed: {
    name: '种子',
    description: '需要浇水才能发芽',
    requiredAction: 'water',
    daysToNext: 1
  },
  sprout: {
    name: '发芽',
    description: '需要持续浇水才能生长',
    requiredAction: 'water',
    daysToNext: 1
  },
  flower: {
    name: '开花',
    description: '需要浇水才能成熟',
    requiredAction: 'water',
    daysToNext: 1
  },
  mature: {
    name: '成熟',
    description: '可以收获了！',
    requiredAction: 'time',
    daysToNext: 0
  }
};

export const getGrowthStageOrder = (): GrowthStage[] => {
  return ['seed', 'sprout', 'flower', 'mature'];
};

export const getNextGrowthStage = (current: GrowthStage): GrowthStage | null => {
  const order = getGrowthStageOrder();
  const currentIndex = order.indexOf(current);
  if (currentIndex < order.length - 1) {
    return order[currentIndex + 1];
  }
  return null;
};

export const getGrowthStageIndex = (stage: GrowthStage): number => {
  return getGrowthStageOrder().indexOf(stage);
};

export const CropQualityValues = {
  Normal: 0,
  Silver: 1,
  Gold: 2,
  Iridium: 3
} as const;

export type CropQuality = typeof CropQualityValues[keyof typeof CropQualityValues];

export const QUALITY_NAMES: Record<CropQuality, string> = {
  [CropQualityValues.Normal]: '普通',
  [CropQualityValues.Silver]: '银星',
  [CropQualityValues.Gold]: '金星',
  [CropQualityValues.Iridium]: '铱星'
};

export const QUALITY_ICONS: Record<CropQuality, string> = {
  [CropQualityValues.Normal]: '',
  [CropQualityValues.Silver]: '⚪',
  [CropQualityValues.Gold]: '🌟',
  [CropQualityValues.Iridium]: '💜'
};

export const QUALITY_COLORS: Record<CropQuality, string> = {
  [CropQualityValues.Normal]: '#FFFFFF',
  [CropQualityValues.Silver]: '#C0C0C0',
  [CropQualityValues.Gold]: '#FFD700',
  [CropQualityValues.Iridium]: '#9B30FF'
};

export const QUALITY_PRICE_MULTIPLIER: Record<CropQuality, number> = {
  [CropQualityValues.Normal]: 1.0,
  [CropQualityValues.Silver]: 1.25,
  [CropQualityValues.Gold]: 1.5,
  [CropQualityValues.Iridium]: 2.0
};

export const getQualityProbabilities = (playerLevel: number, qualityMultiplier: number = 1): Record<CropQuality, number> => {
  if (playerLevel <= 0) {
    return {
      [CropQualityValues.Normal]: 1.0,
      [CropQualityValues.Silver]: 0,
      [CropQualityValues.Gold]: 0,
      [CropQualityValues.Iridium]: 0
    };
  }

  let silverChance = 0;
  let goldChance = 0;
  let iridiumChance = 0;

  if (playerLevel >= 2) {
    silverChance = Math.min(0.05 * (playerLevel - 1) * qualityMultiplier, 0.4);
  }

  if (playerLevel >= 5) {
    goldChance = Math.min(0.04 * (playerLevel - 4) * qualityMultiplier, 0.3);
  }

  if (playerLevel >= 10) {
    iridiumChance = Math.min(0.03 * (playerLevel - 9) * qualityMultiplier, 0.15);
  }

  const normalChance = Math.max(1.0 - silverChance - goldChance - iridiumChance, 0.15);

  const total = normalChance + silverChance + goldChance + iridiumChance;
  return {
    [CropQualityValues.Normal]: normalChance / total,
    [CropQualityValues.Silver]: silverChance / total,
    [CropQualityValues.Gold]: goldChance / total,
    [CropQualityValues.Iridium]: iridiumChance / total
  };
};

export const selectCropQuality = (playerLevel: number, hasFertilizer: boolean, qualityMultiplier: number = 1): CropQuality => {
  const probabilities = getQualityProbabilities(playerLevel, qualityMultiplier);
  
  const random = Math.random();
  let cumulative = 0;
  
  let baseQuality: CropQuality = CropQualityValues.Normal;
  const qualities: CropQuality[] = [
    CropQualityValues.Iridium,
    CropQualityValues.Gold,
    CropQualityValues.Silver,
    CropQualityValues.Normal
  ];
  for (const quality of qualities) {
    cumulative += probabilities[quality];
    if (random <= cumulative) {
      baseQuality = quality;
      break;
    }
  }
  
  if (hasFertilizer) {
    return Math.min(baseQuality + 1, CropQualityValues.Iridium) as CropQuality;
  }
  
  return baseQuality;
};

export interface CropConfig {
  id: CropType;
  name: string;
  description: string;
  allowedSeasons: Season[];
  growthDays: number;
  sellPrice: number;
  seedPrice: number;
  icon: string;
  color: {
    seed: number;
    sprout: number;
    flower: number;
    mature: number;
  };
  regrowable?: boolean;
  regrowDays?: number;
  restoreEnergy?: number;
  canBecomeGiant?: boolean;
}

export const CROPS_CONFIG: Record<CropType, CropConfig> = {
  rice: {
    id: 'rice',
    name: '水稻',
    description: '春季和夏季种植的基础农作物，生长周期适中，产量稳定。',
    allowedSeasons: ['spring', 'summer'],
    growthDays: 4,
    sellPrice: 50,
    seedPrice: 15,
    icon: '🌾',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0xFFD700
    },
    restoreEnergy: 10,
    canBecomeGiant: true
  },
  peony: {
    id: 'peony',
    name: '牡丹',
    description: '春季特色花卉，生长周期较长，但售价很高，是富贵的象征。',
    allowedSeasons: ['spring'],
    growthDays: 6,
    sellPrice: 120,
    seedPrice: 40,
    icon: '🌸',
    color: {
      seed: 0x8B4513,
      sprout: 0x32CD32,
      flower: 0xFF69B4,
      mature: 0xFF1493
    },
    restoreEnergy: 5
  },
  strawberry: {
    id: 'strawberry',
    name: '草莓',
    description: '春季早熟水果，生长周期短，收益快，深受顾客喜爱。',
    allowedSeasons: ['spring'],
    growthDays: 3,
    sellPrice: 80,
    seedPrice: 25,
    icon: '🍓',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0xFFFACD,
      mature: 0xFF0000
    },
    restoreEnergy: 15,
    canBecomeGiant: true
  },
  corn: {
    id: 'corn',
    name: '玉米',
    description: '夏季主要粮食作物，产量高，生长稳定，是农场的 staple 作物。',
    allowedSeasons: ['summer'],
    growthDays: 5,
    sellPrice: 60,
    seedPrice: 20,
    icon: '🌽',
    color: {
      seed: 0xDAA520,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0xFFD700
    },
    restoreEnergy: 12,
    canBecomeGiant: true
  },
  watermelon: {
    id: 'watermelon',
    name: '西瓜',
    description: '夏季消暑必备水果，生长周期较长，但售价可观，夏日畅销品。',
    allowedSeasons: ['summer'],
    growthDays: 8,
    sellPrice: 150,
    seedPrice: 50,
    icon: '🍉',
    color: {
      seed: 0x2F4F4F,
      sprout: 0x228B22,
      flower: 0xFFD700,
      mature: 0x228B22
    },
    restoreEnergy: 25,
    canBecomeGiant: true
  },
  sunflower: {
    id: 'sunflower',
    name: '向日葵',
    description: '夏季美丽花卉，象征阳光与希望，生长周期适中，收益稳定。',
    allowedSeasons: ['summer'],
    growthDays: 4,
    sellPrice: 70,
    seedPrice: 22,
    icon: '🌻',
    color: {
      seed: 0x2F4F4F,
      sprout: 0x228B22,
      flower: 0xFFD700,
      mature: 0x8B4513
    },
    restoreEnergy: 8
  },
  coffee: {
    id: 'coffee',
    name: '咖啡',
    description: '夏季特色经济作物，成熟后每2天可再次收获，是长期投资的好选择。咖啡豆香气浓郁，价值不菲。',
    allowedSeasons: ['summer'],
    growthDays: 6,
    sellPrice: 85,
    seedPrice: 60,
    icon: '☕',
    color: {
      seed: 0x4A2C2A,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0x6F4E37
    },
    regrowable: true,
    regrowDays: 2,
    restoreEnergy: 30
  },
  blueberry: {
    id: 'blueberry',
    name: '蓝莓',
    description: '夏季珍贵浆果，成熟后每2天可再次收获。蓝莓营养丰富，市场需求旺盛，是高回报的长期作物。',
    allowedSeasons: ['summer'],
    growthDays: 5,
    sellPrice: 90,
    seedPrice: 55,
    icon: '🫐',
    color: {
      seed: 0x191970,
      sprout: 0x228B22,
      flower: 0xDDA0DD,
      mature: 0x4169E1
    },
    regrowable: true,
    regrowDays: 2,
    restoreEnergy: 18,
    canBecomeGiant: true
  },
  pumpkin: {
    id: 'pumpkin',
    name: '南瓜',
    description: '秋季标志性作物，生长周期适中，是丰收节的象征，售价不错。',
    allowedSeasons: ['autumn'],
    growthDays: 6,
    sellPrice: 100,
    seedPrice: 30,
    icon: '🎃',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0xFFD700,
      mature: 0xFF8C00
    },
    restoreEnergy: 18,
    canBecomeGiant: true
  },
  carrot: {
    id: 'carrot',
    name: '胡萝卜',
    description: '秋季速生蔬菜，生长周期短，可多次种植，是快速收益的好选择。',
    allowedSeasons: ['autumn'],
    growthDays: 3,
    sellPrice: 40,
    seedPrice: 12,
    icon: '🥕',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0xFF8C00
    },
    restoreEnergy: 12
  },
  ginseng: {
    id: 'ginseng',
    name: '人参',
    description: '珍贵药材，秋季和冬季可种植，生长周期长但售价极高，稀有的经济作物。',
    allowedSeasons: ['autumn', 'winter'],
    growthDays: 10,
    sellPrice: 300,
    seedPrice: 100,
    icon: '🪴',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0xDC143C,
      mature: 0xDAA520
    },
    restoreEnergy: 20,
    canBecomeGiant: true
  },
  radish: {
    id: 'radish',
    name: '白萝卜',
    description: '冬季耐寒蔬菜，生长周期适中，是冬储蔬菜的首选，经济实惠。',
    allowedSeasons: ['winter'],
    growthDays: 4,
    sellPrice: 45,
    seedPrice: 14,
    icon: '🥬',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0xFFFFFF
    },
    restoreEnergy: 10
  },
  cabbage: {
    id: 'cabbage',
    name: '白菜',
    description: '冬季主要蔬菜，生长周期适中，产量稳定，是冬季餐桌上的常客。',
    allowedSeasons: ['winter'],
    growthDays: 5,
    sellPrice: 55,
    seedPrice: 18,
    icon: '🥗',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0x90EE90,
      mature: 0xF0FFF0
    },
    restoreEnergy: 15,
    canBecomeGiant: true
  },
  snowLotus: {
    id: 'snowLotus',
    name: '雪莲',
    description: '传说中的冬季奇花，生长周期最长但售价最高，极其稀有的珍贵作物。',
    allowedSeasons: ['winter'],
    growthDays: 12,
    sellPrice: 400,
    seedPrice: 120,
    icon: '❄️',
    color: {
      seed: 0xE0FFFF,
      sprout: 0x87CEEB,
      flower: 0xADD8E6,
      mature: 0xFFFFFF
    },
    restoreEnergy: 25
  },
  ancientSeed: {
    id: 'ancientSeed',
    name: '古代种子',
    description: '传说中的远古作物种子，极其稀有且昂贵。生长周期长达28天（一整个季节），但成熟后每天都能产出珍贵的古代果实，是终极长期投资。',
    allowedSeasons: ['spring', 'summer', 'autumn', 'winter'],
    growthDays: 28,
    sellPrice: 0,
    seedPrice: 800,
    icon: '🌰',
    color: {
      seed: 0x8B4513,
      sprout: 0x228B22,
      flower: 0x9370DB,
      mature: 0x9932CC
    },
    regrowable: true,
    regrowDays: 1
  },
  ancientFruit: {
    id: 'ancientFruit',
    name: '古代果实',
    description: '由古代种子产出的神秘果实，蕴含远古力量，价值连城。据说这种果实拥有神奇的恢复能力。',
    allowedSeasons: ['spring', 'summer', 'autumn', 'winter'],
    growthDays: 0,
    sellPrice: 550,
    seedPrice: 0,
    icon: '🍇',
    color: {
      seed: 0x9932CC,
      sprout: 0x9932CC,
      flower: 0x9932CC,
      mature: 0x9932CC
    },
    restoreEnergy: 40
  }
};

export const getCropByType = (type: CropType): CropConfig => {
  return CROPS_CONFIG[type];
};

export const getCropsBySeason = (season: Season): CropConfig[] => {
  return Object.values(CROPS_CONFIG).filter(crop => 
    crop.allowedSeasons.includes(season)
  );
};

export const getGrowthStageTexture = (cropType: CropType, stage: GrowthStage): string => {
  return `crop_${cropType}_${stage}`;
};

export const getDaysPerStage = (totalDays: number): number[] => {
  const baseDays = Math.floor(totalDays / 4);
  const remainder = totalDays % 4;
  
  const days: number[] = [baseDays, baseDays, baseDays, baseDays];
  
  for (let i = 0; i < remainder; i++) {
    days[i]++;
  }
  
  return days;
};

export const getGrowthStageProgress = (elapsedDays: number, totalDays: number): GrowthStage => {
  const daysPerStage = getDaysPerStage(totalDays);
  let remainingDays = elapsedDays;
  
  if (remainingDays < daysPerStage[0]) return 'seed';
  remainingDays -= daysPerStage[0];
  
  if (remainingDays < daysPerStage[1]) return 'sprout';
  remainingDays -= daysPerStage[1];
  
  if (remainingDays < daysPerStage[2]) return 'flower';
  
  return 'mature';
};

export const getDaysToNextStage = (elapsedDays: number, totalDays: number): { currentStage: GrowthStage; daysInStage: number; daysNeeded: number } => {
  const daysPerStage = getDaysPerStage(totalDays);
  let remainingDays = elapsedDays;
  let currentStageIndex = 0;
  
  while (currentStageIndex < 4 && remainingDays >= daysPerStage[currentStageIndex]) {
    remainingDays -= daysPerStage[currentStageIndex];
    currentStageIndex++;
  }
  
  const stages = getGrowthStageOrder();
  const currentStage = currentStageIndex < 4 ? stages[currentStageIndex] : 'mature';
  const daysNeeded = currentStageIndex < 4 ? daysPerStage[currentStageIndex] : 0;
  
  return {
    currentStage,
    daysInStage: remainingDays,
    daysNeeded
  };
};
