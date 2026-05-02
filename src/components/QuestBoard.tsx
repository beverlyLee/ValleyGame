import React, { useState, useEffect } from 'react';
import { gameStore } from '../store/useGameStore';

interface QuestBoardProps {
  visible: boolean;
  onClose: () => void;
}

const getQuestInstructions = (type: string, item: string): string => {
  const instructions: Record<string, string> = {
    'deliver': `📦 【交付任务说明】\n━━━━━━━━━━━━━━━━\n【任务目标】交付 ${item}\n\n【完成方式】\n1. 在农场种植并收获作物\n2. 每次收获作物时，交付进度自动增加\n3. 收获足够数量后，任务自动完成\n\n【详细步骤】\n• 用锄头在空地按 E 键耕地\n• 确保有种子（可在商店购买）\n• 靠近耕地按 E 键播种\n• 等待作物成熟（显示金黄色）\n• 靠近成熟作物按 E 键收获\n• 收获后交付进度+1\n\n【提示】收获和交付是同一过程！收获作物时自动计入交付进度。`,
    'harvest': `🌾 【收获任务说明】\n━━━━━━━━━━━━━━━━\n【任务目标】收获 ${item}\n\n【完成方式】\n1. 种植作物并等待成熟\n2. 作物成熟后显示金黄色\n3. 靠近成熟作物按 E 键收获\n4. 每次收获进度+1\n\n【详细步骤】\n• 用锄头在空地按 E 键耕地\n• 确保有种子（可在商店购买）\n• 靠近耕地按 E 键播种\n• 可用水壶浇水加速生长\n• 等待作物成熟（显示金黄色）\n• 靠近成熟作物按 E 键收获\n\n【提示】成熟的作物会发光或变色，很容易识别！`,
    'plant': `🌱 【种植任务说明】\n━━━━━━━━━━━━━━━━\n【任务目标】种植 ${item}\n\n【完成方式】\n1. 用锄头将空地翻耕为耕地\n2. 确保背包中有种子\n3. 靠近耕地按 E 键播种\n4. 每次播种进度+1\n\n【详细步骤】\n• 选择工具栏中的锄头\n• 靠近空地按 E 键耕地\n• 确保有种子（可在商店购买）\n• 靠近已耕地的地块按 E 键播种\n• 播种成功后进度+1\n\n【提示】必须先耕地才能播种！没有种子请按 B 键打开商店购买。`
  };
  return instructions[type] || '完成任务目标即可';
};

const QuestBoard: React.FC<QuestBoardProps> = ({ visible, onClose }) => {
  const [quests, setQuests] = useState(gameStore.getState().quests);
  const [gold, setGold] = useState(gameStore.getState().gold);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setQuests(state.quests);
      setGold(state.gold);
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

  const handleClaimReward = (questId: string) => {
    gameStore.getState().claimQuestReward(questId);
  };

  const getQuestTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'deliver': '📦',
      'harvest': '🌾',
      'plant': '🌱'
    };
    return icons[type] || '📋';
  };

  const getQuestTypeName = (type: string): string => {
    const names: Record<string, string> = {
      'deliver': '交付',
      'harvest': '收获',
      'plant': '种植'
    };
    return names[type] || '完成';
  };

  const getProgressColor = (current: number, target: number): string => {
    const percentage = (current / target) * 100;
    if (percentage >= 100) return '#27AE60';
    if (percentage >= 50) return '#F39C12';
    return '#3498DB';
  };

  const getItemName = (item: string): string => {
    const names: Record<string, string> = {
      'seed': '种子',
      'crop': '作物',
      '萝卜': '萝卜',
      'carrot': '萝卜'
    };
    return names[item] || item;
  };

  const activeQuests = quests.filter(q => !q.claimed);

  if (!visible) return null;

  return (
    <div 
      className="quest-board-overlay" 
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
        className="quest-board-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#2C3E50',
          borderRadius: '16px',
          padding: '30px',
          minWidth: '550px',
          maxWidth: '650px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          animation: 'slideIn 0.3s ease',
          border: '3px solid #8B4513'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px',
          paddingBottom: '15px',
          borderBottom: '2px solid #8B4513'
        }}>
          <h2 style={{
            margin: 0,
            color: '#DEB887',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            📋 任务板
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <span style={{
              color: '#F1C40F',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              💰 {gold} 金币
            </span>
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
        </div>

        {activeQuests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#95A5A6'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎉</div>
            <p style={{ fontSize: '18px', margin: 0 }}>暂无可用任务</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>所有任务已完成！</p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px'
          }}>
            {activeQuests.map((quest) => {
              const progressPercent = (quest.requirement.current / quest.requirement.target) * 100;
              const isCompleted = quest.completed;
              
              return (
                <div 
                  key={quest.id}
                  style={{
                    backgroundColor: '#34495E',
                    borderRadius: '12px',
                    padding: '20px',
                    border: isCompleted ? '2px solid #27AE60' : '2px solid #34495E',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '12px'
                  }}>
                    <div>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        color: isCompleted ? '#27AE60' : '#ECF0F1',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {isCompleted && '✅'} {quest.title}
                      </h3>
                      <p style={{
                        margin: 0,
                        color: '#95A5A6',
                        fontSize: '14px'
                      }}>
                        {quest.description}
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'right'
                    }}>
                      <div style={{
                        color: '#F1C40F',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        💰 {quest.reward.gold} 金币
                      </div>
                      <div style={{
                        color: '#E74C3C',
                        fontSize: '12px',
                        marginTop: '4px'
                      }}>
                        ⚡ +{quest.reward.exp} 经验
                      </div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#2C3E50',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        color: '#BDC3C7',
                        fontSize: '14px'
                      }}>
                        {getQuestTypeIcon(quest.requirement.type)} {getQuestTypeName(quest.requirement.type)}: {getItemName(quest.requirement.item)}
                      </span>
                      <span style={{
                        color: getProgressColor(quest.requirement.current, quest.requirement.target),
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}>
                        {quest.requirement.current} / {quest.requirement.target}
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#2C3E50',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid #2C3E50'
                    }}>
                      <div 
                        style={{
                          height: '100%',
                          width: `${Math.min(progressPercent, 100)}%`,
                          backgroundColor: getProgressColor(quest.requirement.current, quest.requirement.target),
                          borderRadius: '5px',
                          transition: 'width 0.5s ease'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderLeft: '3px solid #3498DB',
                    borderRadius: '4px',
                    padding: '12px 16px',
                    marginBottom: '12px'
                  }}>
                    <p style={{
                      margin: 0,
                      color: '#85C1E9',
                      fontSize: '13px',
                      lineHeight: '1.7',
                      whiteSpace: 'pre-line'
                    }}>
                      {getQuestInstructions(quest.requirement.type, quest.requirement.item)}
                    </p>
                  </div>

                  {isCompleted && !quest.claimed && (
                    <button
                      onClick={() => handleClaimReward(quest.id)}
                      style={{
                        width: '100%',
                        padding: '12px 20px',
                        backgroundColor: '#27AE60',
                        color: '#FFF',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 6px rgba(39, 174, 96, 0.3)',
                        animation: 'pulse 1.5s infinite'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2ECC71';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#27AE60';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      🎁 领取奖励
                    </button>
                  )}

                  {quest.claimed && (
                    <div style={{
                      textAlign: 'center',
                      padding: '10px',
                      backgroundColor: '#1A1A2E',
                      borderRadius: '8px',
                      color: '#7F8C8D',
                      fontSize: '14px'
                    }}>
                      ✅ 已领取奖励
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            fontSize: '12px',
            color: '#7F8C8D',
            justifyContent: 'center'
          }}>
            <span>🌱 种植任务：耕地 → 播种</span>
            <span>🌾 收获任务：等成熟 → 按 E 键</span>
            <span>📦 交付任务：收获即自动计入</span>
          </div>
        </div>

        <div style={{
          marginTop: '15px',
          textAlign: 'center',
          color: '#7F8C8D',
          fontSize: '12px'
        }}>
          💡 完成任务后可以领取奖励 | 按 <strong style={{ color: '#ECF0F1' }}>Esc</strong> 关闭
        </div>
      </div>
    </div>
  );
};

const QuestBoardContainer: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = gameStore.subscribe((state) => {
      setVisible(state.questBoardVisible);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    gameStore.getState().hideQuestBoard();
  };

  return <QuestBoard visible={visible} onClose={handleClose} />;
};

export default QuestBoardContainer;
export { QuestBoard };
