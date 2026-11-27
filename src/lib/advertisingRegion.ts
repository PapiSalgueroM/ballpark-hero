// Keep only the applicable default in memory for this document.
const optInCountries = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE IS LI NO GB CH AX GF GP MQ RE YT MF GI SJ'.split(' '));
const countries = new Set(('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
  'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ ' +
  'TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' '));

export function allowsRegionalAds(trace: string, host: string): boolean {
  const codes = [...trace.matchAll(/^loc=([^\r\n]*)$/gm)];
  const hosts = [...trace.matchAll(/^h=([^\r\n]*)$/gm)];
  return hosts.length === 1 && hosts[0][1] === host && codes.length === 1 &&
    countries.has(codes[0][1]) && !optInCountries.has(codes[0][1]);
}

let outside = false;
let settled = false;
let lookup: Promise<void> | undefined;
export const hasRegionalAdDefault = () => outside;

export const regionalLookupPending = () => !settled && location.origin === 'https://douknowball.com' && !Reflect.get(window, '__DUKB_PRERENDER__');

export function resolveAdvertisingRegion(): Promise<void> {
  if (lookup) return lookup;
  if (location.origin !== 'https://douknowball.com' || Reflect.get(window, '__DUKB_PRERENDER__')) return Promise.resolve();
  lookup = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch('/cdn-cgi/trace', {
        cache: 'no-store', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal,
      });
      if (response.ok && response.headers.get('content-type')?.startsWith('text/plain')) {
        outside = allowsRegionalAds(await response.text(), location.hostname);
      }
    } catch { /* Without a confirmed region the site asks first. */ }
    finally { settled = true; window.clearTimeout(timeout); }
  })();
  return lookup;
}
