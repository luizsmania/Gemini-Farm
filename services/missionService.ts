
import { Mission, Achievement, GameState, CropId, BuildingId, DailyChallenge } from '../types';
import { INITIAL_MISSIONS, INITIAL_ACHIEVEMENTS } from '../constants';

export const initializeMissions = (): Mission[] => {
  return INITIAL_MISSIONS.map(m => ({ ...m }));
};

export const initializeAchievements = (): Achievement[] => {
  return INITIAL_ACHIEVEMENTS.map(a => ({ ...a }));
};

export const initializeStatistics = (): GameState['statistics'] => {
  return {
    totalHarvested: {},
    totalEarned: 0,
    totalSpent: 0,
    cropsPlanted: 0,
    buildingsBuilt: 0,
    decorationsPlaced: 0,
    questsCompleted: 0,
    missionsCompleted: 0,
    playTime: 0,
    levelReached: 1,
    highestCoins: 0
  };
};

export const generateDailyChallenge = (): DailyChallenge => {
  const types: DailyChallenge['type'][] = ['harvest', 'sell', 'earn'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  let title = '';
  let description = '';
  let target = 0;
  
  switch (type) {
    case 'harvest':
      title = 'Daily Harvest';
      description = 'Harvest crops today!';
      target = 20 + Math.floor(Math.random() * 30); // 20-50
      break;
    case 'sell':
      title = 'Daily Sales';
      description = 'Sell items today!';
      target = 10 + Math.floor(Math.random() * 20); // 10-30
      break;
    case 'earn':
      title = 'Daily Earnings';
      description = 'Earn coins today!';
      target = 500 + Math.floor(Math.random() * 1000); // 500-1500
      break;
  }
  
  return {
    id: `daily_${Date.now()}`,
    title,
    description,
    type,
    target,
    current: 0,
    rewardMultiplier: 1.5,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    completed: false
  };
};

export const checkMissionProgress = (
  missions: Mission[],
  gameState: GameState
): { updatedMissions: Mission[]; completedMissions: Mission[] } => {
  const updatedMissions = missions.map(mission => {
    if (mission.completed || !mission.unlocked) return mission;
    
    let current = mission.current;
    
    switch (mission.type) {
      case 'harvest':
        if (mission.itemId) {
          current = gameState.statistics.totalHarvested[mission.itemId] || 0;
        } else {
          current = Object.values(gameState.statistics.totalHarvested).reduce((a, b) => a + b, 0);
        }
        break;
      case 'sell':
        if (mission.itemId) {
          // Would need to track sold items separately, for now use harvested
          current = gameState.statistics.totalHarvested[mission.itemId] || 0;
        } else {
          current = Object.values(gameState.statistics.totalHarvested).reduce((a, b) => a + b, 0);
        }
        break;
      case 'level':
        current = gameState.level;
        break;
      case 'build':
        if (mission.buildingId) {
          current = gameState.plots.filter(p => p.buildingId === mission.buildingId).length;
        } else {
          current = gameState.statistics.buildingsBuilt;
        }
        break;
      case 'earn':
        current = gameState.statistics.totalEarned;
        break;
      case 'collect':
        if (mission.itemId === 'plots') {
          current = gameState.plots.length;
        } else if (mission.itemId) {
          // For other collect missions, check harvested items
          current = gameState.harvested[mission.itemId] || 0;
        }
        break;
    }
    
    const completed = current >= mission.target;
    const wasCompleted = mission.completed;
    
    // Unlock next tier missions when completing a mission
    let shouldUnlockNextTier = false;
    if (completed && !wasCompleted && mission.tier < 5) {
      shouldUnlockNextTier = true;
    }
    
    return {
      ...mission,
      current: Math.min(current, mission.target),
      completed
    };
  });
  
  // Unlock next tier missions
  const completedMissions = updatedMissions.filter(m => m.completed && !missions.find(om => om.id === m.id && om.completed));
  if (completedMissions.length > 0) {
    const maxCompletedTier = Math.max(...completedMissions.map(m => m.tier));
    updatedMissions.forEach(mission => {
      if (mission.tier === maxCompletedTier + 1 && !mission.unlocked) {
        mission.unlocked = true;
      }
    });
  }
  
  return { updatedMissions, completedMissions };
};

export const checkAchievementProgress = (
  achievements: Achievement[],
  gameState: GameState
): { updatedAchievements: Achievement[]; completedAchievements: Achievement[] } => {
  const updatedAchievements = achievements.map(achievement => {
    if (achievement.unlocked) return achievement;
    
    let current = 0;
    
    switch (achievement.category) {
      case 'harvest':
        current = Object.values(gameState.statistics.totalHarvested).reduce((a, b) => a + b, 0);
        break;
      case 'money':
        current = gameState.statistics.totalEarned;
        break;
      case 'level':
        current = gameState.level;
        break;
      case 'buildings':
        current = gameState.statistics.buildingsBuilt;
        break;
      case 'decorations':
        current = gameState.statistics.decorationsPlaced;
        break;
      case 'special':
        if (achievement.id === 'complete_10_quests') {
          current = gameState.statistics.questsCompleted;
        }
        break;
    }
    
    const unlocked = current >= achievement.requirement;
    
    return {
      ...achievement,
      current: Math.min(current, achievement.requirement),
      unlocked
    };
  });
  
  const completedAchievements = updatedAchievements.filter(a => a.unlocked && !achievements.find(oa => oa.id === a.id && oa.unlocked));
  
  return { updatedAchievements, completedAchievements };
};

export const checkDailyChallengeProgress = (
  challenge: DailyChallenge | null,
  gameState: GameState
): DailyChallenge | null => {
  if (!challenge || challenge.completed || Date.now() > challenge.expiresAt) {
    return null;
  }
  
  let current = 0;
  
  switch (challenge.type) {
    case 'harvest':
      current = Object.values(gameState.statistics.totalHarvested).reduce((a, b) => a + b, 0);
      break;
    case 'sell':
      // Approximate from total earned
      current = Math.floor(gameState.statistics.totalEarned / 10);
      break;
    case 'earn':
      current = gameState.statistics.totalEarned;
      break;
  }
  
  return {
    ...challenge,
    current: Math.min(current, challenge.target),
    completed: current >= challenge.target
  };
};

