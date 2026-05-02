import React, { useEffect, useState } from 'react';
import { gameStore } from '../store/useGameStore';
import { 
  CROPS_CONFIG, 
  getCropsBySeason, 
  type CropType
} from '../game/config/CropsConfig';
import { SEASON_NAMES, type Season } from '../game/systems/TimeSystem';

interface CropSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SelectableCrop {
  type: CropType;
  name: string;
  icon: string;
  count: number;
  allowedSeasons: string;
  growthDays: number;
  sellPrice: number;
}

const CropSelectionModal: React.FC<CropSelectionModalProps> = ({ visible, onClose }) => {
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [selectableCrops, setSelectableCrops] = useState<SelectableCrop[]>([]);

  useEffect(() => {
    const updateSelectableCrops = () => {
      const state = gameStore.getState();
      const season = state.timeState?.season || null;
      setCurrentSeason(season);

      if (!season) {
        setSelectableCrops([]);
        return;
      }

      const cropsInSeason = getCropsBySeason(season);
      const crops: SelectableCrop[] = [];

      for (const crop of cropsInSeason) {
        const count = state.getSeedCount(crop.id);
        if (count > 0) {
          const seasonNames = crop.allowedSeasons.map(s => SEASON_NAMES[s]).join('、');
          crops.push({
            type: crop.id,
            name: crop.name,
            icon: crop.icon,
            count,
            allowedSeasons: seasonNames,
            growthDays: crop.growthDays,
            sellPrice: crop.sellPrice
          });
        }
      }

      setSelectableCrops(crops);
    };

    updateSelectableCrops();

    const unsubscribe = gameStore.subscribe(() => {
      updateSelectableCrops();
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

  const handleSelectCrop = (cropType: CropType) => {
    const state = gameStore.getState();
    const tile = state.targetPlantingTile;
    
    if (!tile) return;

    const seedCount = state.getSeedCount(cropType);
    if (seedCount <= 0) {
      state.showNotification('⚠️ 没有该类型的种子了！');
      return;
    }

    const cropConfig = CROPS_CONFIG[cropType];
    state.showNotification(`🌱 种植了 ${cropConfig?.name || cropType}！`);
    state.plantSelectedCrop(cropType);
  };

  if (!visible) return null;

  const seasonName = currentSeason ? SEASON_NAMES[currentSeason] : '未知';
  const hasSelectableCrops = selectableCrops.length > 0;

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2>🌱 选择作物</h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <span>🌤️ 当前季节: <strong style={{ color: '#3498DB' }}>{seasonName}</strong></span>
            <span style={{ color: '#95A5A6' }}>|</span>
            <span>📦 可选作物: <strong style={{ color: hasSelectableCrops ? '#27AE60' : '#E74C3C' }}>
              {selectableCrops.length} 种
            </strong></span>
          </div>
          <button className="shop-close" onClick={onClose}>✕</button>
        </div>

        {!hasSelectableCrops ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 40px',
            color: '#95A5A6'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>😢</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#E74C3C' }}>当前季节没有可种植的作物</h3>
            <p style={{ margin: 0, textAlign: 'center', lineHeight: '1.6' }}>
              请去商店购买适合 <strong style={{ color: '#3498DB' }}>{seasonName}</strong> 种植的种子。
              <br />
              不同的季节有不同的作物可以种植哦！
            </p>
          </div>
        ) : (
          <>
            <div style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              margin: '0 20px 10px',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#95A5A6'
            }}>
              💡 提示：点击下方的作物卡片进行种植。每种作物只能在特定季节种植。
            </div>

            <div className="shop-items">
              {selectableCrops.map((crop) => (
                <div 
                  key={crop.type}
                  className="shop-item"
                  style={{
                    cursor: 'pointer',
                    border: '2px solid rgba(52, 152, 219, 0.3)',
                    backgroundColor: 'rgba(52, 152, 219, 0.05)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => handleSelectCrop(crop.type)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(52, 152, 219, 0.8)';
                    e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(52, 152, 219, 0.3)';
                    e.currentTarget.style.backgroundColor = 'rgba(52, 152, 219, 0.05)';
                  }}
                >
                  <div className="shop-item-icon" style={{
                    fontSize: '40px',
                    minWidth: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {crop.icon}
                  </div>
                  <div className="shop-item-info" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 className="shop-item-name" style={{ margin: 0 }}>{crop.name}</h3>
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#27AE60',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        📦 库存: {crop.count}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      fontSize: '12px', 
                      color: '#95A5A6',
                      flexWrap: 'wrap'
                    }}>
                      <span>🗓️ 季节: <strong style={{ color: '#3498DB' }}>{crop.allowedSeasons}</strong></span>
                      <span>⏱️ 生长: <strong style={{ color: '#F39C12' }}>{crop.growthDays}天</strong></span>
                      <span>💰 售价: <strong style={{ color: '#27AE60' }}>{crop.sellPrice}金币</strong></span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '80px'
                  }}>
                    <div style={{
                      padding: '10px 20px',
                      backgroundColor: '#3498DB',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      种植
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="shop-footer">
          <span className="shop-hint">按 Esc 关闭 | 点击作物卡片进行种植</span>
        </div>
      </div>
    </div>
  );
};

const CropSelectionModalContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.cropSelectionVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideCropSelection();
  };

  return <CropSelectionModal visible={visible} onClose={handleClose} />;
};

export default CropSelectionModalContainer;
export { CropSelectionModal };
