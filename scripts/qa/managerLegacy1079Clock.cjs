/* Remote paired verification only. The harnesses keep their own later seeds. */
const RealDate = Date;
const fixed = RealDate.UTC(2026, 9, 1);
function VerificationDate(...args) {
  if (!new.target) return new RealDate(fixed).toString();
  return Reflect.construct(RealDate, args.length ? args : [fixed], new.target);
}
Object.setPrototypeOf(VerificationDate, RealDate);
VerificationDate.prototype = RealDate.prototype;
VerificationDate.now = () => fixed;
globalThis.Date = VerificationDate;
let seed = 0x1079;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};
