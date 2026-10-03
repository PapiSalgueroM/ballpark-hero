import { ACCESSORIES, BOOTS, CELEBRATIONS } from '@/lib/soccerCareerAppearance';

export type AppearanceSport = 'soccer' | 'nfl' | 'nba' | 'mlb' | 'nhl';
type Pose = { label: string; emoji: string; line: string };

const SPORT_COPY = {
  nfl: {
    gearLabel: 'Cleats', gearEmoji: '👟',
    firstPose: { label: 'Sideline Salute', emoji: '🫡', line: 'raise a hand toward your sideline' },
    iceCold: 'stay composed and turn back toward your sideline',
  },
  nba: {
    gearLabel: 'Sneakers', gearEmoji: '👟',
    firstPose: { label: 'Crowd Point', emoji: '☝️', line: 'point toward the crowd with one arm raised' },
    iceCold: 'stay composed and head back down the court',
  },
  mlb: {
    gearLabel: 'Cleats', gearEmoji: '👟',
    firstPose: { label: 'Dugout Point', emoji: '☝️', line: 'point toward your dugout' },
    iceCold: 'stay composed and nod toward the dugout',
  },
  nhl: {
    gearLabel: 'Skates', gearEmoji: '⛸️',
    firstPose: { label: 'Stick Raise', emoji: '🏒', line: 'raise your stick to the crowd' },
    iceCold: 'stay composed and skate back into position',
  },
};

// These descriptions change the presentation, never the stored IDs or draws.
const GEAR_COLORS: Record<string, string> = {
  vortex_strike: 'bright red', vortex_ghost: 'clean white', kinetiq_blaze: 'bold orange',
  kinetiq_void: 'midnight black', aurora_nine: 'mint green', aurora_royal: 'deep blue',
  pulse_gold: 'gold', pulse_venom: 'rich purple', retro_classica: 'classic black',
  bubblegum: 'bubblegum pink', vortex_frost: 'ice blue', kinetiq_flare: 'bright yellow',
  aurora_dusk: 'muted purple', pulse_copper: 'burnt copper', terrace_navy: 'dark navy',
  sunday_league: 'soft grey', carnival: 'bright green', midnight_chrome: 'gunmetal grey',
};

// One set of standing poses works across the four sports, including on skates.
const POSES: Record<string, Pose> = {
  knee_slide: { label: 'Crowd Point', emoji: '☝️', line: 'point toward the crowd' },
  statue: { label: 'The Statue', emoji: '🗿', line: 'hold a still pose with your chin up' },
  backflip: { label: 'Fist Pump', emoji: '✊', line: 'punch one fist into the air' },
  shush: { label: 'The Shush', emoji: '🤫', line: 'raise one finger toward the crowd' },
  heart_hands: { label: 'Family Point', emoji: '🫶', line: 'point toward family in the stands' },
  robot: { label: 'Robot Arms', emoji: '🤖', line: 'hold your arms in a stiff robot pose' },
  cradle: { label: 'Family Salute', emoji: '👶', line: 'tap your chest for your family' },
  binoculars: { label: 'Crowd Scan', emoji: '🔭', line: 'shade your eyes and scan the stands' },
  phone_call: { label: 'Call Me', emoji: '📞', line: 'hold a hand beside your ear like a phone' },
  sleeper: { label: 'Head Tilt', emoji: '😴', line: 'tilt your head onto your shoulder for a sleepy pose' },
  arms_wide: { label: 'Arms Wide', emoji: '🛩️', line: 'spread your arms toward the crowd' },
  point_sky: { label: 'Point To The Sky', emoji: '☝️', line: 'point upward for someone special' },
  badge_kiss: { label: 'Chest Tap', emoji: '👊', line: 'tap your chest and nod to the crowd' },
  cartwheel: { label: 'Double Fist Pump', emoji: '🙌', line: 'raise both fists in a quick celebration' },
  sit_down: { label: 'Cool Nod', emoji: '😎', line: 'give the crowd one slow, calm nod' },
  dance_off: { label: 'Shoulder Shimmy', emoji: '🕺', line: 'give your shoulders a quick shimmy' },
  salute: { label: 'The Salute', emoji: '🫡', line: 'salute your teammates' },
  crowd_dive: { label: 'Crowd Wave', emoji: '👋', line: 'wave both arms toward the stands' },
  ice_cold: { label: 'Ice Cold', emoji: '🧊', line: 'stay composed and turn back toward your team' },
};

const ACCESSORY_LABELS: Record<string, string> = {
  captain: 'Armband', cap: 'Soft Cap', snood: 'Neck Warmer',
};

export function careerAppearanceCopy(sport: AppearanceSport = 'soccer') {
  if (sport === 'soccer') return {
    gearLabel: 'Boots', gearEmoji: '👟', boots: BOOTS, celebrations: CELEBRATIONS,
    accessories: ACCESSORIES, celebrationIntro: 'Every goal, you', styleNote: null,
  };
  const copy = SPORT_COPY[sport];
  return {
    gearLabel: copy.gearLabel,
    gearEmoji: copy.gearEmoji,
    boots: BOOTS.map(gear => ({
      ...gear,
      label: gear.id === 'sunday_league' ? 'Weekend Classic' : gear.label,
      flavor: `${copy.gearLabel} in ${GEAR_COLORS[gear.id] ?? 'your chosen colour'}.`,
    })),
    celebrations: CELEBRATIONS.map(pose => ({
      id: pose.id,
      ...(pose.id === 'knee_slide' ? copy.firstPose : POSES[pose.id] ?? POSES.statue),
      ...(pose.id === 'ice_cold' ? { line: copy.iceCold } : {}),
    })),
    accessories: ACCESSORIES.map(accessory => ({
      ...accessory, label: ACCESSORY_LABELS[accessory.id] ?? accessory.label,
    })),
    celebrationIntro: 'Signature pose:',
    styleNote: 'Fictional gear and signature poses, just for your look.',
  };
}
