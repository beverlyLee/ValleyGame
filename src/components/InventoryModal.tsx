import React, { useEffect, useState } from 'react';
import { gameStore } from '../store/useGameStore';
import { 
  CROPS_CONFIG, 
  type CropQuality,
  CropQualityValues,
  QUALITY_NAMES,
  QUALITY_ICONS,
  QUALITY_PRICE_MULTIPLIER,
  QUALITY_COLORS,
  type CropType
} from '../game/config/CropsConfig';

interface InventoryModalProps {
  visible: boolean;
  onClose: () => void;
}

interface InventoryItem {
  cropType: CropType;
  name: string;
  icon: string;
  totalCount: number;
  qualityCounts: Record<CropQuality, number>;
  sellPrice: number;
  restoreEnergy: number;
}

interface SeedItem {
  cropType: CropType;
  name: string;
  icon: string;
  count: number;
  seedPrice: number;
  growthDays: number;
  seasons: string[];
}

const InventoryModal: React.FC<InventoryModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState<'crops' | 'seeds' | 'tools'>('crops');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [seedItems, setSeedItems] = useState<SeedItem[]>([]);
  const [hoveredItem, setHoveredItem] = useState<{
    item: InventoryItem;
    quality: CropQuality;
    count: number;
  } | null>(null);
  const [hoveredSeed, setHoveredSeed] = useState<SeedItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

  const updateInventoryItems = () => {
    const state = gameStore.getState();
    const items: InventoryItem[] = [];
    const seeds: SeedItem[] = [];

    for (const cropType of Object.keys(CROPS_CONFIG) as CropType[]) {
      const cropConfig = CROPS_CONFIG[cropType];
      if (!cropConfig) continue;

      if (cropConfig.sellPrice > 0) {
        const totalCount = state.getTotalQualityCropCount(cropType);
        if (totalCount > 0) {
          const qualityCounts: Record<CropQuality, number> = {
            [CropQualityValues.Normal]: state.getQualityCropCount(cropType, CropQualityValues.Normal),
            [CropQualityValues.Silver]: state.getQualityCropCount(cropType, CropQualityValues.Silver),
            [CropQualityValues.Gold]: state.getQualityCropCount(cropType, CropQualityValues.Gold),
            [CropQualityValues.Iridium]: state.getQualityCropCount(cropType, CropQualityValues.Iridium)
          };

          items.push({
            cropType,
            name: cropConfig.name,
            icon: cropConfig.icon,
            totalCount,
            qualityCounts,
            sellPrice: cropConfig.sellPrice,
            restoreEnergy: cropConfig.restoreEnergy || 0
          });
        }
      }

      if (cropConfig.seedPrice > 0) {
        const seedCount = state.getSeedCount(cropType);
        if (seedCount > 0) {
          seeds.push({
            cropType,
            name: `${cropConfig.name}种子`,
            icon: cropConfig.icon,
            count: seedCount,
            seedPrice: cropConfig.seedPrice,
            growthDays: cropConfig.growthDays,
            seasons: cropConfig.allowedSeasons
          });
        }
      }
    }

    setInventoryItems(items);
    setSeedItems(seeds);
  };

  useEffect(() => {
    updateInventoryItems();

    const unsubscribe = gameStore.subscribe(() => {
      updateInventoryItems();
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

  const getQualityPrice = (basePrice: number, quality: CropQuality): number => {
    const multiplier = QUALITY_PRICE_MULTIPLIER[quality];
    return Math.floor(basePrice * multiplier);
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    item: InventoryItem,
    quality: CropQuality,
    count: number
  ) => {
    if (count <= 0) return;
    setHoveredItem({ item, quality, count });
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  const handleSellItem = (item: InventoryItem, quality: CropQuality) => {
    const { count, totalPrice } = gameStore.getState().sellQualityCrops(item.cropType, quality);
    
    if (count <= 0) return;

    gameStore.getState().showNotification(`💰 出售了 ${count} 个${QUALITY_ICONS[quality]}${QUALITY_NAMES[quality]} ${item.name}，获得 ${totalPrice} 金币！`);
    console.log(`出售了 ${count} 个${QUALITY_NAMES[quality]} ${item.name}，获得 ${totalPrice} 金币`);
  };

  const handleSeedMouseEnter = (e: React.MouseEvent, seed: SeedItem) => {
    setHoveredSeed(seed);
    setHoverPosition({ x: e.clientX, y: e.clientY });
  };

  if (!visible) return null;

  const totalCrops = inventoryItems.reduce((sum, item) => sum + item.totalCount, 0);
  const totalSeeds = seedItems.reduce((sum, item) => sum + item.count, 0);
  const state = gameStore.getState();
  const toolItems = [
    { name: '肥料', icon: '🧪', count: state.getFertilizerCount() },
    { name: '篱笆', icon: '🏠', count: state.fenceCount },
    { name: '洒水器', icon: '💧', count: state.sprinklerCount }
  ];
  const totalTools = toolItems.reduce((sum, item) => sum + item.count, 0);

  const renderCropsTab = () => {
    if (totalCrops === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          color: '#95A5A6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌾</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#95A5A6' }}>没有收获的作物</h3>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '13px' }}>
            种植并收获作物后，它们会出现在这里。
          </p>
        </div>
      );
    }

    return (
      <div className="shop-items" style={{ maxHeight: '480px', overflowY: 'auto' }}>
        {inventoryItems.map((item) => (
          <div 
            key={item.cropType}
            className="shop-item"
            style={{
              border: '2px solid rgba(52, 152, 219, 0.3)',
              backgroundColor: 'rgba(52, 152, 219, 0.05)',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '40px',
                minWidth: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 className="shop-item-name" style={{ margin: 0 }}>{item.name}</h3>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#3498DB',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    📦 总计: {item.totalCount}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '12px', 
                  color: '#95A5A6',
                  flexWrap: 'wrap'
                }}>
                  <span>💰 基础售价: <strong style={{ color: '#27AE60' }}>{item.sellPrice}金币</strong></span>
                  {item.restoreEnergy > 0 && (
                    <span>❤️ 恢复体力: <strong style={{ color: '#E74C3C' }}>{item.restoreEnergy}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              padding: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px'
            }}>
              {([CropQualityValues.Normal, CropQualityValues.Silver, CropQualityValues.Gold, CropQualityValues.Iridium] as CropQuality[]).map((quality) => {
                const count = item.qualityCounts[quality];
                const hasItems = count > 0;
                const price = getQualityPrice(item.sellPrice, quality);
                const qualityColor = QUALITY_COLORS[quality];

                return (
                  <div
                    key={quality}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: hasItems ? `rgba(${parseInt(qualityColor.slice(1, 3), 16)}, ${parseInt(qualityColor.slice(3, 5), 16)}, ${parseInt(qualityColor.slice(5, 7), 16)}, 0.1)` : 'rgba(0, 0, 0, 0.2)',
                      border: hasItems && quality > CropQualityValues.Normal ? `2px solid ${qualityColor}` : 'none',
                      opacity: hasItems ? 1 : 0.5,
                      cursor: hasItems ? 'pointer' : 'not-allowed',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => handleMouseEnter(e, item, quality, count)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>
                      {QUALITY_ICONS[quality] || item.icon}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      color: hasItems ? qualityColor : '#666'
                    }}>
                      {QUALITY_NAMES[quality]}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: 'bold',
                      color: hasItems ? qualityColor : '#666',
                      marginTop: '2px'
                    }}>
                      x{count}
                    </div>
                    {hasItems && (
                      <button
                        onClick={() => handleSellItem(item, quality)}
                        style={{
                          marginTop: '6px',
                          padding: '4px 12px',
                          fontSize: '10px',
                          backgroundColor: qualityColor,
                          color: quality === CropQualityValues.Normal ? '#fff' : '#000',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        出售 ({price}g/个)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSeedsTab = () => {
    if (totalSeeds === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          color: '#95A5A6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🌱</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#95A5A6' }}>没有种子</h3>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '13px' }}>
            去商店购买种子来种植吧！
          </p>
        </div>
      );
    }

    return (
      <div className="shop-items" style={{ maxHeight: '480px', overflowY: 'auto' }}>
        {seedItems.map((seed) => (
          <div 
            key={seed.cropType}
            className="shop-item"
            style={{
              border: '2px solid rgba(46, 204, 113, 0.3)',
              backgroundColor: 'rgba(46, 204, 113, 0.05)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => handleSeedMouseEnter(e, seed)}
            onMouseLeave={handleMouseLeave}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '40px',
                minWidth: '50px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {seed.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 className="shop-item-name" style={{ margin: 0 }}>{seed.name}</h3>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: '#27AE60',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    📦 x{seed.count}
                  </span>
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  fontSize: '12px', 
                  color: '#95A5A6',
                  flexWrap: 'wrap'
                }}>
                  <span>⏱️ 生长: <strong style={{ color: '#F39C12' }}>{seed.growthDays}天</strong></span>
                  <span>💰 购买价: <strong style={{ color: '#27AE60' }}>{seed.seedPrice}金币</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderToolsTab = () => {
    if (totalTools === 0) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          color: '#95A5A6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔧</div>
          <h3 style={{ margin: '0 0 10px 0', color: '#95A5A6' }}>没有工具</h3>
          <p style={{ margin: 0, textAlign: 'center', fontSize: '13px' }}>
            去商店购买肥料、篱笆或洒水器吧！
          </p>
        </div>
      );
    }

    return (
      <div className="shop-items" style={{ maxHeight: '480px', overflowY: 'auto' }}>
        {toolItems.map((tool, index) => (
          tool.count > 0 && (
            <div 
              key={index}
              className="shop-item"
              style={{
                border: '2px solid rgba(155, 89, 182, 0.3)',
                backgroundColor: 'rgba(155, 89, 182, 0.05)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  fontSize: '40px',
                  minWidth: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {tool.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="shop-item-name" style={{ margin: 0 }}>{tool.name}</h3>
                    <span style={{
                      padding: '2px 8px',
                      backgroundColor: '#9B59B6',
                      color: '#fff',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      📦 x{tool.count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        ))}
      </div>
    );
  };

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2>🎒 背包</h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              padding: '4px 12px', 
              backgroundColor: activeTab === 'crops' ? 'rgba(52, 152, 219, 0.3)' : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer'
            }} onClick={() => setActiveTab('crops')}>
              🌾 作物: <strong style={{ color: '#3498DB' }}>{totalCrops}</strong>
            </span>
            <span style={{ 
              padding: '4px 12px', 
              backgroundColor: activeTab === 'seeds' ? 'rgba(46, 204, 113, 0.3)' : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer'
            }} onClick={() => setActiveTab('seeds')}>
              🌱 种子: <strong style={{ color: '#27AE60' }}>{totalSeeds}</strong>
            </span>
            <span style={{ 
              padding: '4px 12px', 
              backgroundColor: activeTab === 'tools' ? 'rgba(155, 89, 182, 0.3)' : 'transparent',
              borderRadius: '6px',
              cursor: 'pointer'
            }} onClick={() => setActiveTab('tools')}>
              🔧 工具: <strong style={{ color: '#9B59B6' }}>{totalTools}</strong>
            </span>
          </div>
          <button className="shop-close" onClick={onClose}>✕</button>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 10px'
        }}>
          {(['crops', 'seeds', 'tools'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                backgroundColor: activeTab === tab 
                  ? (tab === 'crops' ? '#3498DB' : tab === 'seeds' ? '#27AE60' : '#9B59B6')
                  : 'rgba(255, 255, 255, 0.1)',
                color: activeTab === tab ? '#fff' : '#BDC3C7',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'crops' ? '🌾 作物' : tab === 'seeds' ? '🌱 种子' : '🔧 工具'}
            </button>
          ))}
        </div>

        {activeTab === 'crops' && renderCropsTab()}
        {activeTab === 'seeds' && renderSeedsTab()}
        {activeTab === 'tools' && renderToolsTab()}

        {hoveredItem && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(hoverPosition.x + 15, window.innerWidth - 300),
              top: Math.min(hoverPosition.y + 15, window.innerHeight - 200),
              backgroundColor: 'rgba(20, 20, 30, 0.98)',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              zIndex: 9999,
              border: '2px solid rgba(100, 100, 120, 0.6)',
              maxWidth: '280px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>{hoveredItem.item.icon}</span>
              <div>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: QUALITY_COLORS[hoveredItem.quality]
                }}>
                  {hoveredItem.quality > CropQualityValues.Normal && (
                    <span style={{ marginRight: '6px' }}>
                      [{QUALITY_ICONS[hoveredItem.quality]}]
                    </span>
                  )}
                  {hoveredItem.item.name}
                </div>
                {hoveredItem.quality > CropQualityValues.Normal && (
                  <div style={{ fontSize: '12px', color: QUALITY_COLORS[hoveredItem.quality] }}>
                    {QUALITY_NAMES[hoveredItem.quality]}品质
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#95A5A6' }}>💰 售价:</span>
                <span style={{ color: QUALITY_COLORS[hoveredItem.quality], fontWeight: 'bold' }}>
                  {getQualityPrice(hoveredItem.item.sellPrice, hoveredItem.quality)}g
                </span>
              </div>
              
              {hoveredItem.item.restoreEnergy > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#95A5A6' }}>❤️ 恢复体力:</span>
                  <span style={{ color: '#E74C3C', fontWeight: 'bold' }}>
                    {hoveredItem.item.restoreEnergy}
                  </span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#95A5A6' }}>📦 库存数量:</span>
                <span style={{ color: '#3498DB', fontWeight: 'bold' }}>
                  {hoveredItem.count}
                </span>
              </div>
            </div>

            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '20px',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid rgba(20, 20, 30, 0.95)'
            }} />
          </div>
        )}

        {hoveredSeed && (
          <div
            style={{
              position: 'fixed',
              left: Math.min(hoverPosition.x + 15, window.innerWidth - 300),
              top: Math.min(hoverPosition.y + 15, window.innerHeight - 200),
              backgroundColor: 'rgba(20, 20, 30, 0.98)',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              zIndex: 9999,
              border: '2px solid rgba(46, 204, 113, 0.6)',
              maxWidth: '280px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px'
            }}>
              <span style={{ fontSize: '28px' }}>{hoveredSeed.icon}</span>
              <div>
                <div style={{ 
                  fontWeight: 'bold', 
                  fontSize: '16px',
                  color: '#2ECC71'
                }}>
                  {hoveredSeed.name}
                </div>
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#95A5A6' }}>⏱️ 生长周期:</span>
                <span style={{ color: '#F39C12', fontWeight: 'bold' }}>
                  {hoveredSeed.growthDays} 天
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#95A5A6' }}>💰 购买价格:</span>
                <span style={{ color: '#27AE60', fontWeight: 'bold' }}>
                  {hoveredSeed.seedPrice} 金币
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#95A5A6' }}>📦 库存数量:</span>
                <span style={{ color: '#3498DB', fontWeight: 'bold' }}>
                  {hoveredSeed.count}
                </span>
              </div>
            </div>

            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '20px',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid rgba(20, 20, 30, 0.95)'
            }} />
          </div>
        )}

        <div className="shop-footer">
          <span className="shop-hint">按 Esc 关闭 | 点击标签页切换 | 鼠标悬停查看详情</span>
        </div>
      </div>
    </div>
  );
};

const InventoryModalContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.inventoryVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideInventory();
  };

  return <InventoryModal visible={visible} onClose={handleClose} />;
};

export default InventoryModalContainer;
export { InventoryModal };
