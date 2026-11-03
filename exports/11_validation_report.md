# International Cricket Manager — Database Validation Report
Generated At: 2026-11-02T18:59:16.907Z

## 1. Executive Summary
- **Registered Countries (`INTERNATIONAL_TEAMS`)**: 12
- **Countries Referenced by Players**: 14
- **Total Players in `ALL_PLAYERS`**: 75 (25 in `players.ts` + 50 in `squads.ts`)
  - Active Men's Players: **68**
  - Active Women's Players: **2**
  - Historical Legends: **4**
  - Retired Players: **1**
- **Total Validation Findings**: **103** (86 High, 10 Medium, 7 Low)

## 2. Country-by-Country Roster Audit
| Country | Code | In Teams Table | Total Players | Active Men | Legends/Retired | Women | Active Men Eligible (TEST / ODI / T20I) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| India | `IND` | Yes | 21 | 18 | 2 | 1 | 13 / 16 / 16 | **COMPLETE** |
| Australia | `AUS` | Yes | 15 | 13 | 1 | 1 | 10 / 12 / 11 | **INCOMPLETE_SQUAD** |
| England | `ENG` | Yes | 10 | 10 | 0 | 0 | 8 / 9 / 8 | **INCOMPLETE_SQUAD** |
| South Africa | `RSA` | Yes | 8 | 8 | 0 | 0 | 6 / 8 / 8 | **INCOMPLETE_SQUAD** |
| New Zealand | `NZL` | Yes | 6 | 6 | 0 | 0 | 6 / 6 / 6 | **INCOMPLETE_SQUAD** |
| Pakistan | `PAK` | Yes | 8 | 7 | 1 | 0 | 6 / 6 / 6 | **INCOMPLETE_SQUAD** |
| West Indies | `WIN` | Yes | 1 | 0 | 1 | 0 | 0 / 0 / 0 | **INCOMPLETE_SQUAD** |
| Sri Lanka | `SRI` | Yes | 0 | 0 | 0 | 0 | 0 / 0 / 0 | **EMPTY_ROSTER** |
| Afghanistan | `AFG` | Yes | 4 | 4 | 0 | 0 | 4 / 4 / 4 | **INCOMPLETE_SQUAD** |
| Bangladesh | `BAN` | Yes | 0 | 0 | 0 | 0 | 0 / 0 / 0 | **EMPTY_ROSTER** |
| Ireland | `IRE` | Yes | 0 | 0 | 0 | 0 | 0 / 0 / 0 | **EMPTY_ROSTER** |
| Zimbabwe | `ZIM` | Yes | 0 | 0 | 0 | 0 | 0 / 0 / 0 | **EMPTY_ROSTER** |
| Namibia | `NAM` | NO | 1 | 1 | 0 | 0 | 0 / 1 / 1 | **UNREGISTERED_COUNTRY** |
| United States | `USA` | NO | 1 | 1 | 0 | 0 | 0 / 1 / 1 | **UNREGISTERED_COUNTRY** |

## 3. Duplicate Players & Name Collisions (0)
No issues detected in this category.

## 4. Missing Players & Incomplete National Pools (30)
### 1. [HIGH] Australia (AUS) has only 13 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_AUS`
- **Country**: `AUS`
- **Details**: Australia has 15 total players (13 active male, 1 legends, 0 retired, 1 female). Active male eligible counts: TEST=10, ODI=12, T20I=11.
- **Recommendation**: Expand Australia's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 2. [HIGH] Australia (AUS) cannot field 11 active male players in TEST (only 10 available)
- **Issue ID**: `missing_xi_AUS_TEST`
- **Country**: `AUS`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Australia only has 10 active male players eligible for TEST (short by 1 players just for a starting XI).
- **Recommendation**: Add 5 more TEST-eligible active players for Australia.

### 3. [HIGH] England (ENG) has only 10 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_ENG`
- **Country**: `ENG`
- **Details**: England has 10 total players (10 active male, 0 legends, 0 retired, 0 female). Active male eligible counts: TEST=8, ODI=9, T20I=8.
- **Recommendation**: Expand England's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 4. [HIGH] England (ENG) cannot field 11 active male players in TEST (only 8 available)
- **Issue ID**: `missing_xi_ENG_TEST`
- **Country**: `ENG`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently England only has 8 active male players eligible for TEST (short by 3 players just for a starting XI).
- **Recommendation**: Add 7 more TEST-eligible active players for England.

### 5. [HIGH] England (ENG) cannot field 11 active male players in ODI (only 9 available)
- **Issue ID**: `missing_xi_ENG_ODI`
- **Country**: `ENG`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently England only has 9 active male players eligible for ODI (short by 2 players just for a starting XI).
- **Recommendation**: Add 6 more ODI-eligible active players for England.

### 6. [HIGH] England (ENG) cannot field 11 active male players in T20I (only 8 available)
- **Issue ID**: `missing_xi_ENG_T20I`
- **Country**: `ENG`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently England only has 8 active male players eligible for T20I (short by 3 players just for a starting XI).
- **Recommendation**: Add 7 more T20I-eligible active players for England.

### 7. [HIGH] South Africa (RSA) has only 8 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_RSA`
- **Country**: `RSA`
- **Details**: South Africa has 8 total players (8 active male, 0 legends, 0 retired, 0 female). Active male eligible counts: TEST=6, ODI=8, T20I=8.
- **Recommendation**: Expand South Africa's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 8. [HIGH] South Africa (RSA) cannot field 11 active male players in TEST (only 6 available)
- **Issue ID**: `missing_xi_RSA_TEST`
- **Country**: `RSA`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently South Africa only has 6 active male players eligible for TEST (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more TEST-eligible active players for South Africa.

### 9. [HIGH] South Africa (RSA) cannot field 11 active male players in ODI (only 8 available)
- **Issue ID**: `missing_xi_RSA_ODI`
- **Country**: `RSA`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently South Africa only has 8 active male players eligible for ODI (short by 3 players just for a starting XI).
- **Recommendation**: Add 7 more ODI-eligible active players for South Africa.

### 10. [HIGH] South Africa (RSA) cannot field 11 active male players in T20I (only 8 available)
- **Issue ID**: `missing_xi_RSA_T20I`
- **Country**: `RSA`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently South Africa only has 8 active male players eligible for T20I (short by 3 players just for a starting XI).
- **Recommendation**: Add 7 more T20I-eligible active players for South Africa.

### 11. [HIGH] New Zealand (NZL) has only 6 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_NZL`
- **Country**: `NZL`
- **Details**: New Zealand has 6 total players (6 active male, 0 legends, 0 retired, 0 female). Active male eligible counts: TEST=6, ODI=6, T20I=6.
- **Recommendation**: Expand New Zealand's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 12. [HIGH] New Zealand (NZL) cannot field 11 active male players in TEST (only 6 available)
- **Issue ID**: `missing_xi_NZL_TEST`
- **Country**: `NZL`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently New Zealand only has 6 active male players eligible for TEST (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more TEST-eligible active players for New Zealand.

### 13. [HIGH] New Zealand (NZL) cannot field 11 active male players in ODI (only 6 available)
- **Issue ID**: `missing_xi_NZL_ODI`
- **Country**: `NZL`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently New Zealand only has 6 active male players eligible for ODI (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more ODI-eligible active players for New Zealand.

### 14. [HIGH] New Zealand (NZL) cannot field 11 active male players in T20I (only 6 available)
- **Issue ID**: `missing_xi_NZL_T20I`
- **Country**: `NZL`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently New Zealand only has 6 active male players eligible for T20I (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more T20I-eligible active players for New Zealand.

### 15. [HIGH] Pakistan (PAK) has only 7 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_PAK`
- **Country**: `PAK`
- **Details**: Pakistan has 8 total players (7 active male, 1 legends, 0 retired, 0 female). Active male eligible counts: TEST=6, ODI=6, T20I=6.
- **Recommendation**: Expand Pakistan's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 16. [HIGH] Pakistan (PAK) cannot field 11 active male players in TEST (only 6 available)
- **Issue ID**: `missing_xi_PAK_TEST`
- **Country**: `PAK`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Pakistan only has 6 active male players eligible for TEST (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more TEST-eligible active players for Pakistan.

### 17. [HIGH] Pakistan (PAK) cannot field 11 active male players in ODI (only 6 available)
- **Issue ID**: `missing_xi_PAK_ODI`
- **Country**: `PAK`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Pakistan only has 6 active male players eligible for ODI (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more ODI-eligible active players for Pakistan.

### 18. [HIGH] Pakistan (PAK) cannot field 11 active male players in T20I (only 6 available)
- **Issue ID**: `missing_xi_PAK_T20I`
- **Country**: `PAK`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Pakistan only has 6 active male players eligible for T20I (short by 5 players just for a starting XI).
- **Recommendation**: Add 9 more T20I-eligible active players for Pakistan.

### 19. [HIGH] West Indies (WIN) has only 0 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_WIN`
- **Country**: `WIN`
- **Details**: West Indies has 1 total players (0 active male, 1 legends, 0 retired, 0 female). Active male eligible counts: TEST=0, ODI=0, T20I=0.
- **Recommendation**: Expand West Indies's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 20. [HIGH] West Indies (WIN) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_WIN_TEST`
- **Country**: `WIN`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently West Indies only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for West Indies.

### 21. [HIGH] West Indies (WIN) cannot field 11 active male players in ODI (only 0 available)
- **Issue ID**: `missing_xi_WIN_ODI`
- **Country**: `WIN`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently West Indies only has 0 active male players eligible for ODI (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more ODI-eligible active players for West Indies.

### 22. [HIGH] West Indies (WIN) cannot field 11 active male players in T20I (only 0 available)
- **Issue ID**: `missing_xi_WIN_T20I`
- **Country**: `WIN`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently West Indies only has 0 active male players eligible for T20I (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more T20I-eligible active players for West Indies.

### 23. [HIGH] Sri Lanka (SRI) has 0 players in the database
- **Issue ID**: `missing_entire_roster_SRI`
- **Country**: `SRI`
- **Details**: Sri Lanka is registered as an official playable nation in INTERNATIONAL_TEAMS, but has 0 players in ALL_PLAYERS. Selecting Sri Lanka results in empty squads and crashes/empty lineups in match simulation.
- **Recommendation**: Add at least 18-25 active international players across Test, ODI, and T20I formats for Sri Lanka.

### 24. [HIGH] Afghanistan (AFG) has only 4 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_AFG`
- **Country**: `AFG`
- **Details**: Afghanistan has 4 total players (4 active male, 0 legends, 0 retired, 0 female). Active male eligible counts: TEST=4, ODI=4, T20I=4.
- **Recommendation**: Expand Afghanistan's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 25. [HIGH] Afghanistan (AFG) cannot field 11 active male players in TEST (only 4 available)
- **Issue ID**: `missing_xi_AFG_TEST`
- **Country**: `AFG`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Afghanistan only has 4 active male players eligible for TEST (short by 7 players just for a starting XI).
- **Recommendation**: Add 11 more TEST-eligible active players for Afghanistan.

### 26. [HIGH] Afghanistan (AFG) cannot field 11 active male players in ODI (only 4 available)
- **Issue ID**: `missing_xi_AFG_ODI`
- **Country**: `AFG`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Afghanistan only has 4 active male players eligible for ODI (short by 7 players just for a starting XI).
- **Recommendation**: Add 11 more ODI-eligible active players for Afghanistan.

### 27. [HIGH] Afghanistan (AFG) cannot field 11 active male players in T20I (only 4 available)
- **Issue ID**: `missing_xi_AFG_T20I`
- **Country**: `AFG`
- **Format**: `T20I`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Afghanistan only has 4 active male players eligible for T20I (short by 7 players just for a starting XI).
- **Recommendation**: Add 11 more T20I-eligible active players for Afghanistan.

### 28. [HIGH] Bangladesh (BAN) has 0 players in the database
- **Issue ID**: `missing_entire_roster_BAN`
- **Country**: `BAN`
- **Details**: Bangladesh is registered as an official playable nation in INTERNATIONAL_TEAMS, but has 0 players in ALL_PLAYERS. Selecting Bangladesh results in empty squads and crashes/empty lineups in match simulation.
- **Recommendation**: Add at least 18-25 active international players across Test, ODI, and T20I formats for Bangladesh.

### 29. [HIGH] Ireland (IRE) has 0 players in the database
- **Issue ID**: `missing_entire_roster_IRE`
- **Country**: `IRE`
- **Details**: Ireland is registered as an official playable nation in INTERNATIONAL_TEAMS, but has 0 players in ALL_PLAYERS. Selecting Ireland results in empty squads and crashes/empty lineups in match simulation.
- **Recommendation**: Add at least 18-25 active international players across Test, ODI, and T20I formats for Ireland.

### 30. [HIGH] Zimbabwe (ZIM) has 0 players in the database
- **Issue ID**: `missing_entire_roster_ZIM`
- **Country**: `ZIM`
- **Details**: Zimbabwe is registered as an official playable nation in INTERNATIONAL_TEAMS, but has 0 players in ALL_PLAYERS. Selecting Zimbabwe results in empty squads and crashes/empty lineups in match simulation.
- **Recommendation**: Add at least 18-25 active international players across Test, ODI, and T20I formats for Zimbabwe.

## 5. Incorrect Country Assignments & Pool Contamination (9)
### 1. [HIGH] Player 'Gerhard Erasmus' assigned to unregistered country 'NAM' (Namibia)
- **Issue ID**: `unregistered_country_nam_erasmus`
- **Country**: `NAM`
- **Player ID**: `nam_erasmus`
- **Details**: 'NAM' (Namibia) is assigned to player 'Gerhard Erasmus' (nam_erasmus), but 'NAM' does not exist in INTERNATIONAL_TEAMS (which only defines the 12 Full Member nations). As a result, 'Gerhard Erasmus' cannot be filtered by country in DatabaseView or managed as a team.
- **Recommendation**: Either add Associate nations (NAM - Namibia) to INTERNATIONAL_TEAMS or separate Associate teams into a dedicated registry included in country filters.

### 2. [HIGH] Player 'Monank Patel' assigned to unregistered country 'USA' (United States)
- **Issue ID**: `unregistered_country_usa_monank`
- **Country**: `USA`
- **Player ID**: `usa_monank`
- **Details**: 'USA' (United States) is assigned to player 'Monank Patel' (usa_monank), but 'USA' does not exist in INTERNATIONAL_TEAMS (which only defines the 12 Full Member nations). As a result, 'Monank Patel' cannot be filtered by country in DatabaseView or managed as a team.
- **Recommendation**: Either add Associate nations (USA - United States) to INTERNATIONAL_TEAMS or separate Associate teams into a dedicated registry included in country filters.

### 3. [HIGH] Non-eligible player 'Sachin Tendulkar' (LEGEND, MALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_legend_sachin`
- **Country**: `IND`
- **Player ID**: `legend_sachin`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Sachin Tendulkar' (LEGEND, MALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 4. [HIGH] Non-eligible player 'Shane Warne' (LEGEND, MALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_legend_warne`
- **Country**: `AUS`
- **Player ID**: `legend_warne`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Shane Warne' (LEGEND, MALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 5. [HIGH] Non-eligible player 'Brian Lara' (LEGEND, MALE) mixed into active WIN men's national pool
- **Issue ID**: `pool_contamination_legend_lara`
- **Country**: `WIN`
- **Player ID**: `legend_lara`
- **Details**: getPlayersByCountry('WIN') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Brian Lara' (LEGEND, MALE) is automatically pulled into WIN's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 6. [HIGH] Non-eligible player 'Wasim Akram' (LEGEND, MALE) mixed into active PAK men's national pool
- **Issue ID**: `pool_contamination_legend_wasim`
- **Country**: `PAK`
- **Player ID**: `legend_wasim`
- **Details**: getPlayersByCountry('PAK') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Wasim Akram' (LEGEND, MALE) is automatically pulled into PAK's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 7. [HIGH] Non-eligible player 'MS Dhoni' (RETIRED, MALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_legend_dhoni`
- **Country**: `IND`
- **Player ID**: `legend_dhoni`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'MS Dhoni' (RETIRED, MALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 8. [HIGH] Non-eligible player 'Smriti Mandhana' (ACTIVE, FEMALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_wom_smriti`
- **Country**: `IND`
- **Player ID**: `wom_smriti`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Smriti Mandhana' (ACTIVE, FEMALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 9. [HIGH] Non-eligible player 'Ellyse Perry' (ACTIVE, FEMALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_wom_perry`
- **Country**: `AUS`
- **Player ID**: `wom_perry`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Ellyse Perry' (ACTIVE, FEMALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

## 6. Format-Specific Lineup Inconsistencies (54)
### 1. [HIGH] Sachin Tendulkar (LEGEND, MALE) is auto-selected in India's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_IND_TEST_legend_sachin`
- **Country**: `IND`
- **Format**: `TEST`
- **Player ID**: `legend_sachin`
- **Details**: Because Sachin Tendulkar has a high TEST rating (99), getDefaultFormatSquadConfig includes them in India's active TEST Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 2. [HIGH] Smriti Mandhana (ACTIVE, FEMALE) is auto-selected in India's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_IND_TEST_wom_smriti`
- **Country**: `IND`
- **Format**: `TEST`
- **Player ID**: `wom_smriti`
- **Details**: Because Smriti Mandhana has a high TEST rating (92), getDefaultFormatSquadConfig includes them in India's active TEST Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 3. [HIGH] Sachin Tendulkar (LEGEND, MALE) is auto-selected in India's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_IND_ODI_legend_sachin`
- **Country**: `IND`
- **Format**: `ODI`
- **Player ID**: `legend_sachin`
- **Details**: Because Sachin Tendulkar has a high ODI rating (99), getDefaultFormatSquadConfig includes them in India's active ODI Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 4. [HIGH] Smriti Mandhana (ACTIVE, FEMALE) is auto-selected in India's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_IND_ODI_wom_smriti`
- **Country**: `IND`
- **Format**: `ODI`
- **Player ID**: `wom_smriti`
- **Details**: Because Smriti Mandhana has a high ODI rating (96), getDefaultFormatSquadConfig includes them in India's active ODI Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 5. [HIGH] Smriti Mandhana (ACTIVE, FEMALE) is auto-selected in India's current T20I Playing XI
- **Issue ID**: `non_active_in_xi_IND_T20I_wom_smriti`
- **Country**: `IND`
- **Format**: `T20I`
- **Player ID**: `wom_smriti`
- **Details**: Because Smriti Mandhana has a high T20I rating (95), getDefaultFormatSquadConfig includes them in India's active T20I Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 6. [HIGH] Ellyse Perry (ACTIVE, FEMALE) is auto-selected in Australia's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_AUS_TEST_wom_perry`
- **Country**: `AUS`
- **Format**: `TEST`
- **Player ID**: `wom_perry`
- **Details**: Because Ellyse Perry has a high TEST rating (98), getDefaultFormatSquadConfig includes them in Australia's active TEST Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 7. [HIGH] Shane Warne (LEGEND, MALE) is auto-selected in Australia's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_AUS_TEST_legend_warne`
- **Country**: `AUS`
- **Format**: `TEST`
- **Player ID**: `legend_warne`
- **Details**: Because Shane Warne has a high TEST rating (99), getDefaultFormatSquadConfig includes them in Australia's active TEST Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 8. [MEDIUM] Specialist Bowler 'Pat Cummins' is placed at #1 (Opener) in Australia's TEST Batting Order
- **Issue ID**: `bowler_opening_batting_AUS_TEST_aus_cummins`
- **Country**: `AUS`
- **Format**: `TEST`
- **Player ID**: `aus_cummins`
- **Details**: Because getDefaultFormatSquadConfig pushes captainId ('aus_cummins') into selectedXI[0] and sets battingOrder = [...finalXI], bowler captains like 'Pat Cummins' open the batting at #1!
- **Recommendation**: Sort battingOrder by batting role and technique/timing (Batters & WK in top 6, All-Rounders at 6-8, Specialist Bowlers at 8-11) instead of using insertion order.

### 9. [HIGH] Ellyse Perry (ACTIVE, FEMALE) is auto-selected in Australia's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_AUS_ODI_wom_perry`
- **Country**: `AUS`
- **Format**: `ODI`
- **Player ID**: `wom_perry`
- **Details**: Because Ellyse Perry has a high ODI rating (97), getDefaultFormatSquadConfig includes them in Australia's active ODI Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 10. [HIGH] Shane Warne (LEGEND, MALE) is auto-selected in Australia's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_AUS_ODI_legend_warne`
- **Country**: `AUS`
- **Format**: `ODI`
- **Player ID**: `legend_warne`
- **Details**: Because Shane Warne has a high ODI rating (96), getDefaultFormatSquadConfig includes them in Australia's active ODI Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 11. [MEDIUM] Specialist Bowler 'Pat Cummins' is placed at #1 (Opener) in Australia's ODI Batting Order
- **Issue ID**: `bowler_opening_batting_AUS_ODI_aus_cummins`
- **Country**: `AUS`
- **Format**: `ODI`
- **Player ID**: `aus_cummins`
- **Details**: Because getDefaultFormatSquadConfig pushes captainId ('aus_cummins') into selectedXI[0] and sets battingOrder = [...finalXI], bowler captains like 'Pat Cummins' open the batting at #1!
- **Recommendation**: Sort battingOrder by batting role and technique/timing (Batters & WK in top 6, All-Rounders at 6-8, Specialist Bowlers at 8-11) instead of using insertion order.

### 12. [HIGH] Ellyse Perry (ACTIVE, FEMALE) is auto-selected in Australia's current T20I Playing XI
- **Issue ID**: `non_active_in_xi_AUS_T20I_wom_perry`
- **Country**: `AUS`
- **Format**: `T20I`
- **Player ID**: `wom_perry`
- **Details**: Because Ellyse Perry has a high T20I rating (94), getDefaultFormatSquadConfig includes them in Australia's active T20I Playing XI despite status='ACTIVE' and gender='FEMALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 13. [HIGH] England TEST Playing XI has only 8/11 players
- **Issue ID**: `incomplete_xi_ENG_TEST`
- **Country**: `ENG`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('ENG', 'TEST') produces a Playing XI of length 8 (Ben Stokes, Harry Brook, Joe Root, Ben Duckett, Zak Crawley, Chris Woakes, Mark Wood, Jofra Archer).
- **Recommendation**: Populate England's TEST player pool so a valid 11-player lineup is always generated.

### 14. [MEDIUM] England TEST designated Wicketkeeper 'Harry Brook' is a BATTER (not a Wicketkeeper)
- **Issue ID**: `non_wk_assigned_ENG_TEST`
- **Country**: `ENG`
- **Format**: `TEST`
- **Player ID**: `eng_brook`
- **Details**: No eligible wicketkeeper was found for England in TEST, so getDefaultWicketKeeperId fell back to squad[2] ('Harry Brook', role=BATTER).
- **Recommendation**: Add a specialist WICKETKEEPER_BATTER for England in TEST.

### 15. [HIGH] England ODI Playing XI has only 9/11 players
- **Issue ID**: `incomplete_xi_ENG_ODI`
- **Country**: `ENG`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('ENG', 'ODI') produces a Playing XI of length 9 (Jos Buttler, Joe Root, Harry Brook, Ben Duckett, Ben Stokes, Chris Woakes, Adil Rashid, Jofra Archer, Mark Wood).
- **Recommendation**: Populate England's ODI player pool so a valid 11-player lineup is always generated.

### 16. [HIGH] England T20I Playing XI has only 8/11 players
- **Issue ID**: `incomplete_xi_ENG_T20I`
- **Country**: `ENG`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('ENG', 'T20I') produces a Playing XI of length 8 (Jos Buttler, Harry Brook, Ben Duckett, Ben Stokes, Chris Woakes, Adil Rashid, Jofra Archer, Mark Wood).
- **Recommendation**: Populate England's T20I player pool so a valid 11-player lineup is always generated.

### 17. [HIGH] South Africa TEST Playing XI has only 6/11 players
- **Issue ID**: `incomplete_xi_RSA_TEST`
- **Country**: `RSA`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('RSA', 'TEST') produces a Playing XI of length 6 (Temba Bavuma, Kagiso Rabada, Aiden Markram, Marco Jansen, Keshav Maharaj, Anrich Nortje).
- **Recommendation**: Populate South Africa's TEST player pool so a valid 11-player lineup is always generated.

### 18. [MEDIUM] South Africa TEST designated Wicketkeeper 'Kagiso Rabada' is a BOWLER (not a Wicketkeeper)
- **Issue ID**: `non_wk_assigned_RSA_TEST`
- **Country**: `RSA`
- **Format**: `TEST`
- **Player ID**: `rsa_rabada`
- **Details**: No eligible wicketkeeper was found for South Africa in TEST, so getDefaultWicketKeeperId fell back to squad[2] ('Kagiso Rabada', role=BOWLER).
- **Recommendation**: Add a specialist WICKETKEEPER_BATTER for South Africa in TEST.

### 19. [MEDIUM] Specialist Bowler 'Kagiso Rabada' is placed at #2 (Opener) in South Africa's TEST Batting Order
- **Issue ID**: `bowler_opening_batting_RSA_TEST_rsa_rabada`
- **Country**: `RSA`
- **Format**: `TEST`
- **Player ID**: `rsa_rabada`
- **Details**: Because getDefaultFormatSquadConfig pushes captainId ('rsa_bavuma') into selectedXI[0] and sets battingOrder = [...finalXI], bowler captains like 'Kagiso Rabada' open the batting at #1!
- **Recommendation**: Sort battingOrder by batting role and technique/timing (Batters & WK in top 6, All-Rounders at 6-8, Specialist Bowlers at 8-11) instead of using insertion order.

### 20. [HIGH] South Africa ODI Playing XI has only 8/11 players
- **Issue ID**: `incomplete_xi_RSA_ODI`
- **Country**: `RSA`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('RSA', 'ODI') produces a Playing XI of length 8 (Temba Bavuma, Heinrich Klaasen, David Miller, Aiden Markram, Marco Jansen, Kagiso Rabada, Keshav Maharaj, Anrich Nortje).
- **Recommendation**: Populate South Africa's ODI player pool so a valid 11-player lineup is always generated.

### 21. [HIGH] South Africa T20I Playing XI has only 8/11 players
- **Issue ID**: `incomplete_xi_RSA_T20I`
- **Country**: `RSA`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('RSA', 'T20I') produces a Playing XI of length 8 (Aiden Markram, Heinrich Klaasen, David Miller, Temba Bavuma, Marco Jansen, Anrich Nortje, Kagiso Rabada, Keshav Maharaj).
- **Recommendation**: Populate South Africa's T20I player pool so a valid 11-player lineup is always generated.

### 22. [HIGH] New Zealand TEST Playing XI has only 6/11 players
- **Issue ID**: `incomplete_xi_NZL_TEST`
- **Country**: `NZL`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('NZL', 'TEST') produces a Playing XI of length 6 (Kane Williamson, Tom Latham, Daryl Mitchell, Mitchell Santner, Matt Henry, Trent Boult).
- **Recommendation**: Populate New Zealand's TEST player pool so a valid 11-player lineup is always generated.

### 23. [HIGH] New Zealand ODI Playing XI has only 6/11 players
- **Issue ID**: `incomplete_xi_NZL_ODI`
- **Country**: `NZL`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('NZL', 'ODI') produces a Playing XI of length 6 (Kane Williamson, Tom Latham, Daryl Mitchell, Mitchell Santner, Trent Boult, Matt Henry).
- **Recommendation**: Populate New Zealand's ODI player pool so a valid 11-player lineup is always generated.

### 24. [HIGH] New Zealand T20I Playing XI has only 6/11 players
- **Issue ID**: `incomplete_xi_NZL_T20I`
- **Country**: `NZL`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('NZL', 'T20I') produces a Playing XI of length 6 (Kane Williamson, Tom Latham, Mitchell Santner, Daryl Mitchell, Trent Boult, Matt Henry).
- **Recommendation**: Populate New Zealand's T20I player pool so a valid 11-player lineup is always generated.

### 25. [MEDIUM] New Zealand uses the exact same player set across TEST, ODI, and T20I
- **Issue ID**: `identical_xi_all_formats_NZL`
- **Country**: `NZL`
- **Details**: All three formats for New Zealand resolve to the exact same 6 players because there are no format-differentiated squad members in the pool.
- **Recommendation**: Add format specialists (red-ball Test specialists vs white-ball ODI/T20I specialists) for New Zealand.

### 26. [HIGH] Pakistan TEST Playing XI has only 7/11 players
- **Issue ID**: `incomplete_xi_PAK_TEST`
- **Country**: `PAK`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('PAK', 'TEST') produces a Playing XI of length 7 (Shan Masood, Mohammad Rizwan, Babar Azam, Agha Salman, Wasim Akram, Shaheen Shah Afridi, Naseem Shah).
- **Recommendation**: Populate Pakistan's TEST player pool so a valid 11-player lineup is always generated.

### 27. [HIGH] Wasim Akram (LEGEND, MALE) is auto-selected in Pakistan's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_PAK_TEST_legend_wasim`
- **Country**: `PAK`
- **Format**: `TEST`
- **Player ID**: `legend_wasim`
- **Details**: Because Wasim Akram has a high TEST rating (99), getDefaultFormatSquadConfig includes them in Pakistan's active TEST Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 28. [HIGH] Pakistan ODI Playing XI has only 7/11 players
- **Issue ID**: `incomplete_xi_PAK_ODI`
- **Country**: `PAK`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('PAK', 'ODI') produces a Playing XI of length 7 (Mohammad Rizwan, Babar Azam, Agha Salman, Wasim Akram, Shaheen Shah Afridi, Naseem Shah, Haris Rauf).
- **Recommendation**: Populate Pakistan's ODI player pool so a valid 11-player lineup is always generated.

### 29. [HIGH] Wasim Akram (LEGEND, MALE) is auto-selected in Pakistan's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_PAK_ODI_legend_wasim`
- **Country**: `PAK`
- **Format**: `ODI`
- **Player ID**: `legend_wasim`
- **Details**: Because Wasim Akram has a high ODI rating (99), getDefaultFormatSquadConfig includes them in Pakistan's active ODI Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 30. [HIGH] Pakistan T20I Playing XI has only 6/11 players
- **Issue ID**: `incomplete_xi_PAK_T20I`
- **Country**: `PAK`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('PAK', 'T20I') produces a Playing XI of length 6 (Mohammad Rizwan, Babar Azam, Agha Salman, Shaheen Shah Afridi, Haris Rauf, Naseem Shah).
- **Recommendation**: Populate Pakistan's T20I player pool so a valid 11-player lineup is always generated.

### 31. [HIGH] West Indies TEST Playing XI has only 1/11 players
- **Issue ID**: `incomplete_xi_WIN_TEST`
- **Country**: `WIN`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('WIN', 'TEST') produces a Playing XI of length 1 (Brian Lara).
- **Recommendation**: Populate West Indies's TEST player pool so a valid 11-player lineup is always generated.

### 32. [HIGH] Brian Lara (LEGEND, MALE) is auto-selected in West Indies's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_WIN_TEST_legend_lara`
- **Country**: `WIN`
- **Format**: `TEST`
- **Player ID**: `legend_lara`
- **Details**: Because Brian Lara has a high TEST rating (99), getDefaultFormatSquadConfig includes them in West Indies's active TEST Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 33. [HIGH] West Indies ODI Playing XI has only 1/11 players
- **Issue ID**: `incomplete_xi_WIN_ODI`
- **Country**: `WIN`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('WIN', 'ODI') produces a Playing XI of length 1 (Brian Lara).
- **Recommendation**: Populate West Indies's ODI player pool so a valid 11-player lineup is always generated.

### 34. [HIGH] Brian Lara (LEGEND, MALE) is auto-selected in West Indies's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_WIN_ODI_legend_lara`
- **Country**: `WIN`
- **Format**: `ODI`
- **Player ID**: `legend_lara`
- **Details**: Because Brian Lara has a high ODI rating (95), getDefaultFormatSquadConfig includes them in West Indies's active ODI Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 35. [HIGH] West Indies T20I Playing XI has only 1/11 players
- **Issue ID**: `incomplete_xi_WIN_T20I`
- **Country**: `WIN`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('WIN', 'T20I') produces a Playing XI of length 1 (Brian Lara).
- **Recommendation**: Populate West Indies's T20I player pool so a valid 11-player lineup is always generated.

### 36. [HIGH] Brian Lara (LEGEND, MALE) is auto-selected in West Indies's current T20I Playing XI
- **Issue ID**: `non_active_in_xi_WIN_T20I_legend_lara`
- **Country**: `WIN`
- **Format**: `T20I`
- **Player ID**: `legend_lara`
- **Details**: Because Brian Lara has a high T20I rating (86), getDefaultFormatSquadConfig includes them in West Indies's active T20I Playing XI despite status='LEGEND' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 37. [HIGH] West Indies T20I Captain 'Brian Lara' is marked ineligible for T20I
- **Issue ID**: `ineligible_captain_WIN_T20I`
- **Country**: `WIN`
- **Format**: `T20I`
- **Player ID**: `legend_lara`
- **Details**: getDefaultCaptainId('WIN', 'T20I') selects 'Brian Lara' (legend_lara), whose formatEligibility.T20I is false, and forces them into the T20I squad and Playing XI.
- **Recommendation**: Ensure getDefaultCaptainId only selects from players eligible for T20I.

### 38. [MEDIUM] West Indies uses the exact same player set across TEST, ODI, and T20I
- **Issue ID**: `identical_xi_all_formats_WIN`
- **Country**: `WIN`
- **Details**: All three formats for West Indies resolve to the exact same 1 players because there are no format-differentiated squad members in the pool.
- **Recommendation**: Add format specialists (red-ball Test specialists vs white-ball ODI/T20I specialists) for West Indies.

### 39. [HIGH] Sri Lanka TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_SRI_TEST`
- **Country**: `SRI`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('SRI', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Sri Lanka's TEST player pool so a valid 11-player lineup is always generated.

### 40. [HIGH] Sri Lanka ODI Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_SRI_ODI`
- **Country**: `SRI`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('SRI', 'ODI') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Sri Lanka's ODI player pool so a valid 11-player lineup is always generated.

### 41. [HIGH] Sri Lanka T20I Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_SRI_T20I`
- **Country**: `SRI`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('SRI', 'T20I') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Sri Lanka's T20I player pool so a valid 11-player lineup is always generated.

### 42. [HIGH] Afghanistan TEST Playing XI has only 4/11 players
- **Issue ID**: `incomplete_xi_AFG_TEST`
- **Country**: `AFG`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('AFG', 'TEST') produces a Playing XI of length 4 (Rahmanullah Gurbaz, Mohammad Nabi, Fazalhaq Farooqi, Noor Ahmad).
- **Recommendation**: Populate Afghanistan's TEST player pool so a valid 11-player lineup is always generated.

### 43. [HIGH] Afghanistan ODI Playing XI has only 4/11 players
- **Issue ID**: `incomplete_xi_AFG_ODI`
- **Country**: `AFG`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('AFG', 'ODI') produces a Playing XI of length 4 (Rahmanullah Gurbaz, Mohammad Nabi, Fazalhaq Farooqi, Noor Ahmad).
- **Recommendation**: Populate Afghanistan's ODI player pool so a valid 11-player lineup is always generated.

### 44. [HIGH] Afghanistan T20I Playing XI has only 4/11 players
- **Issue ID**: `incomplete_xi_AFG_T20I`
- **Country**: `AFG`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('AFG', 'T20I') produces a Playing XI of length 4 (Rahmanullah Gurbaz, Mohammad Nabi, Fazalhaq Farooqi, Noor Ahmad).
- **Recommendation**: Populate Afghanistan's T20I player pool so a valid 11-player lineup is always generated.

### 45. [MEDIUM] Afghanistan uses the exact same player set across TEST, ODI, and T20I
- **Issue ID**: `identical_xi_all_formats_AFG`
- **Country**: `AFG`
- **Details**: All three formats for Afghanistan resolve to the exact same 4 players because there are no format-differentiated squad members in the pool.
- **Recommendation**: Add format specialists (red-ball Test specialists vs white-ball ODI/T20I specialists) for Afghanistan.

### 46. [HIGH] Bangladesh TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_BAN_TEST`
- **Country**: `BAN`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('BAN', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Bangladesh's TEST player pool so a valid 11-player lineup is always generated.

### 47. [HIGH] Bangladesh ODI Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_BAN_ODI`
- **Country**: `BAN`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('BAN', 'ODI') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Bangladesh's ODI player pool so a valid 11-player lineup is always generated.

### 48. [HIGH] Bangladesh T20I Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_BAN_T20I`
- **Country**: `BAN`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('BAN', 'T20I') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Bangladesh's T20I player pool so a valid 11-player lineup is always generated.

### 49. [HIGH] Ireland TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_IRE_TEST`
- **Country**: `IRE`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('IRE', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Ireland's TEST player pool so a valid 11-player lineup is always generated.

### 50. [HIGH] Ireland ODI Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_IRE_ODI`
- **Country**: `IRE`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('IRE', 'ODI') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Ireland's ODI player pool so a valid 11-player lineup is always generated.

### 51. [HIGH] Ireland T20I Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_IRE_T20I`
- **Country**: `IRE`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('IRE', 'T20I') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Ireland's T20I player pool so a valid 11-player lineup is always generated.

### 52. [HIGH] Zimbabwe TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_ZIM_TEST`
- **Country**: `ZIM`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('ZIM', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Zimbabwe's TEST player pool so a valid 11-player lineup is always generated.

### 53. [HIGH] Zimbabwe ODI Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_ZIM_ODI`
- **Country**: `ZIM`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('ZIM', 'ODI') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Zimbabwe's ODI player pool so a valid 11-player lineup is always generated.

### 54. [HIGH] Zimbabwe T20I Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_ZIM_T20I`
- **Country**: `ZIM`
- **Format**: `T20I`
- **Details**: getDefaultFormatSquadConfig('ZIM', 'T20I') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Zimbabwe's T20I player pool so a valid 11-player lineup is always generated.

## 7. Schema & Tour Squad Anomalies (10)
### 1. [LOW] Typo in Player ID 'ind_shiraz' for Mohammed Siraj
- **Issue ID**: `typo_player_id_ind_shiraz`
- **Country**: `IND`
- **Player ID**: `ind_shiraz`
- **Details**: Mohammed Siraj's player ID is spelled 'ind_shiraz' in src/data/squads.ts and src/data/tours.ts.
- **Recommendation**: Normalize ID to 'ind_siraj' across squads.ts and tours.ts.

### 2. [MEDIUM] Invalid BowlingStyle 'RIGHT_ARM_OFF_BREAK' on player 'David Miller' (rsa_miller)
- **Issue ID**: `invalid_bowling_style_rsa_miller`
- **Country**: `RSA`
- **Player ID**: `rsa_miller`
- **Details**: 'RIGHT_ARM_OFF_BREAK' is not a valid member of the BowlingStyle union in src/types/cricket.ts (expected 'OFF_BREAK' instead of 'RIGHT_ARM_OFF_BREAK').
- **Recommendation**: Replace 'RIGHT_ARM_OFF_BREAK' with 'OFF_BREAK' in src/data/squads.ts.

### 3. [MEDIUM] Announced Tour Squad for 'Border-Gavaskar Trophy (India tour of Australia)' has only 12 players (requires 15-20)
- **Issue ID**: `undersized_tour_squad_tour_bgt_2026_27`
- **Details**: Tour 'tour_bgt_2026_27' has squadAnnounced=true, but tourSquadIds only lists 12 players (ind_rohit, ind_jaiswal, ind_gill, ind_virat, ind_pant, ind_rahane, ind_jadeja, ind_bumrah, ind_shiraz, ind_shami, ind_kuldeep, ind_axar).
- **Recommendation**: Expand initial announced tourSquadIds to 15-18 players.

### 4. [LOW] Upcoming Tour 'The Ashes Series (England tour of Australia)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_ashes_2027`
- **Details**: Tour 'tour_ashes_2027' (2027-01-14 to 2027-02-28) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-01-05.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 5. [LOW] Upcoming Tour 'South Africa Tour of India (Multi-Format Bilateral Series)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_sa_ind_2027`
- **Details**: Tour 'tour_sa_ind_2027' (2027-03-05 to 2027-04-10) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-02-24.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 6. [LOW] Upcoming Tour 'Pakistan Tour of Australia (Bilateral Test & ODI Tour)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_pak_aus_2027`
- **Details**: Tour 'tour_pak_aus_2027' (2027-04-15 to 2027-05-18) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-04-01.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 7. [LOW] Upcoming Tour 'ICC World Test Championship Final (Lord’s)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_wtc_final_2027`
- **Details**: Tour 'tour_wtc_final_2027' (2027-06-10 to 2027-06-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-05-25.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 8. [LOW] Upcoming Tour 'Anthony de Mello Trophy (India Tour of England)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_eng_ind_pataudi`
- **Details**: Tour 'tour_eng_ind_pataudi' (2027-07-02 to 2027-08-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-06-20.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 9. [LOW] Upcoming Tour 'ICC Men’s Cricket World Cup 2027 (Southern Africa)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_cwc_2027`
- **Details**: Tour 'tour_cwc_2027' (2027-10-01 to 2027-11-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-09-10.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 10. [HIGH] Tournament participant 'Sri Lanka' (SRI) in 'ICC World Test Championship' has 0 players in DB
- **Issue ID**: `tournament_team_no_players_wtc_2025_SRI`
- **Country**: `SRI`
- **Format**: `TEST`
- **Details**: Sri Lanka is an active participant in 'ICC World Test Championship' (TEST), but has 0 players in ALL_PLAYERS.
- **Recommendation**: Add full player rosters for all tournament-participating nations (SRI).
