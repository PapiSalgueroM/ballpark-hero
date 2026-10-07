import type { GameContentMap } from './types';

export const COURT_LIFE_CONTENT: GameContentMap = {
  '/court-life': {
    intro: [
      'Court Life puts you inside a fictional neighborhood basketball season. You control one player in full-court three-on-three games while your teammates find space, pass, shoot and defend. Every basket comes from the ball crossing the hoop, and the match recap comes from the same plays you saw on court.',
      'The games are only part of your career. Before each fixture, decide how to spend two time blocks and handle one choice from life off the court. Training costs credits and energy. Work pays, but leaves less in your legs. Time with your crew builds trust. A six-game season ends with a table, your stats and a chapter that stays with your player.',
    ],
    headings: {
      howToPlay: 'How to play Court Life', rules: 'Court Life basketball and career rules',
      example: 'Court Life worked example', tips: 'Court Life tips for your next game', faq: 'Court Life questions',
    },
    howToPlaySections: [
      { heading: 'Create your player and choose a crew', items: [
        'Give your player a name, choose one of five playing styles and join one of four crews. Every style starts with the same total attribute points. The finisher is strongest around the basket, the shooter farther out, the connector at passing, the stopper on defense and the runner at conditioning.',
        'Read the controls and house rules before starting. The question mark reopens the full instructions whenever you need them. All crews and players are fictional, and you can play without an account.',
      ] },
      { heading: 'Prepare for the fixture', items: [
        'Open Your day to spend two time blocks. Train one skill, recover, work a shift or join a team session. Each action shows the actual change it will make. Recovery costs no credits, so a low balance cannot prevent you from reaching the next match.',
        'Open Life off court and choose how to handle the current situation. Your condition, credits and trust help determine what comes up. Finish both time blocks and your life choice, then choose Go to the court.',
      ] },
      { heading: 'Control your next possession', items: [
        'The gold ring marks your player. On a phone, drag the movement pad and use the three action buttons. With a keyboard, click the court, move with the arrow keys or W A S D, and use J, K and L for the three actions. Escape pauses.',
        'With the ball, hold Shoot and release when the meter reaches the gold window. Pass sends the ball toward the teammate with the dashed ring. Without the ball on offense, Call asks for a pass. On defense, use Steal, Jump and Guard. Sprint and defensive actions use stamina.',
        'At halftime, choose Next period, then start when ready. After the final whistle, open the match stats and finish the game to return to your day. The other two crews play their fixture through the same basketball engine.',
      ] },
    ],
    ruleSections: [
      { heading: 'Short matches with physical outcomes', items: [
        'Each game has two 75-second halves and a 12-second possession clock. Shots inside the arc count for two points and shots outside it count for three. A released shot stays live at the horn until its outcome. A shot is only scored after the ball falls through the hoop.',
        'Passes travel through the court, so defenders can intercept them. Reachable shots can be blocked, misses can rebound and balls can go out of bounds. An expired shot clock changes possession. There are no fouls, free throws or substitutions in these house rules.',
        'A tied game gets up to two 30-second overtimes. If it is still tied, the result is a draw. Four crews play each other twice. Table order uses two points per win and one per draw, then scoring difference, points scored and crew ID.',
      ] },
      { heading: 'Growth, trust and saved progress', items: [
        'Condition affects your starting stamina. Attributes affect your actual basketball actions and stop at 95. Training gains slow near that ceiling. Trust improves team chemistry and raises your priority on inbounds and pass calls. A teammate still needs an open passing lane.',
        'You begin as a Newcomer, become a Trusted outlet at 40 trust and a Floor leader at 70. Assists, steals, blocks and winning help trust, while turnovers cost it. Match earnings and fatigue are applied once when you finish the game.',
        'Progress saves in this browser, including an active match and its ball, clock and random state. Help, switching tabs and losing focus pause the match. Refresh opens a saved match paused. If a save cannot be read, its original bytes stay untouched until you explicitly replace it.',
      ] },
      { heading: 'A season score out of 100', items: [
        'A completed six-game season earns up to 50 points for results, with draws counting as half a win. Your first 60 player points earn up to 20 more. Teamwork earns up to 20 from two credits per assist and one per steal, block and rebound, capped at 36 credits.',
        'Ball security starts at 10 score points and falls to zero across 18 turnovers. Add the four categories and round once. Unfinished seasons earn no site score. Starting the next season preserves your attributes, resources and career chapters without awarding the previous score again.',
      ] },
    ],
    exampleSections: [
      { heading: 'Give your first match a good start', paragraphs: [
        'Suppose you choose the connector and join the Copper Owls. You start with 85 condition, 18 credits and 25 trust. Recovering uses one time block and raises condition to its cap of 100. Training passing uses the other, spends six credits and 12 condition, and adds two passing points.',
        'You decide to stay for an extra run with the crew. That costs ten condition, adds eight trust and one more passing point. You reach the fixture with 78 condition, 12 credits, 33 trust and 81 passing. The immediate benefit is stronger passing; you still need more trust to earn the next role.',
      ] },
      { heading: 'Turn a good decision into a good possession', paragraphs: [
        'On court, pass to a teammate with room, move toward the basket and call for the return. If the lane is open, your teammate can get the ball back to you. Hold Shoot and release inside the gold window. A defender can still contest it, and a miss is still a live rebound.',
        'Imagine you finish the season with four wins, 30 points, 18 teamwork credits and nine turnovers. Results earn 33.33 points, scoring earns 10, teamwork earns 10 and security earns five. The rounded season score is 58 out of 100.',
      ] },
    ],
    tipSections: [
      { heading: 'Find space before asking for the ball', items: [
        'A call is an invitation, not a guaranteed pass. Move away from your defender and keep a clear lane to the ball. A higher role helps your priority, but it does not let the ball pass through an opponent.',
        'A good release is only one part of a shot. Distance, your relevant skill, stamina and the defender also matter. Passing out of a crowded lane gives your crew another chance to find an opening.',
      ] },
      { heading: 'Plan for the next game as well as this one', items: [
        'Training every time can leave you tired and short of credits. Recovery, a paid shift and time with the crew each solve a different problem. Read the displayed changes before committing your two time blocks.',
        'Use the season table and career chapters to see what your choices produced. Your recap records actual results and decisions, so you can compare a season focused on scoring with one built around passing and defense.',
      ] },
    ],
    faqs: [
      { q: 'Is Court Life based on real players or a real league?', a: 'No. The players, crews and neighborhood competition are fictional. The short match format is this game\'s own set of house rules.' },
      { q: 'Can I save in the middle of a game?', a: 'Yes. Court Life saves active match progress in this browser and checkpoints when you pause. Refresh opens the saved match paused with its ball and clock preserved.' },
      { q: 'Why did my shot miss inside the gold release window?', a: 'Release timing helps, but it is not a promised basket. Your relevant skill, distance, stamina and nearby defense also affect the actual flight.' },
      { q: 'How do I earn a bigger role?', a: 'Build trust through team time, life choices and useful play. Trusted outlet starts at 40 trust and Floor leader at 70. Roles improve inbound and pass-call priority.' },
      { q: 'Does finishing one game award a site score?', a: 'No. A site score is earned after all six games of a season. The score is capped at 100 and combines results, scoring, teamwork and ball security.' },
    ],
  },
};
