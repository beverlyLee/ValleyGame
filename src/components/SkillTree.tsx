import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';

interface FarmingSkill {
  level: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface SkillTreeProps {
  visible: boolean;
  onClose: () => void;
}

const SkillTree: React.FC<SkillTreeProps> = ({ visible, onClose }) => {
  const [playerLevel, setPlayerLevel] = useState(gameStore.getState().playerLevel);
  const [playerExp, setPlayerExp] = useState(gameStore.getState().playerExp);
  const [expToNextLevel, setExpToNextLevel] = useState(gameStore.getState().expToNextLevel);
  const [playerRank, setPlayerRank] = useState(gameStore.getState().playerRank);
  const [skills, setSkills] = useState<FarmingSkill[]>([]);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setPlayerLevel(state.playerLevel);
      setPlayerExp(state.playerExp);
      setExpToNextLevel(state.expToNextLevel);
      setPlayerRank(state.playerRank);
      setSkills(state.getFarmingSkills());
    });
    setSkills(gameStore.getState().getFarmingSkills());
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

  if (!visible) return null;

  return (
    <div
      className="skill-tree-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9990,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="skill-tree-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '20px',
          padding: '30px',
          minWidth: '500px',
          maxWidth: '600px',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.6)',
          animation: 'slideIn 0.3s ease',
          border: '2px solid #3d3d5c',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '25px',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#ECF0F1',
              fontSize: '28px',
              fontWeight: 'bold',
            }}
          >
            🌳 农业技能树
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#95A5A6',
              fontSize: '28px',
              cursor: 'pointer',
              padding: '5px 10px',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3d3d5c';
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

        <div
          style={{
            background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '25px',
            border: '1px solid #3d3d5c',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
              }}
            >
              <div
                style={{
                  fontSize: '50px',
                  filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))',
                }}
              >
                🌟
              </div>
              <div>
                <div
                  style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: '#FFD700',
                    textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
                  }}
                >
                  Lv.{playerLevel}
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: getRankColor(playerRank),
                    marginTop: '5px',
                  }}
                >
                  {playerRank}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#0f0f1a',
              borderRadius: '12px',
              padding: '15px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span
                style={{
                  color: '#BDC3C7',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                ⚡ 经验值进度
              </span>
              <span
                style={{
                  color: '#F1C40F',
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                {playerExp} / {expToNextLevel}
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '24px',
                backgroundColor: '#1a1a2e',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '2px solid #3d3d5c',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${expPercentage}%`,
                  background: 'linear-gradient(90deg, #F39C12 0%, #E67E22 50%, #F1C40F 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.5s ease',
                  boxShadow: '0 0 15px rgba(243, 156, 18, 0.5)',
                }}
              />
            </div>
            <div
              style={{
                marginTop: '10px',
                textAlign: 'center',
                color: '#7F8C8D',
                fontSize: '13px',
              }}
            >
              距离下一级还需要:{' '}
              <strong style={{ color: '#F1C40F' }}>
                {expToNextLevel - playerExp}
              </strong>{' '}
              经验
            </div>
          </div>
        </div>

        <div
          style={{
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              margin: '0 0 15px 0',
              color: '#ECF0F1',
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            📜 可解锁技能
          </h3>

          <div
            style={{
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '30px',
                top: '0',
                bottom: '0',
                width: '3px',
                background: 'linear-gradient(180deg, #3d3d5c 0%, #3d3d5c 100%)',
                borderRadius: '2px',
              }}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}
            >
              {skills.map((skill, index) => (
                <div
                  key={skill.level}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      backgroundColor: skill.unlocked
                        ? 'rgba(46, 204, 113, 0.2)'
                        : 'rgba(52, 73, 94, 0.5)',
                      border: skill.unlocked
                        ? '3px solid #2ECC71'
                        : '3px solid #3d3d5c',
                      zIndex: 1,
                      boxShadow: skill.unlocked
                        ? '0 0 20px rgba(46, 204, 113, 0.4)'
                        : 'none',
                      opacity: skill.unlocked ? 1 : 0.6,
                    }}
                  >
                    {skill.icon}
                  </div>

                  <div
                    style={{
                      flex: 1,
                      backgroundColor: skill.unlocked
                        ? 'rgba(46, 204, 113, 0.1)'
                        : 'rgba(52, 73, 94, 0.3)',
                      borderRadius: '12px',
                      padding: '15px 20px',
                      border: skill.unlocked
                        ? '2px solid rgba(46, 204, 113, 0.4)'
                        : '2px solid #3d3d5c',
                      opacity: skill.unlocked ? 1 : 0.7,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '5px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '16px',
                            fontWeight: 'bold',
                            color: skill.unlocked ? '#2ECC71' : '#7F8C8D',
                          }}
                        >
                          {skill.name}
                        </span>
                        {skill.unlocked && (
                          <span
                            style={{
                              color: '#2ECC71',
                              fontSize: '14px',
                            }}
                          >
                            ✅ 已解锁
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          color: skill.unlocked ? '#F1C40F' : '#7F8C8D',
                          backgroundColor: skill.unlocked
                            ? 'rgba(241, 196, 15, 0.15)'
                            : 'rgba(52, 73, 94, 0.5)',
                          padding: '4px 12px',
                          borderRadius: '20px',
                        }}
                      >
                        Lv.{skill.level}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        color: skill.unlocked ? '#BDC3C7' : '#7F8C8D',
                        lineHeight: '1.5',
                      }}
                    >
                      {skill.description}
                    </p>
                  </div>

                  {index < skills.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '29px',
                        top: '60px',
                        width: '4px',
                        height: '30px',
                        background: skills[index + 1]?.unlocked
                          ? '#2ECC71'
                          : '#3d3d5c',
                        borderRadius: '2px',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '15px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'rgba(52, 152, 219, 0.1)',
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              border: '1px solid rgba(52, 152, 219, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                marginBottom: '5px',
              }}
            >
              🔨
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#3498DB',
                fontWeight: 'bold',
              }}
            >
              锄地范围
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#ECF0F1',
                fontWeight: 'bold',
                marginTop: '3px',
              }}
            >
              {gameStore.getState().getHoeTillingRange()} 格
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(155, 89, 182, 0.1)',
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              border: '1px solid rgba(155, 89, 182, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                marginBottom: '5px',
              }}
            >
              🌱
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#9B59B6',
                fontWeight: 'bold',
              }}
            >
              高品质概率
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#ECF0F1',
                fontWeight: 'bold',
                marginTop: '3px',
              }}
            >
              x{gameStore.getState().getQualityProbabilityMultiplier()}
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(46, 204, 113, 0.1)',
              borderRadius: '12px',
              padding: '15px',
              textAlign: 'center',
              border: '1px solid rgba(46, 204, 113, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                marginBottom: '5px',
              }}
            >
              ⚡
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#2ECC71',
                fontWeight: 'bold',
              }}
            >
              生长速度
            </div>
            <div
              style={{
                fontSize: '18px',
                color: '#ECF0F1',
                fontWeight: 'bold',
                marginTop: '3px',
              }}
            >
              {Math.round(
                (gameStore.getState().getGrowthSpeedMultiplier() - 1) * 100
              )}
              % 加成
            </div>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            color: '#7F8C8D',
            fontSize: '13px',
          }}
        >
          💡 收获作物可获得经验值，达到特定等级解锁新技能
        </div>
        <div
          style={{
            textAlign: 'center',
            color: '#5D6D7E',
            fontSize: '12px',
            marginTop: '10px',
          }}
        >
          按 <strong style={{ color: '#BDC3C7' }}>Esc</strong> 或点击外部关闭
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

const SkillTreeContainer: React.FC = () => {
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

  return <SkillTree visible={visible} onClose={handleClose} />;
};

export default SkillTreeContainer;
export { SkillTree };
