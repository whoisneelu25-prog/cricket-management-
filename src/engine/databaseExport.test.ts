import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllDatabaseExportFiles,
  createZipArchive,
  generateDatabaseValidationReport,
  exportCountriesData,
  exportAllPlayersData,
  exportFormatSquadsData,
} from './databaseExport';

test('buildAllDatabaseExportFiles generates all 10 required JSON files plus validation reports', () => {
  const files = buildAllDatabaseExportFiles();
  const keys = Object.keys(files);

  assert.ok(keys.includes('01_countries.json'));
  assert.ok(keys.includes('02_all_players.json'));
  assert.ok(keys.includes('03_test_squads.json'));
  assert.ok(keys.includes('04_odi_squads.json'));
  assert.ok(keys.includes('05_t20i_squads.json'));
  assert.ok(keys.includes('06_captains_and_vice_captains.json'));
  assert.ok(keys.includes('07_player_roles_and_styles.json'));
  assert.ok(keys.includes('08_tour_squads.json'));
  assert.ok(keys.includes('09_current_playing_xis.json'));
  assert.ok(keys.includes('10_fixtures_and_tours.json'));
  assert.ok(keys.includes('11_validation_report.json'));
  assert.ok(keys.includes('11_validation_report.md'));

  // Verify JSON validity of all .json files
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith('.json')) {
      const parsed = JSON.parse(content);
      assert.ok(parsed && typeof parsed === 'object');
    }
  }
});

test('exportCountriesData and exportAllPlayersData reflect untouched database counts', () => {
  const countries = exportCountriesData();
  assert.equal(countries.totalRegisteredCountries, 12);
  assert.equal(countries.unregisteredCountriesReferencedByPlayers.length, 2); // NAM and USA

  const players = exportAllPlayersData();
  assert.equal(players.totalPlayers, 85);
  assert.equal(players.corePlayersCount, 25);
  assert.equal(players.additionalSquadMembersCount, 60);
});

test('generateDatabaseValidationReport detects duplicate shortNames, missing rosters, pool contamination, and lineup inconsistencies', () => {
  const report = generateDatabaseValidationReport();

  assert.equal(report.summary.totalPlayers, 85);
  assert.ok(report.summary.totalIssuesFound > 0);
  assert.ok(report.missingPlayers.some((i) => i.countryId === 'SRI'));
  assert.ok(report.missingPlayers.some((i) => i.countryId === 'BAN'));
  assert.ok(report.missingPlayers.some((i) => i.countryId === 'IRE'));
  assert.ok(report.missingPlayers.some((i) => i.countryId === 'ZIM'));
  assert.ok(report.incorrectCountryAssignments.some((i) => i.countryId === 'NAM'));
  assert.ok(report.incorrectCountryAssignments.some((i) => i.countryId === 'USA'));
  assert.ok(report.formatLineupInconsistencies.length > 0);
  assert.ok(report.schemaAndTourAnomalies.some((i) => i.id.includes('invalid_bowling_style')));
});

test('createZipArchive builds a valid PKZIP archive with PK header and EOCD signature', () => {
  const files = buildAllDatabaseExportFiles();
  const zip = createZipArchive(files);

  // Local file header starts with PK\x03\x04
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);

  // End of central directory signature PK\x05\x06 at the end (22 bytes before end)
  const eocdOffset = zip.byteLength - 22;
  assert.equal(zip[eocdOffset], 0x50);
  assert.equal(zip[eocdOffset + 1], 0x4b);
  assert.equal(zip[eocdOffset + 2], 0x05);
  assert.equal(zip[eocdOffset + 3], 0x06);
});
