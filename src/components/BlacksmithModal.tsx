import React, { useEffect, useState } from 'react';
import { gameStore } from '../store/useGameStore';

interface ToolItem {
  id: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe';
  name: string;
  description: string;
  icon: string;
}

const toolItems: ToolItem[] = [
  {
    id: 'hoe',
    name: '锄头',
    description: '用于耕地，升级后效率更高',
    icon: '🔨'
  },
  {
    id: 'wateringCan',
    name: '水壶',
    description: '用于浇水，升级后可浇更多地',
    icon: '💧'
  },
  {
    id: 'axe',
    name: '斧头',
    description: '用于伐木，升级后更耐用',
    icon: '🪓'
  },
  {
    id: 'pickaxe',
    name: '镐子',
    description: '用于采矿，升级后更强大',
    icon: '⛏️'
  }
];

interface BlacksmithModalProps {
  visible: boolean;
  onClose: () => void;
}

const getToolName = (level: number): string => {
  if (level === 1) return '普通';
  if (level === 2) return '铜制';
  if (level === 3) return '铁制';
  if (level === 4) return '金制';
  return '铱制';
};

const BlacksmithModal: React.FC<BlacksmithModalProps> = ({ visible, onClose }) => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [tools, setTools] = useState(gameStore.getState().inventory.tools);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setTools(state.inventory.tools);
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

  const getUpgradeCost = (toolId: 'hoe' | 'wateringCan' | 'axe' | 'pickaxe'): number => {
    return gameStore.getState().getToolUpgradeCost(toolId);
  };

  const handleUpgrade = (tool: ToolItem) => {
    const success = gameStore.getState().upgradeTool(tool.id);
    if (success) {
      setMessage(`升级成功！${tool.name} 已升级为 ${getToolName(tools[tool.id] + 1)} 级别`);
    } else {
      setMessage('金币不足！');
    }
    setTimeout(() => setMessage(''), 2000);
  };

  if (!visible) return null;

  return (
    <div className="blacksmith-overlay" onClick={onClose}>
      <div className="blacksmith-modal" onClick={(e) => e.stopPropagation()}>
        <div className="blacksmith-header">
          <h2>🔨 铁匠铺</h2>
          <div className="blacksmith-gold">
            <span>💰 金币: {gold}</span>
          </div>
          <button className="blacksmith-close" onClick={onClose}>✕</button>
        </div>

        {message && (
          <div className={`blacksmith-message ${message.includes('成功') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="blacksmith-items">
          {toolItems.map((tool) => {
            const currentLevel = tools[tool.id];
            const cost = getUpgradeCost(tool.id);
            const canUpgrade = gold >= cost;
            const nextLevelName = getToolName(currentLevel + 1);
            const currentLevelName = getToolName(currentLevel);

            return (
              <div key={tool.id} className={`blacksmith-item ${!canUpgrade ? 'disabled' : ''}`}>
                <div className="blacksmith-item-icon">{tool.icon}</div>
                <div className="blacksmith-item-info">
                  <h3 className="blacksmith-item-name">{tool.name}</h3>
                  <p className="blacksmith-item-desc">{tool.description}</p>
                  <div className="blacksmith-item-level">
                    <span>当前级别: {currentLevelName} (Lv.{currentLevel})</span>
                    <span className="blacksmith-item-next">→ {nextLevelName}</span>
                  </div>
                </div>
                <div className="blacksmith-item-action">
                  <div className="blacksmith-item-price">
                    <span>💰 {cost} 金币</span>
                  </div>
                  <button
                    className={`blacksmith-item-upgrade ${!canUpgrade ? 'disabled' : ''}`}
                    onClick={() => handleUpgrade(tool)}
                    disabled={!canUpgrade}
                  >
                    {canUpgrade ? '升级' : '金币不足'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="blacksmith-footer">
          <span className="blacksmith-hint">按 Esc 关闭</span>
        </div>
      </div>
    </div>
  );
};

const BlacksmithModalContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.blacksmithVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideBlacksmith();
  };

  return <BlacksmithModal visible={visible} onClose={handleClose} />;
};

export default BlacksmithModalContainer;
export { BlacksmithModal };
