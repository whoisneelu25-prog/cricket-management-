import { Player, MatchFormat } from '../types/cricket';

export type TrainingFocus = 'BATTING' | 'BOWLING' | 'FIELDING' | 'FITNESS' | 'AUTO';

export interface PlayerDevelopmentDelta {
  playerId: string;
  playerName: string;
  focus: TrainingFocus;
  attributeChanged: string;
  ratingBefore: number;
  ratingAfter: number;
  delta: number;
  feedback: 'Improving' | 'Developing steadily' | 'No significant change' | 'At peak performance' | 'Declining';
  message: string;
}

export interface TrainingDayResult {
  updatedPlayers: Player[];
  changes: PlayerDevelopmentDelta[];
  recoveredCount: number;
  newInjuriesCount: number;
}

/**
 * Calculates current overall rating (0-100) from attributes
 */
export function calculateOverallAbility(player: Player): number {
  const isBowler = player.role === 'BOWLER';
  const isAllRounder = player.role === 'ALL_ROUNDER';
  const a = player.attributes;

  if (isBowler) {
    const bowlPower = Math.max(a.pace, a.spin);
    return Math.round((bowlPower * 0.4) + (a.accuracy * 0.25) + (a.wicketTaking * 0.15) + (a.fitness * 0.1) + (a.fielding * 0.1));
  } else if (isAllRounder) {
    const batAvg = (a.technique + a.timing + a.shotSelection) / 3;
    const bowlPower = Math.max(a.pace, a.spin);
    return Math.round((batAvg * 0.35) + (bowlPower * 0.35) + (a.fitness * 0.15) + (a.fielding * 0.15));
  } else {
    // Batter / Keeper
    const batAvg = (a.technique + a.timing + a.shotSelection + a.defense) / 4;
    return Math.round((batAvg * 0.6) + (a.powerHitting * 0.15) + (a.fitness * 0.1) + (a.fielding * 0.15));
  }
}

/**
 * Assigns automatic default training focus based on player role
 */
export function getDefaultTrainingFocus(player: Player): TrainingFocus {
  if (player.role === 'BOWLER') return 'BOWLING';
  if (player.role === 'BATTER' || player.role === 'WICKETKEEPER_BATTER') return 'BATTING';
  if (player.role === 'ALL_ROUNDER') {
    return player.attributes.technique > player.attributes.accuracy ? 'BOWLING' : 'BATTING';
  }
  return 'FITNESS';
}

/**
 * Simulates a training / recovery day for a squad of players
 */
export function processSquadTrainingDay(
  players: Player[],
  trainingAssignments: Record<string, TrainingFocus> = {},
  isMatchDay: boolean = false,
  currentDate: string = new Date().toISOString().split('T')[0]
): TrainingDayResult {
  const changes: PlayerDevelopmentDelta[] = [];
  let recoveredCount = 0;
  let newInjuriesCount = 0;

  const updatedPlayers = players.map((orig) => {
    // Clone player
    const p: Player = JSON.parse(JSON.stringify(orig));

    // Ensure potential and fitness are initialized
    const currentRating = calculateOverallAbility(p);
    if (!p.potential) {
      if (p.age <= 22) p.potential = Math.min(96, Math.max(currentRating + 12, 85));
      else if (p.age <= 26) p.potential = Math.min(95, Math.max(currentRating + 6, 80));
      else if (p.age <= 31) p.potential = Math.max(currentRating + 2, 75);
      else p.potential = currentRating;
    }
    if (p.fitness === undefined) p.fitness = p.attributes.fitness || 85;
    if (p.currentForm === undefined) p.currentForm = p.attributes.currentForm || 80;
    if (p.workloadFatigue === undefined) p.workloadFatigue = 15;

    // 1. Handle Injury Healing
    if (p.isInjured) {
      if (p.injuryDaysRemaining && p.injuryDaysRemaining > 1) {
        p.injuryDaysRemaining -= 1;
        p.workloadFatigue = Math.max(0, p.workloadFatigue - 10);
      } else {
        // Recovered
        p.isInjured = false;
        p.injuryDaysRemaining = 0;
        p.injuryType = undefined;
        p.workloadFatigue = 10;
        recoveredCount++;
      }
      return p;
    }

    // 2. Handle Rest / Workload Recovery
    if (!isMatchDay) {
      // Non-match day -> natural fatigue reduction
      const recoveryRate = Math.round(10 + (p.fitness / 20));
      p.workloadFatigue = Math.max(0, p.workloadFatigue - recoveryRate);
    }

    // 3. Risk of Injury during heavy fatigue
    if (p.workloadFatigue >= 75) {
      const injuryChance = (p.workloadFatigue - 70) * 0.005; // 2.5% to 15%
      if (Math.random() < injuryChance) {
        p.isInjured = true;
        const injuries = [
          { type: 'Hamstring Strain', days: 12, sev: 'MODERATE' as const },
          { type: 'Side Strain', days: 18, sev: 'SEVERE' as const },
          { type: 'Groin Soreness', days: 7, sev: 'MINOR' as const },
          { type: 'Shoulder Impingement', days: 10, sev: 'MODERATE' as const },
          { type: 'Ankle Sprain', days: 14, sev: 'MODERATE' as const },
        ];
        const pick = injuries[Math.floor(Math.random() * injuries.length)];
        p.injuryType = pick.type;
        p.injuryDaysRemaining = pick.days;
        p.injurySeverity = pick.sev;
        newInjuriesCount++;
        return p;
      }
    }

    // On heavy match days, skip skill training
    if (isMatchDay) {
      return p;
    }

    // 4. Player Skill Progression
    const focus = trainingAssignments[p.id] || p.trainingFocus || getDefaultTrainingFocus(p);
    p.trainingFocus = focus;

    // Age growth factor:
    // < 23: Fast learner (1.8x)
    // 23-28: Steady development (1.2x)
    // 29-33: Peak stability (0.5x)
    // 34+: Physical decline risk (-0.8x for pace/stamina, technical stable)
    let ageMultiplier = 1.0;
    if (p.age < 23) ageMultiplier = 1.8;
    else if (p.age <= 28) ageMultiplier = 1.2;
    else if (p.age <= 32) ageMultiplier = 0.5;
    else ageMultiplier = -0.5;

    // Headroom towards potential:
    const abilityGap = p.potential - currentRating;
    const headroomFactor = abilityGap > 0 ? Math.min(1.5, abilityGap / 10) : 0.1;

    // Small daily increment: ~0.08 to 0.2 attribute points per training session
    const increment = +( (0.08 + Math.random() * 0.08) * ageMultiplier * headroomFactor ).toFixed(3);

    let changedAttr = 'technique';
    let feedback: PlayerDevelopmentDelta['feedback'] = 'Developing steadily';

    if (p.age >= 34 && Math.random() < 0.25) {
      // Natural physical decline for veterans
      p.attributes.pace = Math.max(30, +(p.attributes.pace - 0.1).toFixed(2));
      p.attributes.stamina = Math.max(60, +(p.attributes.stamina - 0.1).toFixed(2));
      changedAttr = 'pace & stamina';
      feedback = 'Declining';
    } else if (increment > 0) {
      if (focus === 'BATTING') {
        const sub = Math.random();
        if (sub < 0.35) {
          p.attributes.technique = Math.min(99, +(p.attributes.technique + increment).toFixed(2));
          changedAttr = 'Technique';
        } else if (sub < 0.7) {
          p.attributes.timing = Math.min(99, +(p.attributes.timing + increment).toFixed(2));
          changedAttr = 'Timing';
        } else {
          p.attributes.shotSelection = Math.min(99, +(p.attributes.shotSelection + increment).toFixed(2));
          changedAttr = 'Shot Selection';
        }
      } else if (focus === 'BOWLING') {
        const bStyle = p.bowlingStyle || '';
        const isSpin = bStyle.includes('BREAK') || bStyle.includes('SPIN') || bStyle.includes('SLOW');
        const sub = Math.random();
        if (sub < 0.5) {
          p.attributes.accuracy = Math.min(99, +(p.attributes.accuracy + increment).toFixed(2));
          changedAttr = 'Accuracy';
        } else if (isSpin) {
          p.attributes.spin = Math.min(99, +(p.attributes.spin + increment).toFixed(2));
          changedAttr = 'Spin & Turn';
        } else {
          p.attributes.pace = Math.min(99, +(p.attributes.pace + increment).toFixed(2));
          p.attributes.swing = Math.min(99, +(p.attributes.swing + increment).toFixed(2));
          changedAttr = 'Pace & Swing';
        }
      } else if (focus === 'FIELDING') {
        p.attributes.fielding = Math.min(99, +(p.attributes.fielding + increment * 1.2).toFixed(2));
        p.attributes.catching = Math.min(99, +(p.attributes.catching + increment * 1.2).toFixed(2));
        changedAttr = 'Fielding & Catching';
      } else if (focus === 'FITNESS') {
        p.attributes.fitness = Math.min(99, +(p.attributes.fitness + increment * 1.5).toFixed(2));
        p.attributes.stamina = Math.min(99, +(p.attributes.stamina + increment * 1.2).toFixed(2));
        p.fitness = p.attributes.fitness;
        changedAttr = 'Fitness & Stamina';
      }

      feedback = p.age < 24 ? 'Improving' : abilityGap <= 2 ? 'At peak performance' : 'Developing steadily';
    } else {
      feedback = p.age > 33 ? 'Declining' : 'No significant change';
    }

    // Recompute new ratings
    const newRating = calculateOverallAbility(p);
    p.testRating = Math.min(99, Math.round(p.testRating + (newRating - currentRating) * 0.5));
    p.odiRating = Math.min(99, Math.round(p.odiRating + (newRating - currentRating) * 0.5));
    p.t20Rating = Math.min(99, Math.round(p.t20Rating + (newRating - currentRating) * 0.5));
    p.developmentFeedback = feedback;

    if (Math.abs(increment) >= 0.05) {
      const logEntry = {
        date: currentDate,
        attribute: changedAttr,
        change: +increment.toFixed(2),
        message: `${p.name} completed ${focus.toLowerCase()} drills. ${changedAttr} ${increment > 0 ? '+' : ''}${increment.toFixed(2)} (${feedback}).`,
        ratingBefore: currentRating,
        ratingAfter: newRating,
      };

      if (!p.developmentHistory) p.developmentHistory = [];
      p.developmentHistory.unshift(logEntry);
      if (p.developmentHistory.length > 20) p.developmentHistory.pop();

      changes.push({
        playerId: p.id,
        playerName: p.shortName,
        focus,
        attributeChanged: changedAttr,
        ratingBefore: currentRating,
        ratingAfter: newRating,
        delta: +increment.toFixed(2),
        feedback,
        message: logEntry.message,
      });
    }

    return p;
  });

  return {
    updatedPlayers,
    changes,
    recoveredCount,
    newInjuriesCount,
  };
}

/**
 * Applies workload fatigue after playing a match
 */
export function applyMatchWorkload(player: Player, format: MatchFormat): Player {
  const p: Player = JSON.parse(JSON.stringify(player));
  const fatigueGain = format === 'TEST' ? 22 : format === 'ODI' ? 14 : 9;
  p.workloadFatigue = Math.min(100, (p.workloadFatigue || 15) + fatigueGain);
  return p;
}

