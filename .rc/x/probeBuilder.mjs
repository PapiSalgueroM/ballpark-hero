// Release BL probe (not committed): makes the AppearanceBuilder in the current checkout log, on every render with the
// hair or beard tab open, the sport it was given, the list length it shows and the look's hair, so the US board replay
// can say what the NBA create screen renders at m3. Fails closed unless the anchor exists exactly once.
import fs from 'node:fs';
const file = 'src/components/soccer-career/AppearanceBuilder.tsx';
const body = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const anchor = '  const copy = careerAppearanceCopy(sport);\n';
if (body.split(anchor).length !== 2) { console.log('probeBuilder: anchor not found once'); process.exit(2); }
const probe = anchor + '  if ((tab === "hair" || tab === "beard") && typeof process !== "undefined" && process.env.BLPROBE) console.log("BLPROBE " + JSON.stringify({ sport, tab, n: tab === "hair" ? (typeof hairstyles !== "undefined" ? hairstyles : HAIRSTYLES).length : (typeof facialHair !== "undefined" ? facialHair : FACIAL_HAIR).length, hair: appearance.hairstyle, colour: appearance.hairColor, beard: appearance.facialHair }));\n';
fs.writeFileSync(file, body.replace(anchor, probe));
console.log('probeBuilder: probe in');
