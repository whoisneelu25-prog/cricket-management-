# International Cricket Manager — Database Validation Report
Generated At: 2026-11-03T15:24:22.571Z

## 1. Executive Summary
- **Registered Countries (`INTERNATIONAL_TEAMS`)**: 22
- **Countries Referenced by Players**: 22
- **Total Players in `ALL_PLAYERS`**: 603 (418 in `players.ts` + 185 in `squads.ts`)
  - Active Men's Players: **575**
  - Active Women's Players: **2**
  - Historical Legends: **4**
  - Retired Players: **22**
- **Total Validation Findings**: **99** (60 High, 33 Medium, 6 Low)

## 2. Country-by-Country Roster Audit
| Country | Code | In Teams Table | Total Players | Active Men | Legends/Retired | Women | Active Men Eligible (TEST / ODI / T20I) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| India | `IND` | Yes | 49 | 45 | 3 | 1 | 26 / 26 / 45 | **COMPLETE** |
| Australia | `AUS` | Yes | 41 | 36 | 4 | 1 | 18 / 26 / 36 | **COMPLETE** |
| England | `ENG` | Yes | 33 | 27 | 6 | 0 | 20 / 21 / 27 | **COMPLETE** |
| Pakistan | `PAK` | Yes | 35 | 34 | 1 | 0 | 18 / 25 / 34 | **COMPLETE** |
| South Africa | `RSA` | Yes | 31 | 30 | 1 | 0 | 13 / 22 / 30 | **COMPLETE** |
| New Zealand | `NZL` | Yes | 29 | 27 | 2 | 0 | 15 / 17 / 27 | **COMPLETE** |
| Sri Lanka | `SL` | Yes | 36 | 35 | 1 | 0 | 30 / 29 / 35 | **COMPLETE** |
| Bangladesh | `BAN` | Yes | 31 | 29 | 2 | 0 | 24 / 24 / 29 | **COMPLETE** |
| West Indies | `WI` | Yes | 32 | 30 | 2 | 0 | 24 / 24 / 30 | **COMPLETE** |
| Afghanistan | `AFG` | Yes | 41 | 40 | 1 | 0 | 31 / 33 / 40 | **COMPLETE** |
| Ireland | `IRE` | Yes | 30 | 29 | 1 | 0 | 24 / 26 / 29 | **COMPLETE** |
| Zimbabwe | `ZIM` | Yes | 30 | 30 | 0 | 0 | 25 / 24 / 30 | **COMPLETE** |
| Scotland | `SCO` | Yes | 23 | 23 | 0 | 0 | 0 / 19 / 23 | **INCOMPLETE_SQUAD** |
| Netherlands | `NED` | Yes | 17 | 17 | 0 | 0 | 0 / 14 / 17 | **INCOMPLETE_SQUAD** |
| Nepal | `NEP` | Yes | 18 | 18 | 0 | 0 | 0 / 14 / 18 | **INCOMPLETE_SQUAD** |
| Namibia | `NAM` | Yes | 17 | 17 | 0 | 0 | 0 / 16 / 17 | **INCOMPLETE_SQUAD** |
| United States | `USA` | Yes | 19 | 19 | 0 | 0 | 0 / 18 / 19 | **INCOMPLETE_SQUAD** |
| United Arab Emirates | `UAE` | Yes | 24 | 24 | 0 | 0 | 0 / 18 / 24 | **INCOMPLETE_SQUAD** |
| Oman | `OMA` | Yes | 24 | 24 | 0 | 0 | 0 / 22 / 24 | **INCOMPLETE_SQUAD** |
| Canada | `CAN` | Yes | 19 | 18 | 1 | 0 | 0 / 17 / 18 | **INCOMPLETE_SQUAD** |
| Papua New Guinea | `PNG` | Yes | 13 | 12 | 1 | 0 | 0 / 5 / 12 | **INCOMPLETE_SQUAD** |
| Indonesia | `IDN` | Yes | 11 | 11 | 0 | 0 | 0 / 0 / 11 | **INCOMPLETE_SQUAD** |

## 3. Duplicate Players & Name Collisions (0)
No issues detected in this category.

## 4. Missing Players & Incomplete National Pools (14)
### 1. [HIGH] Scotland (SCO) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_SCO_TEST`
- **Country**: `SCO`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Scotland only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Scotland.

### 2. [HIGH] Netherlands (NED) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_NED_TEST`
- **Country**: `NED`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Netherlands only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Netherlands.

### 3. [HIGH] Nepal (NEP) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_NEP_TEST`
- **Country**: `NEP`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Nepal only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Nepal.

### 4. [HIGH] Namibia (NAM) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_NAM_TEST`
- **Country**: `NAM`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Namibia only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Namibia.

### 5. [HIGH] United States (USA) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_USA_TEST`
- **Country**: `USA`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently United States only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for United States.

### 6. [HIGH] United Arab Emirates (UAE) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_UAE_TEST`
- **Country**: `UAE`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently United Arab Emirates only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for United Arab Emirates.

### 7. [HIGH] Oman (OMA) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_OMA_TEST`
- **Country**: `OMA`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Oman only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Oman.

### 8. [HIGH] Canada (CAN) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_CAN_TEST`
- **Country**: `CAN`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Canada only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Canada.

### 9. [HIGH] Papua New Guinea (PNG) has only 12 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_PNG`
- **Country**: `PNG`
- **Details**: Papua New Guinea has 13 total players (12 active male, 0 legends, 1 retired, 0 female). Active male eligible counts: TEST=0, ODI=5, T20I=12.
- **Recommendation**: Expand Papua New Guinea's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 10. [HIGH] Papua New Guinea (PNG) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_PNG_TEST`
- **Country**: `PNG`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Papua New Guinea only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Papua New Guinea.

### 11. [HIGH] Papua New Guinea (PNG) cannot field 11 active male players in ODI (only 5 available)
- **Issue ID**: `missing_xi_PNG_ODI`
- **Country**: `PNG`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Papua New Guinea only has 5 active male players eligible for ODI (short by 6 players just for a starting XI).
- **Recommendation**: Add 10 more ODI-eligible active players for Papua New Guinea.

### 12. [HIGH] Indonesia (IDN) has only 11 active male players (needs 15-20 per format)
- **Issue ID**: `missing_full_squad_IDN`
- **Country**: `IDN`
- **Details**: Indonesia has 11 total players (11 active male, 0 legends, 0 retired, 0 female). Active male eligible counts: TEST=0, ODI=0, T20I=11.
- **Recommendation**: Expand Indonesia's active men's player pool so each format (TEST, ODI, T20I) has at least 15-18 eligible active players.

### 13. [HIGH] Indonesia (IDN) cannot field 11 active male players in TEST (only 0 available)
- **Issue ID**: `missing_xi_IDN_TEST`
- **Country**: `IDN`
- **Format**: `TEST`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Indonesia only has 0 active male players eligible for TEST (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more TEST-eligible active players for Indonesia.

### 14. [HIGH] Indonesia (IDN) cannot field 11 active male players in ODI (only 0 available)
- **Issue ID**: `missing_xi_IDN_ODI`
- **Country**: `IDN`
- **Format**: `ODI`
- **Details**: A standard cricket Playing XI requires 11 players, plus reserves. Currently Indonesia only has 0 active male players eligible for ODI (short by 11 players just for a starting XI).
- **Recommendation**: Add 15 more ODI-eligible active players for Indonesia.

## 5. Incorrect Country Assignments & Pool Contamination (28)
### 1. [HIGH] Non-eligible player 'Naveen-ul-Haq Murid' (RETIRED, MALE) mixed into active AFG men's national pool
- **Issue ID**: `pool_contamination_PLY_AFG_029`
- **Country**: `AFG`
- **Player ID**: `PLY_AFG_029`
- **Details**: getPlayersByCountry('AFG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Naveen-ul-Haq Murid' (RETIRED, MALE) is automatically pulled into AFG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 2. [HIGH] Non-eligible player 'David Warner' (RETIRED, MALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_PLY_AUS_009`
- **Country**: `AUS`
- **Player ID**: `PLY_AUS_009`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'David Warner' (RETIRED, MALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 3. [HIGH] Non-eligible player 'Glenn Maxwell' (RETIRED, MALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_PLY_AUS_010`
- **Country**: `AUS`
- **Player ID**: `PLY_AUS_010`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Glenn Maxwell' (RETIRED, MALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 4. [HIGH] Non-eligible player 'Usman Khawaja' (RETIRED, MALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_PLY_AUS_038`
- **Country**: `AUS`
- **Player ID**: `PLY_AUS_038`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Usman Khawaja' (RETIRED, MALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 5. [HIGH] Non-eligible player 'Mohammad Mahmudullah' (RETIRED, MALE) mixed into active BAN men's national pool
- **Issue ID**: `pool_contamination_PLY_BAN_008`
- **Country**: `BAN`
- **Player ID**: `PLY_BAN_008`
- **Details**: getPlayersByCountry('BAN') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Mohammad Mahmudullah' (RETIRED, MALE) is automatically pulled into BAN's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 6. [HIGH] Non-eligible player 'Tamim Iqbal Khan' (RETIRED, MALE) mixed into active BAN men's national pool
- **Issue ID**: `pool_contamination_PLY_BAN_026`
- **Country**: `BAN`
- **Player ID**: `PLY_BAN_026`
- **Details**: getPlayersByCountry('BAN') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Tamim Iqbal Khan' (RETIRED, MALE) is automatically pulled into BAN's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 7. [HIGH] Non-eligible player 'Navneet Dhaliwal' (RETIRED, MALE) mixed into active CAN men's national pool
- **Issue ID**: `pool_contamination_PLY_CAN_012`
- **Country**: `CAN`
- **Player ID**: `PLY_CAN_012`
- **Details**: getPlayersByCountry('CAN') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Navneet Dhaliwal' (RETIRED, MALE) is automatically pulled into CAN's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 8. [HIGH] Non-eligible player 'Ben Stokes' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_003`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_003`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Ben Stokes' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 9. [HIGH] Non-eligible player 'Chris Woakes' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_005`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_005`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Chris Woakes' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 10. [HIGH] Non-eligible player 'James Anderson' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_010`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_010`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'James Anderson' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 11. [HIGH] Non-eligible player 'Mark Wood' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_020`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_020`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Mark Wood' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 12. [HIGH] Non-eligible player 'Moeen Ali' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_022`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_022`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Moeen Ali' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 13. [HIGH] Non-eligible player 'Stuart Broad' (RETIRED, MALE) mixed into active ENG men's national pool
- **Issue ID**: `pool_contamination_PLY_ENG_030`
- **Country**: `ENG`
- **Player ID**: `PLY_ENG_030`
- **Details**: getPlayersByCountry('ENG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Stuart Broad' (RETIRED, MALE) is automatically pulled into ENG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 14. [HIGH] Non-eligible player 'Ravichandran Ashwin' (RETIRED, MALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_PLY_IND_026`
- **Country**: `IND`
- **Player ID**: `PLY_IND_026`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Ravichandran Ashwin' (RETIRED, MALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 15. [HIGH] Non-eligible player 'Benjamin Charlie White' (RETIRED, MALE) mixed into active IRE men's national pool
- **Issue ID**: `pool_contamination_PLY_IRE_005`
- **Country**: `IRE`
- **Player ID**: `PLY_IRE_005`
- **Details**: getPlayersByCountry('IRE') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Benjamin Charlie White' (RETIRED, MALE) is automatically pulled into IRE's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 16. [HIGH] Non-eligible player 'Kane Stuart Williamson' (RETIRED, MALE) mixed into active NZL men's national pool
- **Issue ID**: `pool_contamination_PLY_NZL_014`
- **Country**: `NZL`
- **Player ID**: `PLY_NZL_014`
- **Details**: getPlayersByCountry('NZL') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Kane Stuart Williamson' (RETIRED, MALE) is automatically pulled into NZL's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 17. [HIGH] Non-eligible player 'Timothy Grant Southee' (RETIRED, MALE) mixed into active NZL men's national pool
- **Issue ID**: `pool_contamination_PLY_NZL_025`
- **Country**: `NZL`
- **Player ID**: `PLY_NZL_025`
- **Details**: getPlayersByCountry('NZL') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Timothy Grant Southee' (RETIRED, MALE) is automatically pulled into NZL's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 18. [HIGH] Non-eligible player 'Charles Jordan Alewa Amini' (RETIRED, MALE) mixed into active PNG men's national pool
- **Issue ID**: `pool_contamination_PLY_PNG_004`
- **Country**: `PNG`
- **Player ID**: `PLY_PNG_004`
- **Details**: getPlayersByCountry('PNG') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Charles Jordan Alewa Amini' (RETIRED, MALE) is automatically pulled into PNG's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 19. [HIGH] Non-eligible player 'Heinrich Klaasen' (RETIRED, MALE) mixed into active RSA men's national pool
- **Issue ID**: `pool_contamination_PLY_RSA_011`
- **Country**: `RSA`
- **Player ID**: `PLY_RSA_011`
- **Details**: getPlayersByCountry('RSA') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Heinrich Klaasen' (RETIRED, MALE) is automatically pulled into RSA's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 20. [HIGH] Non-eligible player 'Frank Dimuth Madushanka Karunaratne' (RETIRED, MALE) mixed into active SL men's national pool
- **Issue ID**: `pool_contamination_PLY_SL_008`
- **Country**: `SL`
- **Player ID**: `PLY_SL_008`
- **Details**: getPlayersByCountry('SL') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Frank Dimuth Madushanka Karunaratne' (RETIRED, MALE) is automatically pulled into SL's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 21. [HIGH] Non-eligible player 'Andre Dwayne Russell' (RETIRED, MALE) mixed into active WI men's national pool
- **Issue ID**: `pool_contamination_PLY_WI_005`
- **Country**: `WI`
- **Player ID**: `PLY_WI_005`
- **Details**: getPlayersByCountry('WI') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Andre Dwayne Russell' (RETIRED, MALE) is automatically pulled into WI's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 22. [HIGH] Non-eligible player 'Nicholas Pooran' (RETIRED, MALE) mixed into active WI men's national pool
- **Issue ID**: `pool_contamination_PLY_WI_023`
- **Country**: `WI`
- **Player ID**: `PLY_WI_023`
- **Details**: getPlayersByCountry('WI') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Nicholas Pooran' (RETIRED, MALE) is automatically pulled into WI's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 23. [HIGH] Non-eligible player 'Sachin Tendulkar' (LEGEND, MALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_ind_sachin`
- **Country**: `IND`
- **Player ID**: `ind_sachin`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Sachin Tendulkar' (LEGEND, MALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 24. [HIGH] Non-eligible player 'MS Dhoni' (LEGEND, MALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_ind_dhoni`
- **Country**: `IND`
- **Player ID**: `ind_dhoni`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'MS Dhoni' (LEGEND, MALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 25. [HIGH] Non-eligible player 'Sir Donald Bradman' (LEGEND, MALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_aus_bradman`
- **Country**: `AUS`
- **Player ID**: `aus_bradman`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Sir Donald Bradman' (LEGEND, MALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 26. [HIGH] Non-eligible player 'Wasim Akram' (LEGEND, MALE) mixed into active PAK men's national pool
- **Issue ID**: `pool_contamination_pak_akram`
- **Country**: `PAK`
- **Player ID**: `pak_akram`
- **Details**: getPlayersByCountry('PAK') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Wasim Akram' (LEGEND, MALE) is automatically pulled into PAK's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 27. [HIGH] Non-eligible player 'Smriti Mandhana' (ACTIVE, FEMALE) mixed into active IND men's national pool
- **Issue ID**: `pool_contamination_ind_smriti`
- **Country**: `IND`
- **Player ID**: `ind_smriti`
- **Details**: getPlayersByCountry('IND') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Smriti Mandhana' (ACTIVE, FEMALE) is automatically pulled into IND's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

### 28. [HIGH] Non-eligible player 'Ellyse Perry' (ACTIVE, FEMALE) mixed into active AUS men's national pool
- **Issue ID**: `pool_contamination_aus_perry`
- **Country**: `AUS`
- **Player ID**: `aus_perry`
- **Details**: getPlayersByCountry('AUS') filters only by countryId without checking status === 'ACTIVE' and gender === 'MALE'. Consequently, 'Ellyse Perry' (ACTIVE, FEMALE) is automatically pulled into AUS's active men's national squad and Playing XI.
- **Recommendation**: Filter getPlayersByCountry / getFormatEligiblePlayers by status === 'ACTIVE' and gender === 'MALE' for men's international career squads, keeping Legends, Retired players, and Women's players in separate pools.

## 6. Format-Specific Lineup Inconsistencies (50)
### 1. [MEDIUM] India TEST Vice-Captain 'Rishabh Pant' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_IND_TEST`
- **Country**: `IND`
- **Format**: `TEST`
- **Player ID**: `PLY_IND_029`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_IND_029') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 2. [MEDIUM] India TEST Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_IND_TEST`
- **Country**: `IND`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. India TEST XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 3. [HIGH] Usman Khawaja (RETIRED, MALE) is auto-selected in Australia's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_AUS_TEST_PLY_AUS_038`
- **Country**: `AUS`
- **Format**: `TEST`
- **Player ID**: `PLY_AUS_038`
- **Details**: Because Usman Khawaja has a high TEST rating (70), getDefaultFormatSquadConfig includes them in Australia's active TEST Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 4. [HIGH] Ben Stokes (RETIRED, MALE) is auto-selected in England's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_ENG_TEST_PLY_ENG_003`
- **Country**: `ENG`
- **Format**: `TEST`
- **Player ID**: `PLY_ENG_003`
- **Details**: Because Ben Stokes has a high TEST rating (73), getDefaultFormatSquadConfig includes them in England's active TEST Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 5. [MEDIUM] England TEST Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_ENG_TEST`
- **Country**: `ENG`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. England TEST XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 6. [MEDIUM] Pakistan TEST Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_PAK_TEST`
- **Country**: `PAK`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Pakistan TEST XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 7. [MEDIUM] Specialist Bowler 'Imam-ul-Haq' is placed at #1 (Opener) in Pakistan's TEST Batting Order
- **Issue ID**: `bowler_opening_batting_PAK_TEST_PLY_PAK_011`
- **Country**: `PAK`
- **Format**: `TEST`
- **Player ID**: `PLY_PAK_011`
- **Details**: Because getDefaultFormatSquadConfig pushes captainId ('PLY_PAK_005') into selectedXI[0] and sets battingOrder = [...finalXI], bowler captains like 'Imam-ul-Haq' open the batting at #1!
- **Recommendation**: Sort battingOrder by batting role and technique/timing (Batters & WK in top 6, All-Rounders at 6-8, Specialist Bowlers at 8-11) instead of using insertion order.

### 8. [MEDIUM] Pakistan ODI Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_PAK_ODI`
- **Country**: `PAK`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Pakistan ODI XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 9. [MEDIUM] Pakistan T20I Vice-Captain 'Shadab Khan' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_PAK_T20I`
- **Country**: `PAK`
- **Format**: `T20I`
- **Player ID**: `PLY_PAK_028`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_PAK_028') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 10. [MEDIUM] Pakistan T20I Playing XI has only 2 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_PAK_T20I`
- **Country**: `PAK`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Pakistan T20I XI only has 2.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 11. [MEDIUM] South Africa TEST Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_RSA_TEST`
- **Country**: `RSA`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. South Africa TEST XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 12. [MEDIUM] South Africa ODI Playing XI has only 1 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_RSA_ODI`
- **Country**: `RSA`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. South Africa ODI XI only has 1.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 13. [MEDIUM] South Africa T20I Vice-Captain 'Quinton de Kock' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_RSA_T20I`
- **Country**: `RSA`
- **Format**: `T20I`
- **Player ID**: `PLY_RSA_023`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_RSA_023') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 14. [HIGH] Kane Stuart Williamson (RETIRED, MALE) is auto-selected in New Zealand's current TEST Playing XI
- **Issue ID**: `non_active_in_xi_NZL_TEST_PLY_NZL_014`
- **Country**: `NZL`
- **Format**: `TEST`
- **Player ID**: `PLY_NZL_014`
- **Details**: Because Kane Stuart Williamson has a high TEST rating (73), getDefaultFormatSquadConfig includes them in New Zealand's active TEST Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 15. [HIGH] Kane Stuart Williamson (RETIRED, MALE) is auto-selected in New Zealand's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_NZL_ODI_PLY_NZL_014`
- **Country**: `NZL`
- **Format**: `ODI`
- **Player ID**: `PLY_NZL_014`
- **Details**: Because Kane Stuart Williamson has a high ODI rating (72), getDefaultFormatSquadConfig includes them in New Zealand's active ODI Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 16. [MEDIUM] Sri Lanka T20I Vice-Captain 'Pinnaduwage Wanindu Hasaranga de Silva' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_SL_T20I`
- **Country**: `SL`
- **Format**: `T20I`
- **Player ID**: `PLY_SL_036`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_SL_036') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 17. [MEDIUM] Bangladesh TEST Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_BAN_TEST`
- **Country**: `BAN`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Bangladesh TEST XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 18. [MEDIUM] Bangladesh ODI Vice-Captain 'Towhid Hridoy' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_BAN_ODI`
- **Country**: `BAN`
- **Format**: `ODI`
- **Player ID**: `PLY_BAN_031`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_BAN_031') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 19. [MEDIUM] Bangladesh T20I Vice-Captain 'Towhid Hridoy' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_BAN_T20I`
- **Country**: `BAN`
- **Format**: `T20I`
- **Player ID**: `PLY_BAN_031`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_BAN_031') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 20. [MEDIUM] West Indies TEST Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_WI_TEST`
- **Country**: `WI`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. West Indies TEST XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 21. [MEDIUM] Afghanistan TEST Vice-Captain 'Ikram Alikhil' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_AFG_TEST`
- **Country**: `AFG`
- **Format**: `TEST`
- **Player ID**: `PLY_AFG_017`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_AFG_017') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 22. [MEDIUM] Afghanistan TEST Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_AFG_TEST`
- **Country**: `AFG`
- **Format**: `TEST`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Afghanistan TEST XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 23. [MEDIUM] Afghanistan T20I Vice-Captain 'Darwish Rasooli' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_AFG_T20I`
- **Country**: `AFG`
- **Format**: `T20I`
- **Player ID**: `PLY_AFG_010`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_AFG_010') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 24. [MEDIUM] Zimbabwe ODI Vice-Captain 'Richard Ngarava' is omitted from the Playing XI
- **Issue ID**: `vc_not_in_xi_ZIM_ODI`
- **Country**: `ZIM`
- **Format**: `ODI`
- **Player ID**: `PLY_ZIM_016`
- **Details**: getDefaultFormatSquadConfig adds captainId and wicketKeeperId to selectedXI first, but never ensures viceCaptainId ('PLY_ZIM_016') is included in the Playing XI.
- **Recommendation**: Include viceCaptainId in the Playing XI selection priority alongside captainId and wicketKeeperId.

### 25. [HIGH] Scotland TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_SCO_TEST`
- **Country**: `SCO`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('SCO', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Scotland's TEST player pool so a valid 11-player lineup is always generated.

### 26. [HIGH] Netherlands TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_NED_TEST`
- **Country**: `NED`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('NED', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Netherlands's TEST player pool so a valid 11-player lineup is always generated.

### 27. [HIGH] Nepal TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_NEP_TEST`
- **Country**: `NEP`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('NEP', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Nepal's TEST player pool so a valid 11-player lineup is always generated.

### 28. [MEDIUM] Nepal ODI Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_NEP_ODI`
- **Country**: `NEP`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Nepal ODI XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 29. [MEDIUM] Nepal T20I Playing XI has only 4 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_NEP_T20I`
- **Country**: `NEP`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Nepal T20I XI only has 4.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 30. [HIGH] Namibia TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_NAM_TEST`
- **Country**: `NAM`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('NAM', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Namibia's TEST player pool so a valid 11-player lineup is always generated.

### 31. [HIGH] United States TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_USA_TEST`
- **Country**: `USA`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('USA', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate United States's TEST player pool so a valid 11-player lineup is always generated.

### 32. [MEDIUM] United States ODI Playing XI has only 2 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_USA_ODI`
- **Country**: `USA`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. United States ODI XI only has 2.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 33. [MEDIUM] United States T20I Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_USA_T20I`
- **Country**: `USA`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. United States T20I XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 34. [HIGH] United Arab Emirates TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_UAE_TEST`
- **Country**: `UAE`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('UAE', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate United Arab Emirates's TEST player pool so a valid 11-player lineup is always generated.

### 35. [MEDIUM] United Arab Emirates ODI Playing XI has only 2 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_UAE_ODI`
- **Country**: `UAE`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. United Arab Emirates ODI XI only has 2.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 36. [MEDIUM] United Arab Emirates T20I Playing XI has only 2 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_UAE_T20I`
- **Country**: `UAE`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. United Arab Emirates T20I XI only has 2.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 37. [HIGH] Oman TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_OMA_TEST`
- **Country**: `OMA`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('OMA', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Oman's TEST player pool so a valid 11-player lineup is always generated.

### 38. [MEDIUM] Oman ODI Playing XI has only 0 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_OMA_ODI`
- **Country**: `OMA`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Oman ODI XI only has 0.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 39. [MEDIUM] Oman T20I Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_OMA_T20I`
- **Country**: `OMA`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Oman T20I XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 40. [HIGH] Canada TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_CAN_TEST`
- **Country**: `CAN`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('CAN', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Canada's TEST player pool so a valid 11-player lineup is always generated.

### 41. [HIGH] Navneet Dhaliwal (RETIRED, MALE) is auto-selected in Canada's current ODI Playing XI
- **Issue ID**: `non_active_in_xi_CAN_ODI_PLY_CAN_012`
- **Country**: `CAN`
- **Format**: `ODI`
- **Player ID**: `PLY_CAN_012`
- **Details**: Because Navneet Dhaliwal has a high ODI rating (66), getDefaultFormatSquadConfig includes them in Canada's active ODI Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 42. [MEDIUM] Canada ODI Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_CAN_ODI`
- **Country**: `CAN`
- **Format**: `ODI`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Canada ODI XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 43. [HIGH] Navneet Dhaliwal (RETIRED, MALE) is auto-selected in Canada's current T20I Playing XI
- **Issue ID**: `non_active_in_xi_CAN_T20I_PLY_CAN_012`
- **Country**: `CAN`
- **Format**: `T20I`
- **Player ID**: `PLY_CAN_012`
- **Details**: Because Navneet Dhaliwal has a high T20I rating (66), getDefaultFormatSquadConfig includes them in Canada's active T20I Playing XI despite status='RETIRED' and gender='MALE'.
- **Recommendation**: Exclude LEGEND, RETIRED, and FEMALE players from default active men's national Playing XIs.

### 44. [HIGH] Papua New Guinea TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_PNG_TEST`
- **Country**: `PNG`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('PNG', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Papua New Guinea's TEST player pool so a valid 11-player lineup is always generated.

### 45. [HIGH] Papua New Guinea ODI Playing XI has only 5/11 players
- **Issue ID**: `incomplete_xi_PNG_ODI`
- **Country**: `PNG`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('PNG', 'ODI') produces a Playing XI of length 5 (Tony Pala Ura, Norman Vanua, Asadollah Vala, Sese Bau, Kabua Vagi Morea).
- **Recommendation**: Populate Papua New Guinea's ODI player pool so a valid 11-player lineup is always generated.

### 46. [MEDIUM] Papua New Guinea ODI designated Wicketkeeper 'Norman Vanua' is a ALL_ROUNDER (not a Wicketkeeper)
- **Issue ID**: `non_wk_assigned_PNG_ODI`
- **Country**: `PNG`
- **Format**: `ODI`
- **Player ID**: `PLY_PNG_010`
- **Details**: No eligible wicketkeeper was found for Papua New Guinea in ODI, so getDefaultWicketKeeperId fell back to squad[2] ('Norman Vanua', role=ALL_ROUNDER).
- **Recommendation**: Add a specialist WICKETKEEPER_BATTER for Papua New Guinea in ODI.

### 47. [MEDIUM] Papua New Guinea T20I Playing XI has only 3 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_PNG_T20I`
- **Country**: `PNG`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Papua New Guinea T20I XI only has 3.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

### 48. [HIGH] Indonesia TEST Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_IDN_TEST`
- **Country**: `IDN`
- **Format**: `TEST`
- **Details**: getDefaultFormatSquadConfig('IDN', 'TEST') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Indonesia's TEST player pool so a valid 11-player lineup is always generated.

### 49. [HIGH] Indonesia ODI Playing XI has only 0/11 players
- **Issue ID**: `incomplete_xi_IDN_ODI`
- **Country**: `IDN`
- **Format**: `ODI`
- **Details**: getDefaultFormatSquadConfig('IDN', 'ODI') produces a Playing XI of length 0 (none).
- **Recommendation**: Populate Indonesia's ODI player pool so a valid 11-player lineup is always generated.

### 50. [MEDIUM] Indonesia T20I Playing XI has only 0 bowling options (needs at least 5)
- **Issue ID**: `insufficient_bowlers_IDN_T20I`
- **Country**: `IDN`
- **Format**: `T20I`
- **Details**: In limited-overs and Test cricket, a team needs at least 5 bowlers/all-rounders to bowl full quotas. Indonesia T20I XI only has 0.
- **Recommendation**: Ensure Playing XI selection includes at least 5 combined BOWLER + ALL_ROUNDER options.

## 7. Schema & Tour Squad Anomalies (7)
### 1. [MEDIUM] Announced Tour Squad for 'Border-Gavaskar Trophy (India tour of Australia)' has only 12 players (requires 15-20)
- **Issue ID**: `undersized_tour_squad_tour_bgt_2026_27`
- **Details**: Tour 'tour_bgt_2026_27' has squadAnnounced=true, but tourSquadIds only lists 12 players (ind_rohit, ind_jaiswal, ind_gill, ind_virat, ind_pant, ind_rahane, ind_jadeja, ind_bumrah, ind_shiraz, ind_shami, ind_kuldeep, ind_axar).
- **Recommendation**: Expand initial announced tourSquadIds to 15-18 players.

### 2. [LOW] Upcoming Tour 'The Ashes Series (England tour of Australia)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_ashes_2027`
- **Details**: Tour 'tour_ashes_2027' (2027-01-14 to 2027-02-28) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-01-05.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 3. [LOW] Upcoming Tour 'South Africa Tour of India (Multi-Format Bilateral Series)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_sa_ind_2027`
- **Details**: Tour 'tour_sa_ind_2027' (2027-03-05 to 2027-04-10) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-02-24.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 4. [LOW] Upcoming Tour 'Pakistan Tour of Australia (Bilateral Test & ODI Tour)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_pak_aus_2027`
- **Details**: Tour 'tour_pak_aus_2027' (2027-04-15 to 2027-05-18) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-04-01.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 5. [LOW] Upcoming Tour 'ICC World Test Championship Final (Lord’s)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_wtc_final_2027`
- **Details**: Tour 'tour_wtc_final_2027' (2027-06-10 to 2027-06-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-05-25.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 6. [LOW] Upcoming Tour 'Anthony de Mello Trophy (India Tour of England)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_eng_ind_pataudi`
- **Details**: Tour 'tour_eng_ind_pataudi' (2027-07-02 to 2027-08-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-06-20.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.

### 7. [LOW] Upcoming Tour 'ICC Men’s Cricket World Cup 2027 (Southern Africa)' has an empty tourSquadIds array (0 players)
- **Issue ID**: `empty_upcoming_tour_squad_tour_cwc_2027`
- **Details**: Tour 'tour_cwc_2027' (2027-10-01 to 2027-11-15) currently has tourSquadIds: [] awaiting selection prior to deadline 2027-09-10.
- **Recommendation**: Provide a default provisional 15-player touring squad or auto-populate on deadline if the user has not manually selected one.
