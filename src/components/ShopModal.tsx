import React, { useEffect, useState } from 'react';
import { gameStore } from '../store/useGameStore';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  amount: number;
}

const shopItems: ShopItem[] = [
  {
    id: 'seed_1',
    name: '普通种子',
    description: '基础农作物种子，种植后可收获作物',
    price: 10,
    icon: '🌱',
    amount: 1
  },
  {
    id: 'seed_5',
    name: '种子包 (5个)',
    description: '包含5个普通种子，更划算的选择',
    price: 45,
    icon: '🌱',
    amount: 5
  },
  {
    id: 'seed_10',
    name: '种子袋 (10个)',
    description: '大量种子，适合大规模种植',
    price: 80,
    icon: '🌱',
    amount: 10
  }
];

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
}

const ShopModal: React.FC<ShopModalProps> = ({ visible, onClose }) => {
  const [gold, setGold] = useState(gameStore.getState().gold);
  const [seeds, setSeeds] = useState(gameStore.getState().inventory.seeds);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setGold(state.gold);
      setSeeds(state.inventory.seeds);
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

  const handleBuy = (item: ShopItem) => {
    const success = gameStore.getState().buySeeds(item.amount, item.price);
    if (success) {
      setMessage(`购买成功！获得 ${item.amount} 个种子`);
      setTimeout(() => setMessage(''), 2000);
    } else {
      setMessage('金币不足！');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  if (!visible) return null;

  return (
    <div className="shop-overlay" onClick={onClose}>
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <h2>🏪 杂货商店</h2>
          <div className="shop-gold">
            <span>💰 金币: {gold}</span>
            <span className="shop-seeds">🌱 种子: {seeds}</span>
          </div>
          <button className="shop-close" onClick={onClose}>✕</button>
        </div>

        {message && (
          <div className={`shop-message ${message.includes('成功') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="shop-items">
          {shopItems.map((item) => {
            const canAfford = gold >= item.price;
            return (
              <div key={item.id} className={`shop-item ${!canAfford ? 'disabled' : ''}`}>
                <div className="shop-item-icon">{item.icon}</div>
                <div className="shop-item-info">
                  <h3 className="shop-item-name">{item.name}</h3>
                  <p className="shop-item-desc">{item.description}</p>
                  <div className="shop-item-price">
                    <span>💰 {item.price} 金币</span>
                    <span className="shop-item-amount">x{item.amount}</span>
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
