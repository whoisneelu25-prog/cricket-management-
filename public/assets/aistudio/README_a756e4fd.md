# International Cricket Master Player & Lineup Dataset (2025–2026)

**Dataset Version / Research Cutoff:** `2026-11-03`  
**Primary Research Window:** `2025-01-01` to `2026-11-03` (inclusive)  
**Target Application:** *International Cricket Manager* (Men's Senior International Cricket Database)

## 1. Executive Summary & Key Metrics
- **Total Unique Players:** `597` verified international players (`players/all_players.json` & `players/all_players.csv`)
- **Countries Covered:** `21` core national teams (`12` ICC Full Members: `IND`, `AUS`, `ENG`, `PAK`, `RSA`, `NZL`, `SL`, `BAN`, `WI`, `AFG`, `IRE`, `ZIM` + `9` Associate Members: `SCO`, `NED`, `NEP`, `NAM`, `USA`, `UAE`, `OMA`, `CAN`, `PNG`) plus `1` expandable Associate opponent (`IDN`)
- **Researched International Matches (1 Jan 2025 – 3 Nov 2026):** `575` completed matches (`67` Tests, `244` ODIs, `264` T20Is)
- **Verified Match Lineups & Playing XIs:** `59` complete match lineup records (`15` Test, `20` ODI, `24` T20I) containing `118` verified 11-player Playing XIs (`1,298` batting-order slots)
- **Format-Specific Squad Records:** `53` national squads (`12` Test, `20` ODI, `21` T20I)
- **Selection-Pool Records:** `1294` format-specific player selection pool entries (`squads/selection_pools.json`)
- **Format Captaincy Records:** `53` verified format captain & vice-captain records (`captains/format_captains.json`)
- **Validation Status:** `15/15` automated validation checks passed (`validation_report.json`)

## 2. Directory Structure
```
International_Cricket_Master_Dataset/
├── README.md
├── data_dictionary.json
├── source_manifest.json
├── validation_report.json
├── countries/
│   └── countries.json
├── players/
│   ├── all_players.json
│   ├── all_players.csv
│   ├── player_format_statistics.json
│   └── player_availability.json
├── squads/
│   ├── test_squads.json
│   ├── odi_squads.json
│   ├── t20i_squads.json
│   └── selection_pools.json
├── matches/
│   ├── test_matches.json
│   ├── odi_matches.json
│   ├── t20i_matches.json
│   ├── test_lineups.json
│   ├── odi_lineups.json
│   └── t20i_lineups.json
├── captains/
│   └── format_captains.json
└── summaries/
    ├── country_coverage.json
    ├── format_coverage.json
    └── missing_data_report.json
```

## 3. Data Integrity & Zero-Fabrication Standards
1. **No Fictional Data or Game Ratings:** All records reflect real-world senior men's international cricket through `2026-11-03`. No synthetic player skill ratings or fictional attributes are included.
2. **Explicit `null` Policy:** Wherever granular statistical splits (such as career balls faced, fours, sixes, or unretrieved Playing XIs for secondary bilateral fixtures) were not available in verified sources, fields are explicitly set to `null`.
3. **Referential Integrity:** Every `player_id` referenced in `matches/*_lineups.json`, `squads/*_squads.json`, `squads/selection_pools.json`, and `captains/format_captains.json` resolves to a unique record in `players/all_players.json`.
