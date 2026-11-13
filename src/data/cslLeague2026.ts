/** Verified 2026 membership and starting deductions. Squads and fixtures are simulated. */
export const CSL_LEAGUE_2026 = {
  id: 'csl',
  label: 'Chinese Super League',
  country: 'China',
  year: 2026,
  clubs: [
    'Shanghai Port', 'Shanghai Shenhua', 'Chengdu Rongcheng', 'Beijing Guoan',
    'Shandong Taishan', 'Tianjin Jinmen Tiger', 'Zhejiang FC', 'Yunnan Yukun',
    'Qingdao West Coast', 'Henan FC', 'Dalian Yingbo', 'Shenzhen Peng City',
    'Wuhan Three Towns', 'Qingdao Hainiu', 'Liaoning Tieren', 'Chongqing Tonglianglong',
  ] as readonly string[],
};

/** CFA's 29 January decision, reconciled with the completed 2026 standings. */
export const CSL_OPENING_POINTS: Readonly<Record<string, number>> = {
  'Shanghai Shenhua': -10,
  'Tianjin Jinmen Tiger': -10,
  'Qingdao Hainiu': -7,
  'Shandong Taishan': -6,
  'Henan FC': -6,
  'Beijing Guoan': -5,
  'Shanghai Port': -5,
  'Zhejiang FC': -5,
  'Wuhan Three Towns': -5,
};
