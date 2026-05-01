import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';

const HUD: React.FC = () => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [seeds, setSeeds] = useState(gameStore.getState().inventory.seeds);
  
  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setSeeds(state.inventory.seeds);
    });
    
    return unsubscribe;
  }, []);
  
  return (
    <div className="hud">
      <div className="hud-item">
        <span className="hud-label">金币:</span>
        <span className="hud-value">{gold}</span>
      </div>
      <div className="hud-item">
        <span className="hud-label">种子:</span>
        <span className="hud-value">{seeds}</span>
      </div>
    </div>
  );
};

export default HUD;
