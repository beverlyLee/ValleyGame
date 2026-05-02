import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';

interface SkillsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const SkillsPanel: React.FC<SkillsPanelProps> = ({ visible, onClose }) => {
  const [playerLevel, setPlayerLevel] = useState(gameStore.getState().playerLevel);
  const [playerExp, setPlayerExp] = useState(gameStore.getState().playerExp);
  const [expToNextLevel, setExpToNextLevel] = useState(gameStore.getState().expToNextLevel);
  const [playerRank, setPlayerRank] = useState(gameStore.getState().playerRank);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setPlayerLevel(state.playerLevel);
      setPlayerExp(state.playerExp);
      setExpToNextLevel(state.expToNextLevel);
      setPlayerRank(state.playerRank);
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

  const expPercentage = (playerExp / expToNextLevel) * 100;

  const getRankColor = (rank: string): string => {
    const colors: Record<string, string> = {
      '农夫': '#8B4513',
      '学徒': '#228B22',
      '熟练工': '#1E90FF',
      '专家': '#9932CC',
      '大师': '#FFD700'
    };
    return colors[rank] || '#8B4513';
  };

  const getRankBackground = (rank: string): string => {
    const backgrounds: Record<string, string> = {
      '农夫': 'linear-gradient(135deg, #D2B48C 0%, #8B4513 100%)',
      '学徒': 'linear-gradient(135deg, #90EE90 0%, #228B22 100%)',
      '熟练工': 'linear-gradient(135deg, #87CEEB 0%, #1E90FF 100%)',
      '专家': 'linear-gradient(135deg, #DDA0DD 0%, #9932CC 100%)',
      '大师': 'linear-gradient(135deg, #FFFACD 0%, #FFD700 100%)'
    };
    return backgrounds[rank] || 'linear-gradient(135deg, #D2B48C 0%, #8B4513 100%)';
  };

  if (!visible) return null;

  return (
    <div 
      className="skills-panel-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9990,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div 
        className="skills-panel-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#2C3E50',
          borderRadius: '16px',
          padding: '30px',
          minWidth: '400px',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          animation: 'slideIn 0.3s ease',
          border: '3px solid #34495E'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{
            margin: 0,
            color: '#ECF0F1',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            🏆 技能面板
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#95A5A6',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#34495E';
              e.currentTarget.style.color = '#ECF0F1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#95A5A6';
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          background: getRankBackground(playerRank),
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '25px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '60px',
            marginBottom: '10px'
          }}>
            🌟
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#FFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
          }}>
            Lv.{playerLevel}
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#FFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            marginTop: '5px'
          }}>
            {playerRank}
          </div>
        </div>

        <div style={{
          backgroundColor: '#34495E',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}>
            <span style={{
              color: '#ECF0F1',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              ⚡ 经验值
            </span>
            <span style={{
              color: '#F1C40F',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {playerExp} / {expToNextLevel}
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '20px',
            backgroundColor: '#2C3E50',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '2px solid #2C3E50'
          }}>
            <div 
              style={{
                height: '100%',
                width: `${expPercentage}%`,
                background: 'linear-gradient(90deg, #F39C12 0%, #F1C40F 100%)',
                borderRadius: '8px',
                transition: 'width 0.5s ease',
                boxShadow: '0 0 10px rgba(243, 156, 18, 0.5)'
              }}
            />
          </div>
          <div style={{
            marginTop: '10px',
            textAlign: 'center',
            color: '#95A5A6',
            fontSize: '14px'
          }}>
            距离下一级还需要: <strong style={{ color: '#F1C40F' }}>{expToNextLevel - playerExp}</strong> 经验
          </div>
        </div>

        <div style={{
          backgroundColor: '#34495E',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{
            margin: '0 0 15px 0',
            color: '#ECF0F1',
            fontSize: '18px'
          }}>
            📋 等级信息
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '15px'
          }}>
            <div style={{
              backgroundColor: '#2C3E50',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{
                color: '#95A5A6',
                fontSize: '12px',
                marginBottom: '5px'
              }}>
                当前等级
              </div>
              <div style={{
                color: '#3498DB',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                {playerLevel}
              </div>
            </div>
            <div style={{
              backgroundColor: '#2C3E50',
              borderRadius: '8px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{
                color: '#95A5A6',
                fontSize: '12px',
                marginBottom: '5px'
              }}>
                当前头衔
              </div>
              <div style={{
                color: getRankColor(playerRank),
                fontSize: '20px',
                fontWeight: 'bold'
              }}>
                {playerRank}
              </div>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          color: '#95A5A6',
          fontSize: '14px'
        }}>
          💡 收获作物可获得经验值，完成任务可获得额外奖励
        </div>

        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: '#7F8C8D',
          fontSize: '12px'
        }}>
          按 <strong style={{ color: '#ECF0F1' }}>Esc</strong> 关闭
        </div>
      </div>
    </div>
  );
};

const SkillsPanelContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.skillsPanelVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideSkillsPanel();
  };

  return <SkillsPanel visible={visible} onClose={handleClose} />;
};

export default SkillsPanelContainer;
export { SkillsPanel };
