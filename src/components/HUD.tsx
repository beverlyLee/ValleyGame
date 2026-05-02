import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';
import type { TimeState } from '../game/systems/TimeSystem';
import type { SeedInventory, CropInventory } from '../store/useGameStore';

type ToolType = 'hoe' | 'wateringCan' | 'axe' | 'pickaxe' | 'fence' | 'sprinkler' | 'fertilizer' | null;

interface ToolButtonConfig {
  id: ToolType;
  name: string;
  icon: string;
  countKey?: string;
  description: string;
}

const toolButtons: ToolButtonConfig[] = [
  { 
    id: 'hoe', 
    name: '锄头', 
    icon: '🔨', 
    description: '【用途】将空地翻耕为可种植的耕地。\n【使用方法】选择锄头后，靠近空地按 E 键。\n【提示】必须先耕地才能播种！'
  },
  { 
    id: 'wateringCan', 
    name: '水壶', 
    icon: '💧', 
    description: '【用途】给已播种的土地浇水，加速作物生长。\n【使用方法】选择水壶后，靠近已耕种的土地按 E 键。\n【提示】浇水后的土地会变成深色，作物生长更快！'
  },
  { 
    id: 'axe', 
    name: '斧头', 
    icon: '🪓', 
    description: '【用途】砍伐树木获取木材资源。\n【使用方法】选择斧头后，靠近树木按 E 键。\n【提示】木材可用于升级工具或建造！'
  },
  { 
    id: 'pickaxe', 
    name: '镐子', 
    icon: '⛏️', 
    description: '【用途】在矿洞中挖掘石头和矿石。\n【使用方法】选择镐子后，到矿洞靠近矿石按 E 键。\n【提示】矿石可以出售换取金币！'
  },
  { 
    id: 'fence', 
    name: '篱笆', 
    icon: '🏠', 
    countKey: 'fence',
    description: '【用途】放置在农场地块上，用于装饰或标记区域。\n【使用方法】点击选择篱笆 → 鼠标悬停预览位置 → 左键点击放置。\n【提示】需要在商店购买后才能使用！'
  },
  { 
    id: 'sprinkler', 
    name: '洒水器', 
    icon: '🚿', 
    countKey: 'sprinkler',
    description: '【用途】自动灌溉工具，每天凌晨自动给周围3x3范围的土地浇水。\n【使用方法】点击选择洒水器 → 鼠标悬停预览位置 → 左键点击放置。\n【提示】放置后无需手动浇水，节省大量时间！'
  },
  { 
    id: 'fertilizer', 
    name: '肥料', 
    icon: '🧪', 
    countKey: 'fertilizer',
    description: '【用途】提升作物品质，收获时品质等级强制+1。\n【使用方法】点击选择肥料后，靠近已耕地但未播种的地块按 F 键施肥，或左键点击放置。\n【提示】必须在播种前施肥！'
  }
];

const getTotalSeedCount = (seeds: SeedInventory): number => {
  return Object.values(seeds).reduce((sum, count) => sum + count, 0);
};

const getTotalCropCount = (crops: CropInventory): number => {
  return Object.values(crops).reduce((sum, count) => sum + count, 0);
};

const HUD: React.FC = () => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [seedInventory, setSeedInventory] = useState(gameStore.getState().inventory.seeds);
  const [cropInventory, setCropInventory] = useState(gameStore.getState().inventory.crops);
  const [hp, setHp] = useState(gameStore.getState().hp);
  const [maxHp, setMaxHp] = useState(gameStore.getState().maxHp);
  const [timeState, setTimeState] = useState<TimeState | null>(gameStore.getState().timeState);
  const [notificationMessage, setNotificationMessage] = useState(gameStore.getState().notificationMessage);
  const [notificationVisible, setNotificationVisible] = useState(gameStore.getState().notificationVisible);
  const [selectedTool, setSelectedTool] = useState<ToolType>(gameStore.getState().selectedTool);
  const [fenceCount, setFenceCount] = useState(gameStore.getState().fenceCount);
  const [sprinklerCount, setSprinklerCount] = useState(gameStore.getState().sprinklerCount);
  const [fertilizerCount, setFertilizerCount] = useState(gameStore.getState().inventory.fertilizer);
  const [playerLevel, setPlayerLevel] = useState(gameStore.getState().playerLevel);
  const [playerRank, setPlayerRank] = useState(gameStore.getState().playerRank);
  const [farmLevel, setFarmLevel] = useState(gameStore.getState().farmLevel);
  const [farmSize, setFarmSize] = useState(gameStore.getState().farmSize);
  const [hoveredTool, setHoveredTool] = useState<ToolType | null>(null);
  
  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setSeedInventory(state.inventory.seeds);
      setCropInventory(state.inventory.crops);
      setHp(state.hp);
      setMaxHp(state.maxHp);
      setTimeState(state.timeState);
      setNotificationMessage(state.notificationMessage);
      setNotificationVisible(state.notificationVisible);
      setSelectedTool(state.selectedTool);
      setFenceCount(state.fenceCount);
      setSprinklerCount(state.sprinklerCount);
      setFertilizerCount(state.inventory.fertilizer);
      setPlayerLevel(state.playerLevel);
      setPlayerRank(state.playerRank);
      setFarmLevel(state.farmLevel);
      setFarmSize(state.farmSize);
    });
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (notificationVisible) {
      const timer = setTimeout(() => {
        gameStore.getState().hideNotification();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notificationVisible, notificationMessage]);
  
  const hpPercent = (hp / maxHp) * 100;
  const hpColor = hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#facc15' : '#ef4444';

  const expansionCost = gameStore.getState().getExpansionCost();
  const canExpand = gameStore.getState().canExpandFarm();

  const getSeasonName = (season: string): string => {
    const names: Record<string, string> = {
      spring: '春季',
      summer: '夏季',
      autumn: '秋季',
      winter: '冬季'
    };
    return names[season] || season;
  };

  const getSeasonColor = (season: string): string => {
    const colors: Record<string, string> = {
      spring: '#90EE90',
      summer: '#FFD700',
      autumn: '#DEB887',
      winter: '#E0FFFF'
    };
    return colors[season] || '#FFFFFF';
  };

  const handleToolClick = (tool: ToolType) => {
    if (tool === 'fence' && fenceCount <= 0) {
      gameStore.getState().showNotification('⚠️ 没有篱笆！请去商店购买');
      return;
    }
    if (tool === 'sprinkler' && sprinklerCount <= 0) {
      gameStore.getState().showNotification('⚠️ 没有洒水器！请去商店购买');
      return;
    }
    if (tool === 'fertilizer' && fertilizerCount <= 0) {
      gameStore.getState().showNotification('⚠️ 没有肥料！请去商店购买');
      return;
    }
    
    if (selectedTool === tool) {
      gameStore.getState().selectTool(null);
    } else {
      gameStore.getState().selectTool(tool);
      if (tool === 'fence' || tool === 'sprinkler') {
        gameStore.getState().showNotification(`📍 已选择${tool === 'fence' ? '篱笆' : '洒水器'}，鼠标悬停预览，左键放置`);
      } else if (tool === 'fertilizer') {
        gameStore.getState().showNotification('🧪 已选择肥料，靠近已耕地块按 F 键施肥');
      }
    }
  };

  const getToolCount = (tool: ToolButtonConfig): number => {
    if (tool.countKey === 'fence') return fenceCount;
    if (tool.countKey === 'sprinkler') return sprinklerCount;
    if (tool.countKey === 'fertilizer') return fertilizerCount;
    return -1;
  };

  
  return (
    <>
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'rgba(20, 20, 30, 0.9)',
        borderRadius: '16px',
        padding: '20px',
        border: '2px solid rgba(100, 100, 120, 0.5)',
        zIndex: 1000,
        minWidth: '280px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '15px',
          paddingBottom: '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '24px' }}>⭐</span>
            <div>
              <div style={{
                color: '#FFD700',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                Lv.{playerLevel} {playerRank}
              </div>
              <div style={{
                color: '#888',
                fontSize: '11px'
              }}>
                按 K 查看技能面板
              </div>
            </div>
          </div>
          <div style={{
            textAlign: 'right'
          }}>
            <div style={{
              color: '#90EE90',
              fontWeight: 'bold',
              fontSize: '14px'
            }}>
              🏡 农场 Lv.{farmLevel}
            </div>
            <div style={{
              color: '#888',
              fontSize: '11px'
            }}>
              规模: {farmSize}x{farmSize}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}>
            <span style={{ color: '#aaa', fontSize: '12px' }}>❤️ 生命值</span>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{hp}/{maxHp}</span>
          </div>
          <div style={{
            height: '14px',
            backgroundColor: 'rgba(50, 50, 60, 0.8)',
            borderRadius: '7px',
            overflow: 'hidden',
            border: '1px solid rgba(100, 100, 120, 0.3)'
          }}>
            <div style={{
              height: '100%',
              width: `${hpPercent}%`,
              backgroundColor: hpColor,
              transition: 'width 0.3s ease',
              borderRadius: '6px'
            }} />
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px'
        }}>
          <div style={{
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>💰</div>
            <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '14px' }}>{gold}</div>
            <div style={{ color: '#888', fontSize: '10px' }}>金币</div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(144, 238, 144, 0.1)',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>🌱</div>
            <div style={{ color: '#90EE90', fontWeight: 'bold', fontSize: '14px' }}>{getTotalSeedCount(seedInventory)}</div>
            <div style={{ color: '#888', fontSize: '10px' }}>种子</div>
          </div>
          
          <div style={{
            backgroundColor: 'rgba(255, 182, 193, 0.1)',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>🌾</div>
            <div style={{ color: '#FFB6C1', fontWeight: 'bold', fontSize: '14px' }}>{getTotalCropCount(cropInventory)}</div>
            <div style={{ color: '#888', fontSize: '10px' }}>作物</div>
          </div>
          
          {timeState && (
            <div style={{
              backgroundColor: 'rgba(135, 206, 250, 0.1)',
              padding: '10px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>📅</div>
              <div style={{ color: '#87CEEB', fontWeight: 'bold', fontSize: '12px' }}>
                第{timeState.day + 1}天
              </div>
              <div style={{ 
                color: getSeasonColor(timeState.season), 
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                {getSeasonName(timeState.season)}
              </div>
            </div>
          )}
        </div>

        <div style={{
          marginTop: '15px',
          padding: '10px 12px',
          backgroundColor: canExpand ? 'rgba(46, 204, 113, 0.15)' : 'rgba(127, 140, 141, 0.15)',
          borderRadius: '8px',
          border: `1px solid ${canExpand ? 'rgba(46, 204, 113, 0.3)' : 'rgba(127, 140, 141, 0.3)'}`,
          marginBottom: '12px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '12px',
              color: '#aaa'
            }}>
              🔨 扩展农场 (X键)
            </span>
            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: canExpand ? '#2ECC71' : '#95A5A6'
            }}>
              {expansionCost} 金币 {canExpand ? '✔ 可扩展' : '(金币不足)'}
            </span>
          </div>
        </div>

        <div style={{
          paddingTop: '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: '#666'
        }}>
          <span>🏠 篱笆: <span style={{ color: '#FFD700' }}>{fenceCount}</span></span>
          <span>🚿 洒水器: <span style={{ color: '#64C8FF' }}>{sprinklerCount}</span></span>
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: '15px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 1000
      }}>
        {toolButtons.map((tool) => {
          const isSelected = selectedTool === tool.id;
          const count = getToolCount(tool);
          const hasCount = count >= 0;
          const isDisabled = hasCount && count <= 0;
          const isHovered = hoveredTool === tool.id;
          
          return (
            <div key={tool.id} style={{ position: 'relative' }}>
              <button
                onClick={() => handleToolClick(tool.id)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '60px',
                  height: '70px',
                  backgroundColor: isSelected 
                    ? 'rgba(52, 152, 219, 0.9)' 
                    : isDisabled
                      ? 'rgba(80, 80, 80, 0.5)'
                      : 'rgba(40, 40, 50, 0.9)',
                  border: isSelected 
                    ? '3px solid #3498DB' 
                    : isHovered
                      ? '2px solid rgba(255, 255, 255, 0.3)'
                      : '2px solid rgba(100, 100, 120, 0.3)',
                  borderRadius: '10px',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected 
                    ? '0 0 20px rgba(52, 152, 219, 0.5)' 
                    : 'none'
                }}
                disabled={isDisabled}
              >
                <span style={{ fontSize: '28px' }}>{tool.icon}</span>
                {hasCount && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: count > 0 ? '#FFD700' : '#666',
                    marginTop: '2px'
                  }}>
                    x{count}
                  </span>
                )}
              </button>
              
              {isHovered && (
                <div style={{
                  position: 'absolute',
                  bottom: '95px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(20, 20, 30, 0.98)',
                  color: '#fff',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  zIndex: 1010,
                  border: '2px solid rgba(100, 100, 120, 0.6)',
                  maxWidth: '350px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#FFD700',
                    marginBottom: '6px',
                    fontSize: '14px'
                  }}>
                    {tool.name}
                  </div>
                  <div style={{
                    color: '#ccc',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-line',
                    minWidth: '220px'
                  }}>
                    {tool.description}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid rgba(20, 20, 30, 0.95)'
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        position: 'fixed',
        bottom: '105px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(20, 20, 30, 0.8)',
        padding: '10px 24px',
        borderRadius: '20px',
        fontSize: '12px',
        color: '#888',
        zIndex: 999
      }}>
        <span style={{ marginRight: '15px' }}>
          WASD/方向键 <strong style={{ color: '#aaa' }}>移动</strong>
        </span>
        <span style={{ marginRight: '15px' }}>
          E <strong style={{ color: '#aaa' }}>交互/使用工具</strong>
        </span>
        <span style={{ marginRight: '15px' }}>
          K <strong style={{ color: '#aaa' }}>技能面板</strong>
        </span>
        <span>
          B <strong style={{ color: '#aaa' }}>打开商店</strong>
        </span>
      </div>

      {notificationVisible && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '15px 30px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: '#FFD700',
          fontSize: '18px',
          fontWeight: 'bold',
          borderRadius: '10px',
          border: '2px solid #FFD700',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          {notificationMessage}
        </div>
      )}
    </>
  );
};

export default HUD;
