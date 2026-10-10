import assert from 'node:assert/strict';
import fs from 'node:fs';
assert(process.env.CI, 'Unit receipts are checked on remote CI');
const receipt=JSON.parse(fs.readFileSync('career-programme-artifacts/units.json','utf8'));
const required={
  'src/lib/soccerCareerProgramme.test.ts':66,
  'src/test/soccerCareerProgrammeUi.test.tsx':34,
  'src/lib/usCareerProgramme.test.ts':55,
  'src/test/usCareerProgrammeUi.test.tsx':11,
  'src/lib/careerChanceWheel.test.ts':10,
  'src/test/careerChanceWheelUi.test.tsx':5,
  'src/test/soccerClubStartingElevenUi.test.tsx':9,
  'src/lib/soccerSeasonCalendar.test.ts':16,
  'src/test/soccerSeasonCalendarUi.test.tsx':8,
  'src/lib/soccerCupOpening.test.ts':14,
  'src/lib/soccerClubSquad.test.ts':1,
  'src/test/soccerSeasonCompetitions.test.tsx':1,
  'src/test/cookieConsentStorage.test.tsx':11,
  'src/test/helpConsentFocus.test.tsx':7,
};
assert.equal(receipt.numFailedTests,0);assert.equal(receipt.numFailedTestSuites,0);
for(const[file,floor]of Object.entries(required)){const suite=receipt.testResults.find(s=>s.name.replaceAll('\\','/').endsWith('/'+file));assert(suite,'Actual suite ran: '+file);assert(suite.assertionResults.length>=floor,'Actual case floor: '+file);assert(suite.assertionResults.every(t=>t.status==='passed'),'No skipped or failed cases: '+file);}
console.log('All 14 required suites actually passed: '+receipt.numPassedTests+' cases.');
