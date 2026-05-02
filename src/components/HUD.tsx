import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';
import type { TimeState } from '../game/systems/TimeSystem';

const HUD: React.FC = () => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [seeds, setSeeds] = useState(gameStore.getState().inventory.seeds);
  const [crops, setCrops] = useState(gameStore.getState().inventory.crops);
  const [ores, setOres] = useState(gameStore.getState().inventory.ores);
  const [stones, setStones] = useState(gameStore.getState().inventory.stones);
  const [hp, setHp] = useState(gameStore.getState().hp);
  const [maxHp, setMaxHp] = useState(gameStore.getState().maxHp);
  const [timeState, setTimeState] = useState<TimeState | null>(gameStore.getState().timeState);
  const [notificationMessage, setNotificationMessage] = useState(gameStore.getState().notificationMessage);
  const [notificationVisible, setNotificationVisible] = useState(gameStore.getState().notificationVisible);
  
  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setSeeds(state.inventory.seeds);
      setCrops(state.inventory.crops);
      setOres(state.inventory.ores);
      setStones(state.inventory.stones);
      setHp(state.hp);
      setMaxHp(state.maxHp);
      setTimeState(state.timeState);
      setNotificationMessage(state.notificationMessage);
      setNotificationVisible(state.notificationVisible);
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
  
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-label">❤️ 生命值:</span>
        <div style={{ 
          width: '120px', 
          height: '20px', 
          backgroundColor: '#333',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '2px solid #555'
        }}>
          <div style={{ 
            width: `${hpPercent}%`, 
            height: '100%', 
            backgroundColor: hpColor,
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ marginLeft: '8px', color: '#fff', fontWeight: 'bold' }}>
          {hp}/{maxHp}
        </span>
      </div>
      
      <div className="hud-item">
        <span className="hud-label">💰 金币:</span>
        <span className="hud-value">{gold}</span>
      </div>
      
      <div className="hud-item">
        <span className="hud-label">🌱 种子:</span>
        <span className="hud-value">{seeds}</span>
      </div>
      
      <div className="hud-item">
        <span className="hud-label">🌾 作物:</span>
        <span className="hud-value">{crops}</span>
      </div>
      
      <div className="hud-item">
        <span className="hud-label">💎 矿石:</span>
        <span className="hud-value">{ores}</span>
      </div>
      
      <div className="hud-item">
        <span className="hud-label">🪨 石头:</span>
        <span className="hud-value">{stones}</span>
      </div>

      {timeState && (
        <>
          <div className="hud-item">
            <span className="hud-label">⏰ 时间:</span>
            <span className="hud-value">
              第{timeState.day + 1}天 {String(timeState.hour).padStart(2, '0')}:{String(timeState.minute).padStart(2, '0')}
            </span>
          </div>
          
          <div className="hud-item">
            <span className="hud-label">🌤️ 节气:</span>
            <span style={{ 
              color: getSeasonColor(timeState.season),
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {timeState.solarTermName} ({getSeasonName(timeState.season)})
              {timeState.isLanternFestival && ' 🎊 灯会'}
            </span>
          </div>
        </>
      )}

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
    </div>
  );
};

export default HUD;
