import type { GameContentMap } from './types';

export const FORMULA_CAREER_CONTENT: GameContentMap = {
  '/f1-career': {
    intro: [
      'Formula Career is a saved F1 driver career with a generated grid. Start in a small team, choose what to work on and decide how hard to push. Qualifying and the race run for all twenty drivers, so your points and the team championship come from the same results.',
      'The game uses the 24 Grand Prix events and full-race points from 2025. It is a simplified Grand Prix-only model: no Sprints, shortened-race rules, grid penalties or lap-by-lap physics. Every driver, team, performance, contract and result is generated. Later seasons reuse that calendar as a fictional template, not a real future schedule.',
      'Play signed out and keep your career in this browser. Read the whole field, compare the championships and consider the seats offered after a season. Opening a table or reading the rules never reruns a race.',
    ],
    headings: {
      howToPlay: 'How to play Formula Career',
      rules: 'Formula Career rules and F1 points',
      example: 'Formula Career example: points for both seats',
      tips: 'Formula Career tips for a saved driver career',
      faq: 'Formula Career FAQ: saves, teams and scoring',
    },
    howToPlay: [
      'Name your driver and start a new saved career. The other drivers and all ten teams are generated for that career.',
      'Before each weekend, choose pace, racecraft or composure as your training focus. Pick a careful, steady or attacking approach, then run qualifying.',
      'Read the full qualifying grid. All twenty drivers enter Q1, fifteen reach Q2 and ten reach Q3. Each session has its own generated times.',
      'Run the race once. Read every entrant, including retirements, and the points earned by the finishers.',
      'Open Driver standings or Team standings to see totals from the saved race results. Back returns to your current weekend.',
      'After the final Grand Prix, read the season result and your actual seat offers. You can negotiate an offer once before accepting it.',
      'A new seat swaps the outgoing generated driver into your old team. The whole world develops once before the next season, keeping twenty drivers in ten teams.',
      'Retire from a settled weekend, result or contract screen when you are ready. The career ends after twenty seasons at the latest, and its saved record stays readable.',
    ],
    rules: [
      'A season contains 24 Grand Prix events using the verified 2025 calendar order. Sprints and shortened-race points are not part of this game.',
      'The first ten eligible finishers earn 25, 18, 15, 12, 10, 8, 6, 4, 2 and 1 points. There is no fastest-lap bonus. A retired entrant earns no points in this simplified model.',
      'Qualifying cuts five drivers after Q1 and five after Q2. Q3 decides the first ten grid places, Q2 decides the next five and Q1 decides the last five. Times do not carry into the next session.',
      'Driver standings add saved race points. Team standings add the points earned by its two drivers at the time of each race, so a later seat move cannot move old points.',
      'Equal championship points compare wins, then second places and later finishing places. A remaining exact tie shares the rank in this game.',
      'The personal score is rounded point conversion: 100 times your GP points divided by 25 times your starts. Retirements count as starts. It is unranked and is not a real driver rating.',
      'Training, risk, driver attributes, team pace and reliability affect generated performances. There is no promised win, championship or better-seat offer.',
      'Each seat contract covers one season. Reading offers does not replace them, and each offer allows one negotiation decision.',
      'Every race, accepted contract and annual development is saved once. Refreshing resumes the same career rather than generating another result.',
      'The complete game has a twenty-season limit. All drivers, teams, salaries and incidents are invented game data. No real person is assigned an invented career or quote.',
    ],
    example: [
      'You finish fourth and your teammate finishes seventh. Fourth earns 12 points and seventh earns 6, so your team earns 18 from that race.',
      'You later move to another generated team. Those earlier 12 points still belong to the team you drove for in that race; your driver total follows you.',
      'After four starts you have 25 points. Your personal point conversion is 25 out of 100: 100 times 25 divided by 25 times four. It describes those starts, not your chances in the next race.',
    ],
    tips: [
      'Read your team pace and reliability before choosing how hard to push. An attacking approach is a choice, not a free improvement.',
      'Check the full result before blaming a poor start. Grid position, race performance and retirements describe different parts of the weekend.',
      'Compare both championships. A strong teammate can help the team even when you score less.',
      'Read the salary and negotiation outcome before signing. Offers describe the generated game world, not real racing contracts.',
      'Keep the same browser for your saved career. If saving fails, the game tells you and keeps the previous saved state.',
    ],
    faqs: [
      { q: 'Does Formula Career use real F1 drivers and teams?', a: 'No. The calendar and selected 2025 rules are verified, but every driver, team, attribute, salary and result is generated game data.' },
      { q: 'Is this the full real 2025 F1 championship?', a: 'No. It is a Grand Prix-only simplified career. There are no Sprints, shortened-race rules, regulatory grid penalties or lap-by-lap physics. Later seasons reuse a fictional version of the calendar.' },
      { q: 'Can I reload to get another race result?', a: 'Reloading reads the saved grid and race result. Reading a table, opening help or going Back does not draw a new result.' },
      { q: 'Does my career score go on a leaderboard?', a: 'No. Point conversion is a personal unranked number. Completed seasons and a settled retirement can record a play. Your point-conversion score stays off the leaderboard.' },
      { q: 'Can I play without an account?', a: 'Yes. The career saves in this browser. Clearing browser storage removes that save, and a save from another browser is not automatically available here.' },
    ],
  },
};
