import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewCareerSave } from '../store/careerStore';
import {
  stepMatchInnings,
  stepMatchBall,
  isTerminalMatchStatus,
  isPreMatchStatus,
  createInitialInningsState,
  ensureMatchTacticalSystemsInitialized,
} from './matchEngine';
import { INTERNATIONAL_TEAMS } from '../data/teams';

test('MATCH ENGINE FIXES: Toss, Innings Transitions & Completed Match Retention', async (t) => {
  await t.test('1. Test Match simulates through all 4 innings without premature completion or toss loop', () => {
    const career = createNewCareerSave('IND', 'Gautam Gambhir', 'TEST');
    const fixture = career.fixtures.find((f) => f.format === 'TEST');
    assert.ok(fixture, 'Test fixture must exist');

    const homeTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.homeTeamId)!;
    const awayTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.awayTeamId)!;

    const inn1 = createInitialInningsState(
      1,
      homeTeam.id,
      homeTeam.name,
      awayTeam.id,
      awayTeam.name,
      fixture.homeXI,
      fixture.awayXI,
      undefined,
      { format: 'TEST', pitch: fixture.pitch, weather: fixture.weather }
    );

    let match = ensureMatchTacticalSystemsInitialized({
      ...fixture,
      status: 'IN_PROGRESS',
      tossWinnerId: homeTeam.id,
      tossChoice: 'BAT',
      currentInningsIndex: 0,
      innings: [inn1],
      dayNumber: 1,
      sessionNumber: 1,
      oversBowledToday: 0,
    });

    // Innings 1
    match = stepMatchInnings(match);
    assert.equal(match.status, 'IN_PROGRESS', 'Match must remain IN_PROGRESS after Innings 1');
    assert.equal(match.innings[0].isCompleted, true, 'Innings 1 must be marked completed');

    // Innings 2
    match = stepMatchInnings(match);
    assert.equal(match.status, 'IN_PROGRESS', 'Match must remain IN_PROGRESS after Innings 2');
    assert.ok(match.innings[1]?.isCompleted, 'Innings 2 must be marked completed');

    // Innings 3
    match = stepMatchInnings(match);
    assert.ok(match.innings.length >= 3, 'Innings 3 must have been created');
    assert.ok(match.innings[2]?.isCompleted, 'Innings 3 must be marked completed');

    // Innings 4 (or innings victory)
    match = stepMatchInnings(match);
    assert.ok(isTerminalMatchStatus(match.status), 'Match must reach terminal status after full Test');
    assert.ok(match.resultText, 'Result text must be populated');
  });

  await t.test('2. ODI Match simulates through 2 innings and reaches COMPLETED with winner and POTM', () => {
    const career = createNewCareerSave('IND', 'Gautam Gambhir', 'TEST');
    const fixture = career.fixtures.find((f) => f.format === 'ODI');
    assert.ok(fixture, 'ODI fixture must exist');

    const homeTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.homeTeamId)!;
    const awayTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.awayTeamId)!;

    const inn1 = createInitialInningsState(
      1,
      homeTeam.id,
      homeTeam.name,
      awayTeam.id,
      awayTeam.name,
      fixture.homeXI,
      fixture.awayXI,
      undefined,
      { format: 'ODI', pitch: fixture.pitch, weather: fixture.weather, allocatedOvers: 50 }
    );

    let match = ensureMatchTacticalSystemsInitialized({
      ...fixture,
      status: 'IN_PROGRESS',
      tossWinnerId: homeTeam.id,
      tossChoice: 'BAT',
      currentInningsIndex: 0,
      innings: [inn1],
    });

    // Innings 1
    match = stepMatchInnings(match);
    assert.equal(match.status, 'IN_PROGRESS', 'Status must be IN_PROGRESS after Innings 1');
    assert.equal(match.innings[0].isCompleted, true);

    // Innings 2
    match = stepMatchInnings(match);
    assert.ok(isTerminalMatchStatus(match.status), 'Match must be COMPLETED or TIE after Innings 2');
    assert.equal(match.innings.length, 2, 'ODI must contain exactly 2 innings');
    assert.ok((match.resultText || '').length > 0, 'Must have official result text');
    assert.ok(match.playerOfTheMatch, 'Must assign Player of the Match');
  });

  await t.test('3. T20I Match simulates through 2 innings correctly without resetting to toss', () => {
    const career = createNewCareerSave('IND', 'Gautam Gambhir', 'TEST');
    const fixture = career.fixtures.find((f) => f.format === 'T20I');
    assert.ok(fixture, 'T20I fixture must exist');

    const homeTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.homeTeamId)!;
    const awayTeam = INTERNATIONAL_TEAMS.find((tm) => tm.id === fixture.awayTeamId)!;

    const inn1 = createInitialInningsState(
      1,
      homeTeam.id,
      homeTeam.name,
      awayTeam.id,
      awayTeam.name,
      fixture.homeXI,
      fixture.awayXI,
      undefined,
      { format: 'T20I', pitch: fixture.pitch, weather: fixture.weather, allocatedOvers: 20 }
    );

    let match = ensureMatchTacticalSystemsInitialized({
      ...fixture,
      status: 'IN_PROGRESS',
      tossWinnerId: awayTeam.id,
      tossChoice: 'BOWL',
      currentInningsIndex: 0,
      innings: [inn1],
    });

    // Innings 1
    match = stepMatchInnings(match);
    assert.equal(match.status, 'IN_PROGRESS');
    assert.equal(match.innings[0].isCompleted, true);

    // Innings 2
    match = stepMatchInnings(match);
    assert.ok(isTerminalMatchStatus(match.status));
    assert.ok(match.resultText);
  });
});
