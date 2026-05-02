import React, { useEffect, useState } from 'react';
import { gameStore } from '../store/useGameStore';
import { 
  CROPS_CONFIG, 
  getCropsBySeason, 
  type CropType
} from '../game/config/CropsConfig';
import { SEASON_NAMES, type Season } from '../game/systems/TimeSystem';

type ShopItemType = 'seed' | 'fence' | 'sprinkler' | 'starterKit' | 'fertilizer';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  amount: number;
  type: ShopItemType;
  category: '种子' | '工具' | '礼包' | '肥料';
  cropType?: CropType;
  bonus?: {
    seeds?: number;
    fence?: number;
    sprinkler?: number;
    gold?: number;
  };
  price1?: number;
  price5?: number;
  price10?: number;
  allowedSeasons?: string;
  growthDays?: number;
  sellPrice?: number;
}

const getFertilizerItems = (): ShopItem[] => [
  {
    id: 'basic_fertilizer',
    name: '基础肥料',
    description: '在耕地后、播种前使用，可提升作物品质等级（普通→银星，银星→金星，以此类推。',
    price: 10,
    icon: '🧪',
    amount: 1,
    type: 'fertilizer',
    category: '肥料',
    price1: 10,
    price5: 45,
    price10: 80
  }
];

const getToolItems = (): ShopItem[] => [
  {
    id: 'fence',
    name: '木篱笆',
    description: '可放置在农场地块上，用于装饰或标记区域。购买越多越划算！',
    price: 5,
    icon: '🏠',
    amount: 1,
    type: 'fence',
    category: '工具',
    price1: 5,
    price5: 20,
    price10: 35
  },
  {
    id: 'sprinkler',
    name: '自动洒水器',
    description: '放置后每天凌晨自动将周围3x3范围的土地浇水。再也不用担心忘记浇水了！',
    price: 50,
    icon: '💧',
    amount: 1,
    type: 'sprinkler',
    category: '工具',
    price1: 50,
    price5: 130,
    price10: 200
  }
];

const getStarterKitItem = (): ShopItem => ({
  id: 'starter_kit',
  name: '🌱 新手农场礼包',
  description: '包含 10 种子 + 5 篱笆 + 1 洒水器，帮助你快速开始农场生活！完成任务必备套装。',
  price: 200,
  icon: '🎁',
  amount: 1,
  type: 'starterKit',
  category: '礼包',
  bonus: {
    seeds: 10,
    fence: 5,
    sprinkler: 1
  }
});

const generateSeedItemForCrop = (cropType: CropType): ShopItem | null => {
  const cropConfig = CROPS_CONFIG[cropType];
  if (!cropConfig) return null;

  const seasonNames = cropConfig.allowedSeasons.map(s => SEASON_NAMES[s]).join('、');
  
  return {
    id: `seed_${cropType}`,
    name: `${cropConfig.name}种子`,
    description: cropConfig.description,
    price: cropConfig.seedPrice,
    icon: cropConfig.icon,
    amount: 1,
    type: 'seed',
    category: '种子',
    cropType: cropType,
    price1: cropConfig.seedPrice,
    price5: Math.floor(cropConfig.seedPrice * 4.5),
    price10: Math.floor(cropConfig.seedPrice * 8),
    allowedSeasons: seasonNames,
    growthDays: cropConfig.growthDays,
    sellPrice: cropConfig.sellPrice
  };
};

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ visible, onClose }) => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [selectedSeedType, setSelectedSeedType] = useState<CropType>(gameStore.getState().selectedSeedType);
  const [fenceCount, setFenceCount] = useState(gameStore.getState().fenceCount);
  const [sprinklerCount, setSprinklerCount] = useState(gameStore.getState().sprinklerCount);
  const [fertilizerCount, setFertilizerCount] = useState(gameStore.getState().getFertilizerCount());
  const [message, setMessage] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);

  useEffect(() => {
    const state = gameStore.getState();
    if (state.timeState) {
      setCurrentSeason(state.timeState.season);
    }

    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setSelectedSeedType(state.selectedSeedType);
      setFenceCount(state.fenceCount);
      setSprinklerCount(state.sprinklerCount);
      setFertilizerCount(state.getFertilizerCount());
      if (state.timeState) {
        setCurrentSeason(state.timeState.season);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (visible && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const getAvailableCrops = (): CropType[] => {
    if (!currentSeason) {
      return Object.keys(CROPS_CONFIG) as CropType[];
    }
    const crops = getCropsBySeason(currentSeason);
    return crops.map(c => c.id);
  };

  const getShopItems = (): ShopItem[] => {
    const items: ShopItem[] = [];
    
    items.push(getStarterKitItem());
    
    const availableCrops = getAvailableCrops();
    for (const cropType of availableCrops) {
      const item = generateSeedItemForCrop(cropType);
      if (item) {
        items.push(item);
      }
    }
    
    items.push(...getFertilizerItems());
    items.push(...getToolItems());
    
    return items;
  };

  const handleBuy = (item: ShopItem) => {
    const state = gameStore.getState();
    if (state.gold < item.price) {
      setMessage('金币不足！');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    let success = false;
    let itemName = '';
    let bonusMessage = '';
    
    if (item.type === 'starterKit' && item.bonus) {
      gameStore.getState().addGold(-item.price);
      if (item.bonus.seeds) {
        gameStore.getState().addSeeds(item.bonus.seeds);
      }
      if (item.bonus.fence) {
        gameStore.getState().buyFence(item.bonus.fence, 0);
      }
      if (item.bonus.sprinkler) {
        gameStore.getState().buySprinkler(item.bonus.sprinkler, 0);
      }
      success = true;
      itemName = item.name;
      bonusMessage = ` (种子x${item.bonus.seeds || 0}, 篱笆x${item.bonus.fence || 0}, 洒水器x${item.bonus.sprinkler || 0})`;
    } else if (item.type === 'seed' && item.cropType) {
      success = gameStore.getState().buySeedByType(item.cropType, item.amount, item.price);
      const cropConfig = CROPS_CONFIG[item.cropType];
      itemName = `${cropConfig?.name || item.cropType}种子`;
    } else if (item.type === 'fertilizer') {
      success = gameStore.getState().buyFertilizer(item.amount, item.price);
      itemName = item.name;
    } else {
      switch (item.type) {
        case 'fence':
          success = gameStore.getState().buyFence(item.amount, item.price);
          itemName = '篱笆';
          break;
        case 'sprinkler':
          success = gameStore.getState().buySprinkler(item.amount, item.price);
          itemName = '洒水器';
          break;
      }
    }
    
    if (success) {
      setMessage(`购买成功！获得 ${item.amount > 1 ? item.amount + ' 个' : ''}${itemName}${bonusMessage}`);
      setTimeout(() => setMessage(''), 2500);
    } else {
      setMessage('购买失败！');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleBuySeed = (item: ShopItem, amount: 1 | 5 | 10) => {
    if (!item.cropType) return;
    
    const priceMap: Record<number, number | undefined> = {
      1: item.price1,
      5: item.price5,
      10: item.price10
    };
    
    const price = priceMap[amount];
    if (price === undefined) return;
    
    const state = gameStore.getState();
    if (state.gold < price) {
      setMessage('金币不足！');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const success = gameStore.getState().buySeedByType(item.cropType, amount, price);
    const cropConfig = CROPS_CONFIG[item.cropType];
    
    if (success) {
      setMessage(`购买成功！获得 ${amount} 个${cropConfig?.name || item.cropType}种子`);
      setTimeout(() => setMessage(''), 2500);
    } else {
      setMessage('购买失败！');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleBuyTool = (item: ShopItem, amount: 1 | 5 | 10) => {
    const priceMap: Record<number, number | undefined> = {
      1: item.price1,
      5: item.price5,
      10: item.price10
    };
    
    const price = priceMap[amount];
    if (price === undefined) return;
    
    const state = gameStore.getState();
    if (state.gold < price) {
      setMessage('金币不足！');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    let success = false;
    let itemName = '';
    
    if (item.type === 'fertilizer') {
      success = gameStore.getState().buyFertilizer(amount, price);
      itemName = item.name;
    } else if (item.type === 'fence') {
      success = gameStore.getState().buyFence(amount, price);
      itemName = '篱笆';
    } else if (item.type === 'sprinkler') {
      success = gameStore.getState().buySprinkler(amount, price);
      itemName = '洒水器';
    }
    
    if (success) {
      setMessage(`购买成功！获得 ${amount} 个${itemName}`);
      setTimeout(() => setMessage(''), 2500);
    } else {
      setMessage('购买失败！');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const shopItems = getShopItems();
  const categories = ['全部', ...Array.from(new Set(shopItems.map(item => item.category)))];
  
  const filteredItems = selectedCategory === '全部' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  const getTotalSeedCount = () => {
    const state = gameStore.getState();
    return state.getTotalSeedCount();
  };

  const getCurrentSeedCount = () => {
    const state = gameStore.getState();
    return state.getSeedCount(selectedSeedType);
  };

  const getCurrentCropName = () => {
    const cropConfig = CROPS_CONFIG[selectedSeedType];
    return cropConfig?.name || selectedSeedType;
  };

  if (!visible) return null;

  const seasonName = currentSeason ? SEASON_NAMES[currentSeason] : '未知';

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2>🏪 杂货商店</h2>
          <div className="shop-gold" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <span>💰 金币: <strong style={{ color: '#FFD700' }}>{gold}</strong></span>
            <span className="shop-seeds">🌱 总种子: {getTotalSeedCount()}</span>
            <span className="shop-seeds">📦 {getCurrentCropName()}: {getCurrentSeedCount()}</span>
            <span className="shop-seeds">🧪 肥料: {fertilizerCount}</span>
            <span className="shop-seeds">🏠 篱笆: {fenceCount}</span>
            <span className="shop-seeds">💧 洒水器: {sprinklerCount}</span>
          </div>
          <button className="shop-close" onClick={onClose}>✕</button>
        </div>

        <div style={{
          padding: '10px 20px',
          backgroundColor: 'rgba(52, 152, 219, 0.2)',
          margin: '0 20px 10px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '18px' }}>🌤️</span>
          <span style={{ fontSize: '14px', color: '#ECF0F1' }}>
            当前季节: <strong style={{ color: '#3498DB' }}>{seasonName}</strong>
            {currentSeason && (
              <span style={{ marginLeft: '10px', color: '#95A5A6' }}>
                (可种植: {getAvailableCrops().map(t => CROPS_CONFIG[t]?.icon || t).join(' ')})
              </span>
            )}
          </span>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px',
          marginBottom: '10px'
        }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: selectedCategory === cat 
                  ? '#3498DB' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: selectedCategory === cat ? '#fff' : '#BDC3C7',
                transition: 'all 0.2s ease'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {message && (
          <div className={`shop-message ${message.includes('成功') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div style={{
          padding: '0 20px 10px',
          fontSize: '13px',
          color: '#95A5A6'
        }}>
          💡 提示：种子仅在对应季节可种植。购买后自动设为当前种植的种子类型。
        </div>

        <div className="shop-items">
          {filteredItems.map((item) => {
            const isRecommended = item.id === 'starter_kit';
            const isSeedItem = item.type === 'seed';
            
            if (isSeedItem && item.cropType) {
              const canAfford1 = gold >= (item.price1 || 0);
              const canAfford5 = gold >= (item.price5 || 0);
              const canAfford10 = gold >= (item.price10 || 0);
              
              return (
                <div 
                  key={item.id} 
                  className="shop-item"
                  style={{
                    border: '2px solid rgba(52, 152, 219, 0.3)',
                    backgroundColor: 'rgba(52, 152, 219, 0.05)'
                  }}
                >
                  <div className="shop-item-icon" style={{
                    fontSize: '32px',
                    minWidth: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.icon}
                  </div>
                  <div className="shop-item-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 className="shop-item-name" style={{ margin: 0 }}>{item.name}</h3>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#27AE60',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        🌱 可种植
                      </span>
                    </div>
                    <p className="shop-item-desc" style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                      {item.description}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      fontSize: '12px', 
                      color: '#95A5A6',
                      flexWrap: 'wrap'
                    }}>
                      <span>🗓️ 季节: <strong style={{ color: '#3498DB' }}>{item.allowedSeasons}</strong></span>
                      <span>⏱️ 生长: <strong style={{ color: '#F39C12' }}>{item.growthDays}天</strong></span>
                      <span>💰 售价: <strong style={{ color: '#27AE60' }}>{item.sellPrice}金币</strong></span>
                      <span>📦 库存: <strong style={{ color: '#E67E22' }}>
                        {gameStore.getState().getSeedCount(item.cropType)}
                      </strong></span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuySeed(item, 1)}
                        disabled={!canAfford1}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px'
                        }}
                      >
                        1个 💰{item.price1}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuySeed(item, 5)}
                        disabled={!canAfford5}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px',
                          backgroundColor: canAfford5 ? '#F39C12' : undefined,
                          border: canAfford5 ? '2px solid #E67E22' : undefined
                        }}
                      >
                        5个 💰{item.price5}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuySeed(item, 10)}
                        disabled={!canAfford10}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '75px',
                          backgroundColor: canAfford10 ? '#27AE60' : undefined,
                          border: canAfford10 ? '2px solid #229954' : undefined
                        }}
                      >
                        10个 💰{item.price10}
                      </button>
                    </div>
                    <div style={{ fontSize: '10px', color: '#95A5A6' }}>
                      💡 购买后自动设为当前种植种子
                    </div>
                  </div>
                </div>
              );
            }

            const isFertilizerItem = item.type === 'fertilizer' && item.price1 !== undefined;
            
            if (isFertilizerItem) {
              const canAfford1 = gold >= (item.price1 || 0);
              const canAfford5 = gold >= (item.price5 || 0);
              const canAfford10 = gold >= (item.price10 || 0);
              
              return (
                <div 
                  key={item.id} 
                  className="shop-item"
                  style={{
                    border: '2px solid rgba(46, 204, 113, 0.3)',
                    backgroundColor: 'rgba(46, 204, 113, 0.05)'
                  }}
                >
                  <div className="shop-item-icon" style={{
                    fontSize: '32px',
                    minWidth: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.icon}
                  </div>
                  <div className="shop-item-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 className="shop-item-name" style={{ margin: 0 }}>{item.name}</h3>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#27AE60',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        🌱 肥料
                      </span>
                    </div>
                    <p className="shop-item-desc" style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                      {item.description}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      fontSize: '12px', 
                      color: '#95A5A6',
                      flexWrap: 'wrap'
                    }}>
                      <span>📦 库存: <strong style={{ color: '#E67E22' }}>{fertilizerCount}</strong></span>
                      <span style={{ color: '#F39C12' }}>💰 购买越多越划算！</span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 1)}
                        disabled={!canAfford1}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px'
                        }}
                      >
                        1个 💰{item.price1}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 5)}
                        disabled={!canAfford5}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px',
                          backgroundColor: canAfford5 ? '#F39C12' : undefined,
                          border: canAfford5 ? '2px solid #E67E22' : undefined
                        }}
                      >
                        5个 💰{item.price5}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 10)}
                        disabled={!canAfford10}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '75px',
                          backgroundColor: canAfford10 ? '#27AE60' : undefined,
                          border: canAfford10 ? '2px solid #229954' : undefined
                        }}
                      >
                        10个 💰{item.price10}
                      </button>
                    </div>
                    <div style={{ fontSize: '10px', color: '#95A5A6' }}>
                      💡 5个9折，10个8折
                    </div>
                  </div>
                </div>
              );
            }

            const isToolItem = (item.type === 'fence' || item.type === 'sprinkler') && item.price1 !== undefined;
            
            if (isToolItem) {
              const canAfford1 = gold >= (item.price1 || 0);
              const canAfford5 = gold >= (item.price5 || 0);
              const canAfford10 = gold >= (item.price10 || 0);
              
              const currentStock = item.type === 'fence' ? fenceCount : sprinklerCount;
              
              return (
                <div 
                  key={item.id} 
                  className="shop-item"
                  style={{
                    border: '2px solid rgba(155, 89, 182, 0.3)',
                    backgroundColor: 'rgba(155, 89, 182, 0.05)'
                  }}
                >
                  <div className="shop-item-icon" style={{
                    fontSize: '32px',
                    minWidth: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.icon}
                  </div>
                  <div className="shop-item-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 className="shop-item-name" style={{ margin: 0 }}>{item.name}</h3>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#9B59B6',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        🔧 工具
                      </span>
                    </div>
                    <p className="shop-item-desc" style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                      {item.description}
                    </p>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      fontSize: '12px', 
                      color: '#95A5A6',
                      flexWrap: 'wrap'
                    }}>
                      <span>📦 库存: <strong style={{ color: '#E67E22' }}>{currentStock}</strong></span>
                      <span style={{ color: '#F39C12' }}>💰 购买越多越划算！</span>
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '6px',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 1)}
                        disabled={!canAfford1}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px'
                        }}
                      >
                        1个 💰{item.price1}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 5)}
                        disabled={!canAfford5}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '70px',
                          backgroundColor: canAfford5 ? '#F39C12' : undefined,
                          border: canAfford5 ? '2px solid #E67E22' : undefined
                        }}
                      >
                        {item.type === 'fence' ? '5个' : '3个'} 💰{item.price5}
                      </button>
                      <button
                        className="shop-item-buy"
                        onClick={() => handleBuyTool(item, 10)}
                        disabled={!canAfford10}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          minWidth: '75px',
                          backgroundColor: canAfford10 ? '#27AE60' : undefined,
                          border: canAfford10 ? '2px solid #229954' : undefined
                        }}
                      >
                        {item.type === 'fence' ? '10个' : '5个'} 💰{item.price10}
                      </button>
                    </div>
                    <div style={{ fontSize: '10px', color: '#95A5A6' }}>
                      💡 {item.type === 'fence' ? '5个9折，10个7折' : '3个8.7折，5个8折'}
                    </div>
                  </div>
                </div>
              );
            }
            
            const canAfford = gold >= item.price;
            return (
              <div 
                key={item.id} 
                className={`shop-item ${!canAfford ? 'disabled' : ''}`}
                style={{
                  border: isRecommended ? '2px solid #F39C12' : undefined,
                  boxShadow: isRecommended ? '0 0 15px rgba(243, 156, 18, 0.3)' : undefined
                }}
              >
                <div className="shop-item-icon" style={{
                  fontSize: item.id === 'starter_kit' ? '36px' : '28px'
                }}>
                  {item.icon}
                </div>
                <div className="shop-item-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="shop-item-name">{item.name}</h3>
                    {isRecommended && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#F39C12',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        推荐
                      </span>
                    )}
                  </div>
                  <p className="shop-item-desc">{item.description}</p>
                  <div className="shop-item-price">
                    <span>💰 {item.price} 金币</span>
                    {item.amount > 1 && item.type !== 'starterKit' && (
                      <span className="shop-item-amount">x{item.amount}</span>
                    )}
                  </div>
                </div>
                <button
                  className={`shop-item-buy ${!canAfford ? 'disabled' : ''}`}
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford}
                >
                  {canAfford ? '购买' : '金币不足'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="shop-footer">
          <span className="shop-hint">按 Esc 关闭</span>
        </div>
      </div>
    </div>
  );
};

const ShopModalContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.shopVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideShop();
  };

  return <ShopModal visible={visible} onClose={handleClose} />;
};

export default ShopModalContainer;
export { ShopModal };
