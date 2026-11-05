/**
 * Curated player headshots mapping by player ID.
 * Returns authentic player photograph URLs where verified, or undefined for high-fidelity stylized vector avatars.
 */
export const PLAYER_HEADSHOTS: Record<string, string> = {
  // India
  'ind_rohit_sharma': 'https://resources.pulse.icc-cricket.com/players/284/107.png',
  'ind_virat_kohli': 'https://resources.pulse.icc-cricket.com/players/284/164.png',
  'ind_jasprit_bumrah': 'https://resources.pulse.icc-cricket.com/players/284/1124.png',
  'ind_ravindra_jadeja': 'https://resources.pulse.icc-cricket.com/players/284/9.png',
  'ind_hardik_pandya': 'https://resources.pulse.icc-cricket.com/players/284/2740.png',
  'ind_shubman_gill': 'https://resources.pulse.icc-cricket.com/players/284/3752.png',
  'ind_rishabh_pant': 'https://resources.pulse.icc-cricket.com/players/284/2972.png',
  'ind_suryakumar_yadav': 'https://resources.pulse.icc-cricket.com/players/284/1180.png',
  'ind_kl_rahul': 'https://resources.pulse.icc-cricket.com/players/284/1125.png',
  'ind_mohammed_shami': 'https://resources.pulse.icc-cricket.com/players/284/94.png',
  'ind_mohammed_siraj': 'https://resources.pulse.icc-cricket.com/players/284/3840.png',
  'ind_kuldeep_yadav': 'https://resources.pulse.icc-cricket.com/players/284/261.png',
  'ind_yashasvi_jaiswal': 'https://resources.pulse.icc-cricket.com/players/284/4436.png',

  // Australia
  'aus_pat_cummins': 'https://resources.pulse.icc-cricket.com/players/284/488.png',
  'aus_travis_head': 'https://resources.pulse.icc-cricket.com/players/284/1020.png',
  'aus_steve_smith': 'https://resources.pulse.icc-cricket.com/players/284/271.png',
  'aus_marnus_labuschagne': 'https://resources.pulse.icc-cricket.com/players/284/4346.png',
  'aus_mitchell_starc': 'https://resources.pulse.icc-cricket.com/players/284/490.png',
  'aus_josh_hazlewood': 'https://resources.pulse.icc-cricket.com/players/284/857.png',
  'aus_glenn_maxwell': 'https://resources.pulse.icc-cricket.com/players/284/282.png',
  'aus_nathan_lyon': 'https://resources.pulse.icc-cricket.com/players/284/262.png',
  'aus_adam_zampa': 'https://resources.pulse.icc-cricket.com/players/284/958.png',

  // England
  'eng_ben_stokes': 'https://resources.pulse.icc-cricket.com/players/284/1154.png',
  'eng_joe_root': 'https://resources.pulse.icc-cricket.com/players/284/887.png',
  'eng_harry_brook': 'https://resources.pulse.icc-cricket.com/players/284/4932.png',
  'eng_jos_buttler': 'https://resources.pulse.icc-cricket.com/players/284/509.png',
  'eng_jofra_archer': 'https://resources.pulse.icc-cricket.com/players/284/3547.png',
  'eng_mark_wood': 'https://resources.pulse.icc-cricket.com/players/284/2567.png',

  // Pakistan
  'pak_babar_azam': 'https://resources.pulse.icc-cricket.com/players/284/275.png',
  'pak_shaheen_afridi': 'https://resources.pulse.icc-cricket.com/players/284/4530.png',
  'pak_mohammad_rizwan': 'https://resources.pulse.icc-cricket.com/players/284/127.png',
  'pak_naseem_shah': 'https://resources.pulse.icc-cricket.com/players/284/5392.png',

  // South Africa
  'rsa_kagiso_rabada': 'https://resources.pulse.icc-cricket.com/players/284/1664.png',
  'rsa_heinrich_klaasen': 'https://resources.pulse.icc-cricket.com/players/284/3482.png',
  'rsa_aiden_markram': 'https://resources.pulse.icc-cricket.com/players/284/1665.png',
  'rsa_anrich_nortje': 'https://resources.pulse.icc-cricket.com/players/284/5433.png',

  // New Zealand
  'nzl_kane_williamson': 'https://resources.pulse.icc-cricket.com/players/284/440.png',
  'nzl_rachin_ravindra': 'https://resources.pulse.icc-cricket.com/players/284/4836.png',
  'nzl_trent_boult': 'https://resources.pulse.icc-cricket.com/players/284/547.png',
  'nzl_mitchell_santner': 'https://resources.pulse.icc-cricket.com/players/284/1903.png',

  // Afghanistan
  'afg_rashid_khan': 'https://resources.pulse.icc-cricket.com/players/284/2887.png',
  'afg_rahmanullah_gurbaz': 'https://resources.pulse.icc-cricket.com/players/284/4791.png',
  'afg_fazalhaq_farooqi': 'https://resources.pulse.icc-cricket.com/players/284/5319.png',
};

export function getPlayerHeadshotUrl(playerId: string): string | undefined {
  return PLAYER_HEADSHOTS[playerId];
}
