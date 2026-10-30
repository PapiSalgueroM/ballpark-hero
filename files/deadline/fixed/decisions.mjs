var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/lz-string/libs/lz-string.js
var require_lz_string = __commonJS({
  "node_modules/lz-string/libs/lz-string.js"(exports, module) {
    var LZString = function() {
      var f = String.fromCharCode;
      var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
      var baseReverseDic = {};
      function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
          baseReverseDic[alphabet] = {};
          for (var i = 0; i < alphabet.length; i++) {
            baseReverseDic[alphabet][alphabet.charAt(i)] = i;
          }
        }
        return baseReverseDic[alphabet][character];
      }
      var LZString2 = {
        compressToBase64: function(input) {
          if (input == null) return "";
          var res = LZString2._compress(input, 6, function(a) {
            return keyStrBase64.charAt(a);
          });
          switch (res.length % 4) {
            default:
            case 0:
              return res;
            case 1:
              return res + "===";
            case 2:
              return res + "==";
            case 3:
              return res + "=";
          }
        },
        decompressFromBase64: function(input) {
          if (input == null) return "";
          if (input == "") return null;
          return LZString2._decompress(input.length, 32, function(index) {
            return getBaseValue(keyStrBase64, input.charAt(index));
          });
        },
        compressToUTF16: function(input) {
          if (input == null) return "";
          return LZString2._compress(input, 15, function(a) {
            return f(a + 32);
          }) + " ";
        },
        decompressFromUTF16: function(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString2._decompress(compressed.length, 16384, function(index) {
            return compressed.charCodeAt(index) - 32;
          });
        },
        //compress into uint8array (UCS-2 big endian format)
        compressToUint8Array: function(uncompressed) {
          var compressed = LZString2.compress(uncompressed);
          var buf = new Uint8Array(compressed.length * 2);
          for (var i = 0, TotalLen = compressed.length; i < TotalLen; i++) {
            var current_value = compressed.charCodeAt(i);
            buf[i * 2] = current_value >>> 8;
            buf[i * 2 + 1] = current_value % 256;
          }
          return buf;
        },
        //decompress from uint8array (UCS-2 big endian format)
        decompressFromUint8Array: function(compressed) {
          if (compressed === null || compressed === void 0) {
            return LZString2.decompress(compressed);
          } else {
            var buf = new Array(compressed.length / 2);
            for (var i = 0, TotalLen = buf.length; i < TotalLen; i++) {
              buf[i] = compressed[i * 2] * 256 + compressed[i * 2 + 1];
            }
            var result = [];
            buf.forEach(function(c) {
              result.push(f(c));
            });
            return LZString2.decompress(result.join(""));
          }
        },
        //compress into a string that is already URI encoded
        compressToEncodedURIComponent: function(input) {
          if (input == null) return "";
          return LZString2._compress(input, 6, function(a) {
            return keyStrUriSafe.charAt(a);
          });
        },
        //decompress from an output of compressToEncodedURIComponent
        decompressFromEncodedURIComponent: function(input) {
          if (input == null) return "";
          if (input == "") return null;
          input = input.replace(/ /g, "+");
          return LZString2._decompress(input.length, 32, function(index) {
            return getBaseValue(keyStrUriSafe, input.charAt(index));
          });
        },
        compress: function(uncompressed) {
          return LZString2._compress(uncompressed, 16, function(a) {
            return f(a);
          });
        },
        _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
          if (uncompressed == null) return "";
          var i, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
          for (ii = 0; ii < uncompressed.length; ii += 1) {
            context_c = uncompressed.charAt(ii);
            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
              context_dictionary[context_c] = context_dictSize++;
              context_dictionaryToCreate[context_c] = true;
            }
            context_wc = context_w + context_c;
            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
              context_w = context_wc;
            } else {
              if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 8; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                } else {
                  value = 1;
                  for (i = 0; i < context_numBits; i++) {
                    context_data_val = context_data_val << 1 | value;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = 0;
                  }
                  value = context_w.charCodeAt(0);
                  for (i = 0; i < 16; i++) {
                    context_data_val = context_data_val << 1 | value & 1;
                    if (context_data_position == bitsPerChar - 1) {
                      context_data_position = 0;
                      context_data.push(getCharFromInt(context_data_val));
                      context_data_val = 0;
                    } else {
                      context_data_position++;
                    }
                    value = value >> 1;
                  }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                  context_enlargeIn = Math.pow(2, context_numBits);
                  context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
              } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              context_dictionary[context_wc] = context_dictSize++;
              context_w = String(context_c);
            }
          }
          if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
              if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                  context_data_val = context_data_val << 1 | value;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                  context_data_val = context_data_val << 1 | value & 1;
                  if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i = 0; i < context_numBits; i++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
          }
          value = 2;
          for (i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1 | value & 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
          while (true) {
            context_data_val = context_data_val << 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data.push(getCharFromInt(context_data_val));
              break;
            } else context_data_position++;
          }
          return context_data.join("");
        },
        decompress: function(compressed) {
          if (compressed == null) return "";
          if (compressed == "") return null;
          return LZString2._decompress(compressed.length, 32768, function(index) {
            return compressed.charCodeAt(index);
          });
        },
        _decompress: function(length, resetValue, getNextValue) {
          var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i, w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
          for (i = 0; i < 3; i += 1) {
            dictionary[i] = i;
          }
          bits = 0;
          maxpower = Math.pow(2, 2);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          switch (next = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2, 8);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2, 16);
              power = 1;
              while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
              }
              c = f(bits);
              break;
            case 2:
              return "";
          }
          dictionary[3] = c;
          w = c;
          result.push(c);
          while (true) {
            if (data.index > length) {
              return "";
            }
            bits = 0;
            maxpower = Math.pow(2, numBits);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            switch (c = bits) {
              case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                  resb = data.val & data.position;
                  data.position >>= 1;
                  if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                  }
                  bits |= (resb > 0 ? 1 : 0) * power;
                  power <<= 1;
                }
                dictionary[dictSize++] = f(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
              case 2:
                return result.join("");
            }
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
            if (dictionary[c]) {
              entry = dictionary[c];
            } else {
              if (c === dictSize) {
                entry = w + w.charAt(0);
              } else {
                return null;
              }
            }
            result.push(entry);
            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            w = entry;
            if (enlargeIn == 0) {
              enlargeIn = Math.pow(2, numBits);
              numBits++;
            }
          }
        }
      };
      return LZString2;
    }();
    if (typeof define === "function" && define.amd) {
      define(function() {
        return LZString;
      });
    } else if (typeof module !== "undefined" && module != null) {
      module.exports = LZString;
    } else if (typeof angular !== "undefined" && angular != null) {
      angular.module("LZString", []).factory("LZString", function() {
        return LZString;
      });
    }
  }
});

// src/lib/nameFold.ts
var SPECIALS = {
  "\xF8": "o",
  "\xD8": "o",
  "\u0111": "d",
  "\u0110": "d",
  "\xF0": "d",
  "\xD0": "d",
  "\u0142": "l",
  "\u0141": "l",
  "\xE6": "ae",
  "\xC6": "ae",
  "\u0153": "oe",
  "\u0152": "oe",
  "\xDF": "ss",
  "\xFE": "th",
  "\xDE": "th",
  "\u0127": "h",
  "\u0126": "h",
  "\u0131": "i",
  "\u0130": "i",
  "\u014B": "n",
  "\u014A": "n"
};
var SPECIALS_RE = new RegExp(`[${Object.keys(SPECIALS).join("")}]`, "g");

// src/lib/nameModeration.ts
var LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "i",
  "(": "c"
};
function fold(s2) {
  return (s2 || "").toLowerCase().split("").map((c) => LEET[c] ?? c).join("").replace(/[^a-z]/g, "");
}
var RESERVED_ROLE = "(?:admin|administrator|moderator|support|system|official|verified)";
var RESERVED_AUTHORITY = `(?:${RESERVED_ROLE}(?:${RESERVED_ROLE}|staff|team|account)?|staff|team|account)`;
var RESERVED_SITE = "(?:douknowball|doyouknowball|dukb)";
var RESERVED_NAME = new RegExp(`^(?:the)?(?:${RESERVED_ROLE}(?:${RESERVED_ROLE}|staff|team|account)?|(?:${RESERVED_AUTHORITY})?${RESERVED_SITE}(?:${RESERVED_AUTHORITY})?)$`);
function collapseRuns(s2) {
  return s2.replace(/(.)\1{2,}/g, "$1");
}
var RAW_BLOCKED = [
  // sexual / explicit
  "fuck",
  "fuk",
  "fuc",
  "motherfucker",
  "fucker",
  "fucking",
  "shit",
  "bullshit",
  "bitch",
  "biatch",
  "cunt",
  "cock",
  "dick",
  "penis",
  "vagina",
  "pussy",
  "cum",
  "jizz",
  "boob",
  "tits",
  "titties",
  "blowjob",
  "handjob",
  "anal",
  "anus",
  "butthole",
  "asshole",
  "dumbass",
  "jackass",
  "dildo",
  "horny",
  "orgasm",
  "porn",
  "pornhub",
  "xxx",
  "sex",
  "sexy",
  "slut",
  "whore",
  "hoe",
  "skank",
  "wank",
  "wanker",
  "bollocks",
  "bugger",
  "twat",
  "prick",
  "knob",
  "boner",
  "nutsack",
  "ballsack",
  "scrotum",
  "clit",
  "creampie",
  "deepthroat",
  "masturbate",
  "ejaculate",
  "coochie",
  "fanny",
  "smegma",
  "queef",
  // excretory / crude
  "crap",
  "turd",
  "poop",
  "piss",
  "pissoff",
  "douche",
  "douchebag",
  // slurs (racial / ethnic / homophobic / ableist / religious) and evasions
  "nigger",
  "nigga",
  "niger",
  "negro",
  "coon",
  "chink",
  "gook",
  "spic",
  "wetback",
  "beaner",
  "kike",
  "kyke",
  "raghead",
  "towelhead",
  "sandnigger",
  "paki",
  "jap",
  "nip",
  "wop",
  "dago",
  "cracker",
  "honky",
  "redskin",
  "faggot",
  "fagot",
  "faggit",
  "fag",
  "dyke",
  "tranny",
  "shemale",
  "homo",
  "queer",
  "retard",
  "retarded",
  "tard",
  "spastic",
  "mongoloid",
  "cripple",
  // hate / violence
  "nazi",
  "hitler",
  "kkk",
  "klux",
  "rape",
  "rapist",
  "pedo",
  "pedophile",
  "molest",
  "terrorist",
  "isis",
  "jihad",
  // general insults / offensive
  "bastard",
  "moron",
  "idiot",
  "scum",
  "loser"
];
var BLOCKED = Array.from(new Set(RAW_BLOCKED)).map((w) => {
  const folded = fold(w);
  const collapsed = collapseRuns(folded);
  return { folded, collapsed: collapsed.length >= 3 ? collapsed : null };
}).filter((e) => e.folded.length > 0);

// src/data/clubManagerPremierFixtures2026.ts
var PREMIER_FIXTURES_2026 = {
  "schemaVersion": 1,
  "key": "premier-2026-27-v1",
  "leagueId": "premier",
  "seasonStartYear": 2026,
  "coverage": "Real league opponent order and home/away venues only. Calendar dates and match results are simulated.",
  "clubs": [
    "Arsenal",
    "Aston Villa",
    "Bournemouth",
    "Brentford",
    "Brighton",
    "Chelsea",
    "Coventry City",
    "Crystal Palace",
    "Everton",
    "Fulham",
    "Hull City",
    "Ipswich Town",
    "Leeds United",
    "Liverpool",
    "Manchester City",
    "Manchester United",
    "Newcastle",
    "Nottingham Forest",
    "Sunderland",
    "Tottenham"
  ],
  "rounds": [
    [
      [
        "Arsenal",
        "Coventry City"
      ],
      [
        "Hull City",
        "Manchester United"
      ],
      [
        "Everton",
        "Crystal Palace"
      ],
      [
        "Ipswich Town",
        "Sunderland"
      ],
      [
        "Nottingham Forest",
        "Leeds United"
      ],
      [
        "Brentford",
        "Tottenham"
      ],
      [
        "Brighton",
        "Aston Villa"
      ],
      [
        "Manchester City",
        "Bournemouth"
      ],
      [
        "Newcastle",
        "Liverpool"
      ],
      [
        "Fulham",
        "Chelsea"
      ]
    ],
    [
      [
        "Aston Villa",
        "Arsenal"
      ],
      [
        "Bournemouth",
        "Everton"
      ],
      [
        "Chelsea",
        "Brighton"
      ],
      [
        "Coventry City",
        "Hull City"
      ],
      [
        "Crystal Palace",
        "Manchester City"
      ],
      [
        "Leeds United",
        "Brentford"
      ],
      [
        "Liverpool",
        "Nottingham Forest"
      ],
      [
        "Manchester United",
        "Ipswich Town"
      ],
      [
        "Sunderland",
        "Fulham"
      ],
      [
        "Tottenham",
        "Newcastle"
      ]
    ],
    [
      [
        "Arsenal",
        "Chelsea"
      ],
      [
        "Brentford",
        "Sunderland"
      ],
      [
        "Brighton",
        "Leeds United"
      ],
      [
        "Everton",
        "Manchester United"
      ],
      [
        "Fulham",
        "Crystal Palace"
      ],
      [
        "Hull City",
        "Aston Villa"
      ],
      [
        "Ipswich Town",
        "Liverpool"
      ],
      [
        "Manchester City",
        "Coventry City"
      ],
      [
        "Newcastle",
        "Bournemouth"
      ],
      [
        "Nottingham Forest",
        "Tottenham"
      ]
    ],
    [
      [
        "Aston Villa",
        "Nottingham Forest"
      ],
      [
        "Bournemouth",
        "Brentford"
      ],
      [
        "Chelsea",
        "Hull City"
      ],
      [
        "Coventry City",
        "Brighton"
      ],
      [
        "Crystal Palace",
        "Ipswich Town"
      ],
      [
        "Leeds United",
        "Newcastle"
      ],
      [
        "Liverpool",
        "Fulham"
      ],
      [
        "Manchester United",
        "Manchester City"
      ],
      [
        "Sunderland",
        "Arsenal"
      ],
      [
        "Tottenham",
        "Everton"
      ]
    ],
    [
      [
        "Bournemouth",
        "Liverpool"
      ],
      [
        "Brentford",
        "Chelsea"
      ],
      [
        "Brighton",
        "Arsenal"
      ],
      [
        "Everton",
        "Ipswich Town"
      ],
      [
        "Fulham",
        "Manchester United"
      ],
      [
        "Leeds United",
        "Crystal Palace"
      ],
      [
        "Manchester City",
        "Sunderland"
      ],
      [
        "Newcastle",
        "Hull City"
      ],
      [
        "Nottingham Forest",
        "Coventry City"
      ],
      [
        "Tottenham",
        "Aston Villa"
      ]
    ],
    [
      [
        "Arsenal",
        "Leeds United"
      ],
      [
        "Aston Villa",
        "Brentford"
      ],
      [
        "Chelsea",
        "Bournemouth"
      ],
      [
        "Coventry City",
        "Newcastle"
      ],
      [
        "Crystal Palace",
        "Nottingham Forest"
      ],
      [
        "Hull City",
        "Everton"
      ],
      [
        "Ipswich Town",
        "Fulham"
      ],
      [
        "Liverpool",
        "Manchester City"
      ],
      [
        "Manchester United",
        "Tottenham"
      ],
      [
        "Sunderland",
        "Brighton"
      ]
    ],
    [
      [
        "Bournemouth",
        "Sunderland"
      ],
      [
        "Brentford",
        "Liverpool"
      ],
      [
        "Brighton",
        "Crystal Palace"
      ],
      [
        "Everton",
        "Chelsea"
      ],
      [
        "Fulham",
        "Hull City"
      ],
      [
        "Leeds United",
        "Manchester United"
      ],
      [
        "Manchester City",
        "Ipswich Town"
      ],
      [
        "Newcastle",
        "Aston Villa"
      ],
      [
        "Nottingham Forest",
        "Arsenal"
      ],
      [
        "Tottenham",
        "Coventry City"
      ]
    ],
    [
      [
        "Arsenal",
        "Everton"
      ],
      [
        "Aston Villa",
        "Manchester City"
      ],
      [
        "Chelsea",
        "Tottenham"
      ],
      [
        "Coventry City",
        "Fulham"
      ],
      [
        "Crystal Palace",
        "Newcastle"
      ],
      [
        "Hull City",
        "Brentford"
      ],
      [
        "Ipswich Town",
        "Nottingham Forest"
      ],
      [
        "Liverpool",
        "Brighton"
      ],
      [
        "Manchester United",
        "Bournemouth"
      ],
      [
        "Sunderland",
        "Leeds United"
      ]
    ],
    [
      [
        "Aston Villa",
        "Fulham"
      ],
      [
        "Bournemouth",
        "Leeds United"
      ],
      [
        "Brentford",
        "Nottingham Forest"
      ],
      [
        "Chelsea",
        "Manchester United"
      ],
      [
        "Coventry City",
        "Sunderland"
      ],
      [
        "Hull City",
        "Ipswich Town"
      ],
      [
        "Liverpool",
        "Arsenal"
      ],
      [
        "Manchester City",
        "Brighton"
      ],
      [
        "Newcastle",
        "Everton"
      ],
      [
        "Tottenham",
        "Crystal Palace"
      ]
    ],
    [
      [
        "Arsenal",
        "Hull City"
      ],
      [
        "Brighton",
        "Brentford"
      ],
      [
        "Crystal Palace",
        "Liverpool"
      ],
      [
        "Everton",
        "Coventry City"
      ],
      [
        "Fulham",
        "Newcastle"
      ],
      [
        "Ipswich Town",
        "Bournemouth"
      ],
      [
        "Leeds United",
        "Tottenham"
      ],
      [
        "Manchester United",
        "Aston Villa"
      ],
      [
        "Nottingham Forest",
        "Manchester City"
      ],
      [
        "Sunderland",
        "Chelsea"
      ]
    ],
    [
      [
        "Aston Villa",
        "Sunderland"
      ],
      [
        "Bournemouth",
        "Nottingham Forest"
      ],
      [
        "Brentford",
        "Everton"
      ],
      [
        "Chelsea",
        "Leeds United"
      ],
      [
        "Coventry City",
        "Crystal Palace"
      ],
      [
        "Hull City",
        "Brighton"
      ],
      [
        "Liverpool",
        "Manchester United"
      ],
      [
        "Manchester City",
        "Fulham"
      ],
      [
        "Newcastle",
        "Arsenal"
      ],
      [
        "Tottenham",
        "Ipswich Town"
      ]
    ],
    [
      [
        "Arsenal",
        "Manchester City"
      ],
      [
        "Brighton",
        "Newcastle"
      ],
      [
        "Crystal Palace",
        "Hull City"
      ],
      [
        "Everton",
        "Liverpool"
      ],
      [
        "Fulham",
        "Bournemouth"
      ],
      [
        "Ipswich Town",
        "Aston Villa"
      ],
      [
        "Leeds United",
        "Coventry City"
      ],
      [
        "Manchester United",
        "Brentford"
      ],
      [
        "Nottingham Forest",
        "Chelsea"
      ],
      [
        "Sunderland",
        "Tottenham"
      ]
    ],
    [
      [
        "Aston Villa",
        "Everton"
      ],
      [
        "Bournemouth",
        "Brighton"
      ],
      [
        "Brentford",
        "Arsenal"
      ],
      [
        "Chelsea",
        "Crystal Palace"
      ],
      [
        "Coventry City",
        "Ipswich Town"
      ],
      [
        "Hull City",
        "Nottingham Forest"
      ],
      [
        "Liverpool",
        "Sunderland"
      ],
      [
        "Manchester City",
        "Leeds United"
      ],
      [
        "Newcastle",
        "Manchester United"
      ],
      [
        "Tottenham",
        "Fulham"
      ]
    ],
    [
      [
        "Aston Villa",
        "Crystal Palace"
      ],
      [
        "Bournemouth",
        "Hull City"
      ],
      [
        "Brentford",
        "Manchester City"
      ],
      [
        "Chelsea",
        "Liverpool"
      ],
      [
        "Everton",
        "Fulham"
      ],
      [
        "Leeds United",
        "Ipswich Town"
      ],
      [
        "Manchester United",
        "Coventry City"
      ],
      [
        "Newcastle",
        "Sunderland"
      ],
      [
        "Nottingham Forest",
        "Brighton"
      ],
      [
        "Tottenham",
        "Arsenal"
      ]
    ],
    [
      [
        "Arsenal",
        "Bournemouth"
      ],
      [
        "Brighton",
        "Everton"
      ],
      [
        "Coventry City",
        "Aston Villa"
      ],
      [
        "Crystal Palace",
        "Manchester United"
      ],
      [
        "Fulham",
        "Brentford"
      ],
      [
        "Hull City",
        "Tottenham"
      ],
      [
        "Ipswich Town",
        "Newcastle"
      ],
      [
        "Liverpool",
        "Leeds United"
      ],
      [
        "Manchester City",
        "Chelsea"
      ],
      [
        "Sunderland",
        "Nottingham Forest"
      ]
    ],
    [
      [
        "Arsenal",
        "Manchester United"
      ],
      [
        "Bournemouth",
        "Coventry City"
      ],
      [
        "Brentford",
        "Newcastle"
      ],
      [
        "Brighton",
        "Ipswich Town"
      ],
      [
        "Chelsea",
        "Aston Villa"
      ],
      [
        "Leeds United",
        "Fulham"
      ],
      [
        "Liverpool",
        "Tottenham"
      ],
      [
        "Manchester City",
        "Hull City"
      ],
      [
        "Nottingham Forest",
        "Everton"
      ],
      [
        "Sunderland",
        "Crystal Palace"
      ]
    ],
    [
      [
        "Aston Villa",
        "Leeds United"
      ],
      [
        "Coventry City",
        "Chelsea"
      ],
      [
        "Crystal Palace",
        "Arsenal"
      ],
      [
        "Everton",
        "Sunderland"
      ],
      [
        "Fulham",
        "Brighton"
      ],
      [
        "Hull City",
        "Liverpool"
      ],
      [
        "Ipswich Town",
        "Brentford"
      ],
      [
        "Manchester United",
        "Nottingham Forest"
      ],
      [
        "Newcastle",
        "Manchester City"
      ],
      [
        "Tottenham",
        "Bournemouth"
      ]
    ],
    [
      [
        "Aston Villa",
        "Liverpool"
      ],
      [
        "Coventry City",
        "Brentford"
      ],
      [
        "Crystal Palace",
        "Bournemouth"
      ],
      [
        "Everton",
        "Manchester City"
      ],
      [
        "Fulham",
        "Arsenal"
      ],
      [
        "Hull City",
        "Leeds United"
      ],
      [
        "Ipswich Town",
        "Chelsea"
      ],
      [
        "Manchester United",
        "Sunderland"
      ],
      [
        "Newcastle",
        "Nottingham Forest"
      ],
      [
        "Tottenham",
        "Brighton"
      ]
    ],
    [
      [
        "Arsenal",
        "Ipswich Town"
      ],
      [
        "Bournemouth",
        "Aston Villa"
      ],
      [
        "Brentford",
        "Crystal Palace"
      ],
      [
        "Brighton",
        "Manchester United"
      ],
      [
        "Chelsea",
        "Newcastle"
      ],
      [
        "Leeds United",
        "Everton"
      ],
      [
        "Liverpool",
        "Coventry City"
      ],
      [
        "Manchester City",
        "Tottenham"
      ],
      [
        "Nottingham Forest",
        "Fulham"
      ],
      [
        "Sunderland",
        "Hull City"
      ]
    ],
    [
      [
        "Arsenal",
        "Brentford"
      ],
      [
        "Brighton",
        "Bournemouth"
      ],
      [
        "Crystal Palace",
        "Chelsea"
      ],
      [
        "Everton",
        "Aston Villa"
      ],
      [
        "Fulham",
        "Tottenham"
      ],
      [
        "Ipswich Town",
        "Coventry City"
      ],
      [
        "Leeds United",
        "Manchester City"
      ],
      [
        "Manchester United",
        "Newcastle"
      ],
      [
        "Nottingham Forest",
        "Hull City"
      ],
      [
        "Sunderland",
        "Liverpool"
      ]
    ],
    [
      [
        "Aston Villa",
        "Manchester United"
      ],
      [
        "Bournemouth",
        "Ipswich Town"
      ],
      [
        "Brentford",
        "Brighton"
      ],
      [
        "Chelsea",
        "Sunderland"
      ],
      [
        "Coventry City",
        "Everton"
      ],
      [
        "Hull City",
        "Arsenal"
      ],
      [
        "Liverpool",
        "Crystal Palace"
      ],
      [
        "Manchester City",
        "Nottingham Forest"
      ],
      [
        "Newcastle",
        "Fulham"
      ],
      [
        "Tottenham",
        "Leeds United"
      ]
    ],
    [
      [
        "Arsenal",
        "Newcastle"
      ],
      [
        "Brighton",
        "Manchester City"
      ],
      [
        "Crystal Palace",
        "Tottenham"
      ],
      [
        "Everton",
        "Brentford"
      ],
      [
        "Fulham",
        "Aston Villa"
      ],
      [
        "Ipswich Town",
        "Hull City"
      ],
      [
        "Leeds United",
        "Chelsea"
      ],
      [
        "Manchester United",
        "Liverpool"
      ],
      [
        "Nottingham Forest",
        "Bournemouth"
      ],
      [
        "Sunderland",
        "Coventry City"
      ]
    ],
    [
      [
        "Aston Villa",
        "Ipswich Town"
      ],
      [
        "Bournemouth",
        "Fulham"
      ],
      [
        "Brentford",
        "Manchester United"
      ],
      [
        "Chelsea",
        "Nottingham Forest"
      ],
      [
        "Coventry City",
        "Leeds United"
      ],
      [
        "Hull City",
        "Crystal Palace"
      ],
      [
        "Liverpool",
        "Everton"
      ],
      [
        "Manchester City",
        "Arsenal"
      ],
      [
        "Newcastle",
        "Brighton"
      ],
      [
        "Tottenham",
        "Sunderland"
      ]
    ],
    [
      [
        "Arsenal",
        "Liverpool"
      ],
      [
        "Brighton",
        "Hull City"
      ],
      [
        "Crystal Palace",
        "Coventry City"
      ],
      [
        "Everton",
        "Newcastle"
      ],
      [
        "Fulham",
        "Manchester City"
      ],
      [
        "Ipswich Town",
        "Tottenham"
      ],
      [
        "Leeds United",
        "Bournemouth"
      ],
      [
        "Manchester United",
        "Chelsea"
      ],
      [
        "Nottingham Forest",
        "Brentford"
      ],
      [
        "Sunderland",
        "Aston Villa"
      ]
    ],
    [
      [
        "Aston Villa",
        "Bournemouth"
      ],
      [
        "Coventry City",
        "Liverpool"
      ],
      [
        "Crystal Palace",
        "Brentford"
      ],
      [
        "Everton",
        "Leeds United"
      ],
      [
        "Fulham",
        "Nottingham Forest"
      ],
      [
        "Hull City",
        "Sunderland"
      ],
      [
        "Ipswich Town",
        "Arsenal"
      ],
      [
        "Manchester United",
        "Brighton"
      ],
      [
        "Newcastle",
        "Chelsea"
      ],
      [
        "Tottenham",
        "Manchester City"
      ]
    ],
    [
      [
        "Arsenal",
        "Fulham"
      ],
      [
        "Bournemouth",
        "Crystal Palace"
      ],
      [
        "Brentford",
        "Coventry City"
      ],
      [
        "Brighton",
        "Tottenham"
      ],
      [
        "Chelsea",
        "Ipswich Town"
      ],
      [
        "Leeds United",
        "Aston Villa"
      ],
      [
        "Liverpool",
        "Hull City"
      ],
      [
        "Manchester City",
        "Newcastle"
      ],
      [
        "Nottingham Forest",
        "Manchester United"
      ],
      [
        "Sunderland",
        "Everton"
      ]
    ],
    [
      [
        "Aston Villa",
        "Chelsea"
      ],
      [
        "Coventry City",
        "Bournemouth"
      ],
      [
        "Crystal Palace",
        "Sunderland"
      ],
      [
        "Everton",
        "Nottingham Forest"
      ],
      [
        "Fulham",
        "Leeds United"
      ],
      [
        "Hull City",
        "Manchester City"
      ],
      [
        "Ipswich Town",
        "Brighton"
      ],
      [
        "Manchester United",
        "Arsenal"
      ],
      [
        "Newcastle",
        "Brentford"
      ],
      [
        "Tottenham",
        "Liverpool"
      ]
    ],
    [
      [
        "Arsenal",
        "Crystal Palace"
      ],
      [
        "Bournemouth",
        "Tottenham"
      ],
      [
        "Brentford",
        "Ipswich Town"
      ],
      [
        "Brighton",
        "Fulham"
      ],
      [
        "Chelsea",
        "Coventry City"
      ],
      [
        "Leeds United",
        "Hull City"
      ],
      [
        "Liverpool",
        "Aston Villa"
      ],
      [
        "Manchester City",
        "Everton"
      ],
      [
        "Nottingham Forest",
        "Newcastle"
      ],
      [
        "Sunderland",
        "Manchester United"
      ]
    ],
    [
      [
        "Aston Villa",
        "Hull City"
      ],
      [
        "Bournemouth",
        "Newcastle"
      ],
      [
        "Chelsea",
        "Arsenal"
      ],
      [
        "Coventry City",
        "Manchester City"
      ],
      [
        "Crystal Palace",
        "Fulham"
      ],
      [
        "Leeds United",
        "Brighton"
      ],
      [
        "Liverpool",
        "Ipswich Town"
      ],
      [
        "Manchester United",
        "Everton"
      ],
      [
        "Sunderland",
        "Brentford"
      ],
      [
        "Tottenham",
        "Nottingham Forest"
      ]
    ],
    [
      [
        "Arsenal",
        "Sunderland"
      ],
      [
        "Brentford",
        "Bournemouth"
      ],
      [
        "Brighton",
        "Coventry City"
      ],
      [
        "Everton",
        "Tottenham"
      ],
      [
        "Fulham",
        "Liverpool"
      ],
      [
        "Hull City",
        "Chelsea"
      ],
      [
        "Ipswich Town",
        "Crystal Palace"
      ],
      [
        "Manchester City",
        "Manchester United"
      ],
      [
        "Newcastle",
        "Leeds United"
      ],
      [
        "Nottingham Forest",
        "Aston Villa"
      ]
    ],
    [
      [
        "Aston Villa",
        "Brighton"
      ],
      [
        "Bournemouth",
        "Manchester City"
      ],
      [
        "Chelsea",
        "Fulham"
      ],
      [
        "Coventry City",
        "Arsenal"
      ],
      [
        "Crystal Palace",
        "Everton"
      ],
      [
        "Leeds United",
        "Nottingham Forest"
      ],
      [
        "Liverpool",
        "Newcastle"
      ],
      [
        "Manchester United",
        "Hull City"
      ],
      [
        "Sunderland",
        "Ipswich Town"
      ],
      [
        "Tottenham",
        "Brentford"
      ]
    ],
    [
      [
        "Arsenal",
        "Aston Villa"
      ],
      [
        "Brentford",
        "Leeds United"
      ],
      [
        "Brighton",
        "Chelsea"
      ],
      [
        "Everton",
        "Bournemouth"
      ],
      [
        "Fulham",
        "Sunderland"
      ],
      [
        "Hull City",
        "Coventry City"
      ],
      [
        "Ipswich Town",
        "Manchester United"
      ],
      [
        "Manchester City",
        "Crystal Palace"
      ],
      [
        "Newcastle",
        "Tottenham"
      ],
      [
        "Nottingham Forest",
        "Liverpool"
      ]
    ],
    [
      [
        "Aston Villa",
        "Coventry City"
      ],
      [
        "Bournemouth",
        "Arsenal"
      ],
      [
        "Brentford",
        "Fulham"
      ],
      [
        "Chelsea",
        "Manchester City"
      ],
      [
        "Everton",
        "Brighton"
      ],
      [
        "Leeds United",
        "Liverpool"
      ],
      [
        "Manchester United",
        "Crystal Palace"
      ],
      [
        "Newcastle",
        "Ipswich Town"
      ],
      [
        "Nottingham Forest",
        "Sunderland"
      ],
      [
        "Tottenham",
        "Hull City"
      ]
    ],
    [
      [
        "Arsenal",
        "Tottenham"
      ],
      [
        "Brighton",
        "Nottingham Forest"
      ],
      [
        "Coventry City",
        "Manchester United"
      ],
      [
        "Crystal Palace",
        "Aston Villa"
      ],
      [
        "Fulham",
        "Everton"
      ],
      [
        "Hull City",
        "Bournemouth"
      ],
      [
        "Ipswich Town",
        "Leeds United"
      ],
      [
        "Liverpool",
        "Chelsea"
      ],
      [
        "Manchester City",
        "Brentford"
      ],
      [
        "Sunderland",
        "Newcastle"
      ]
    ],
    [
      [
        "Bournemouth",
        "Manchester United"
      ],
      [
        "Brentford",
        "Aston Villa"
      ],
      [
        "Brighton",
        "Sunderland"
      ],
      [
        "Everton",
        "Hull City"
      ],
      [
        "Fulham",
        "Ipswich Town"
      ],
      [
        "Leeds United",
        "Arsenal"
      ],
      [
        "Manchester City",
        "Liverpool"
      ],
      [
        "Newcastle",
        "Coventry City"
      ],
      [
        "Nottingham Forest",
        "Crystal Palace"
      ],
      [
        "Tottenham",
        "Chelsea"
      ]
    ],
    [
      [
        "Arsenal",
        "Nottingham Forest"
      ],
      [
        "Aston Villa",
        "Newcastle"
      ],
      [
        "Chelsea",
        "Everton"
      ],
      [
        "Coventry City",
        "Tottenham"
      ],
      [
        "Crystal Palace",
        "Brighton"
      ],
      [
        "Hull City",
        "Fulham"
      ],
      [
        "Ipswich Town",
        "Manchester City"
      ],
      [
        "Liverpool",
        "Brentford"
      ],
      [
        "Manchester United",
        "Leeds United"
      ],
      [
        "Sunderland",
        "Bournemouth"
      ]
    ],
    [
      [
        "Bournemouth",
        "Chelsea"
      ],
      [
        "Brentford",
        "Hull City"
      ],
      [
        "Brighton",
        "Liverpool"
      ],
      [
        "Everton",
        "Arsenal"
      ],
      [
        "Fulham",
        "Coventry City"
      ],
      [
        "Leeds United",
        "Sunderland"
      ],
      [
        "Manchester City",
        "Aston Villa"
      ],
      [
        "Newcastle",
        "Crystal Palace"
      ],
      [
        "Nottingham Forest",
        "Ipswich Town"
      ],
      [
        "Tottenham",
        "Manchester United"
      ]
    ],
    [
      [
        "Arsenal",
        "Brighton"
      ],
      [
        "Aston Villa",
        "Tottenham"
      ],
      [
        "Chelsea",
        "Brentford"
      ],
      [
        "Coventry City",
        "Nottingham Forest"
      ],
      [
        "Crystal Palace",
        "Leeds United"
      ],
      [
        "Hull City",
        "Newcastle"
      ],
      [
        "Ipswich Town",
        "Everton"
      ],
      [
        "Liverpool",
        "Bournemouth"
      ],
      [
        "Manchester United",
        "Fulham"
      ],
      [
        "Sunderland",
        "Manchester City"
      ]
    ]
  ],
  "sources": [
    {
      "label": "Premier League",
      "url": "https://www.premierleague.com/en/news/4675097"
    },
    {
      "label": "Sports Illustrated",
      "url": "https://www.si.com/soccer/2026-27-premier-league-fixtures-full-schedule-arsenal-defend-title"
    }
  ]
};

// src/lib/clubManagerFixtures.ts
var REAL_PREMIER_FIXTURE_KEY = PREMIER_FIXTURES_2026.key;

// src/lib/soccerInternational.ts
var NATION_CONFED = {
  // UEFA
  Albania: "UEFA",
  Armenia: "UEFA",
  Austria: "UEFA",
  Azerbaijan: "UEFA",
  Belarus: "UEFA",
  Belgium: "UEFA",
  "Bosnia & Herzegovina": "UEFA",
  Bulgaria: "UEFA",
  Croatia: "UEFA",
  Cyprus: "UEFA",
  "Czech Republic": "UEFA",
  Denmark: "UEFA",
  England: "UEFA",
  Estonia: "UEFA",
  "Faroe Islands": "UEFA",
  Finland: "UEFA",
  France: "UEFA",
  Georgia: "UEFA",
  Germany: "UEFA",
  Greece: "UEFA",
  Hungary: "UEFA",
  Iceland: "UEFA",
  Ireland: "UEFA",
  Israel: "UEFA",
  Italy: "UEFA",
  Kazakhstan: "UEFA",
  Kosovo: "UEFA",
  Latvia: "UEFA",
  Liechtenstein: "UEFA",
  Lithuania: "UEFA",
  Luxembourg: "UEFA",
  Malta: "UEFA",
  Moldova: "UEFA",
  Montenegro: "UEFA",
  Netherlands: "UEFA",
  "North Macedonia": "UEFA",
  "Northern Ireland": "UEFA",
  Norway: "UEFA",
  Poland: "UEFA",
  Portugal: "UEFA",
  Romania: "UEFA",
  Russia: "UEFA",
  Scotland: "UEFA",
  Serbia: "UEFA",
  Slovakia: "UEFA",
  Slovenia: "UEFA",
  Spain: "UEFA",
  Sweden: "UEFA",
  Switzerland: "UEFA",
  Turkey: "UEFA",
  Ukraine: "UEFA",
  Wales: "UEFA",
  // CONMEBOL
  Argentina: "CONMEBOL",
  Bolivia: "CONMEBOL",
  Brazil: "CONMEBOL",
  Chile: "CONMEBOL",
  Colombia: "CONMEBOL",
  Ecuador: "CONMEBOL",
  Paraguay: "CONMEBOL",
  Peru: "CONMEBOL",
  Uruguay: "CONMEBOL",
  Venezuela: "CONMEBOL",
  // CAF
  Algeria: "CAF",
  Angola: "CAF",
  Benin: "CAF",
  "Burkina Faso": "CAF",
  Cameroon: "CAF",
  "Cape Verde": "CAF",
  Comoros: "CAF",
  Congo: "CAF",
  "DR Congo": "CAF",
  Egypt: "CAF",
  Ethiopia: "CAF",
  Gabon: "CAF",
  Ghana: "CAF",
  Guinea: "CAF",
  "Guinea-Bissau": "CAF",
  "Ivory Coast": "CAF",
  Kenya: "CAF",
  Liberia: "CAF",
  Libya: "CAF",
  Madagascar: "CAF",
  Mali: "CAF",
  Morocco: "CAF",
  Mozambique: "CAF",
  Nigeria: "CAF",
  Senegal: "CAF",
  "Sierra Leone": "CAF",
  "South Africa": "CAF",
  Tanzania: "CAF",
  "The Gambia": "CAF",
  Togo: "CAF",
  Tunisia: "CAF",
  Uganda: "CAF",
  Zambia: "CAF",
  Zimbabwe: "CAF",
  // AFC
  Australia: "AFC",
  Bahrain: "AFC",
  China: "AFC",
  India: "AFC",
  Indonesia: "AFC",
  Iran: "AFC",
  Iraq: "AFC",
  Japan: "AFC",
  Jordan: "AFC",
  Kuwait: "AFC",
  Lebanon: "AFC",
  "North Korea": "AFC",
  Oman: "AFC",
  Philippines: "AFC",
  Qatar: "AFC",
  "Saudi Arabia": "AFC",
  "South Korea": "AFC",
  Tajikistan: "AFC",
  Thailand: "AFC",
  "United Arab Emirates": "AFC",
  Uzbekistan: "AFC",
  Vietnam: "AFC",
  // Both play Asian Cup and AFC World Cup qualifying, both are inside the
  // published world top 100, so both are here as opponents.
  Syria: "AFC",
  Palestine: "AFC",
  // CONCACAF
  Canada: "CONCACAF",
  "Costa Rica": "CONCACAF",
  Cuba: "CONCACAF",
  "Cura\xE7ao": "CONCACAF",
  "Dominican Republic": "CONCACAF",
  "El Salvador": "CONCACAF",
  Guatemala: "CONCACAF",
  Haiti: "CONCACAF",
  Honduras: "CONCACAF",
  Jamaica: "CONCACAF",
  Mexico: "CONCACAF",
  Panama: "CONCACAF",
  Suriname: "CONCACAF",
  "Trinidad and Tobago": "CONCACAF",
  USA: "CONCACAF",
  /* OFC. New Zealand is the only Oceanian side the player picker offers, but
     a confederation of one cannot run a qualifying group, so the other ten
     full members are here as opponents. List and count from
     en.wikipedia.org/wiki/Oceania_Football_Confederation (11 full members),
     read August 2026. */
  "New Zealand": "OFC",
  "New Caledonia": "OFC",
  Tahiti: "OFC",
  Fiji: "OFC",
  "Solomon Islands": "OFC",
  "Papua New Guinea": "OFC",
  Vanuatu: "OFC",
  Samoa: "OFC",
  "American Samoa": "OFC",
  "Cook Islands": "OFC",
  Tonga: "OFC"
};
var CONFED_POOL = {
  UEFA: [],
  CONMEBOL: [],
  CAF: [],
  AFC: [],
  CONCACAF: [],
  OFC: []
};
for (const [nation, conf] of Object.entries(NATION_CONFED)) CONFED_POOL[conf].push(nation);
var FIFA_POINTS = {
  Spain: 1995.88,
  Argentina: 1970.37,
  France: 1948.97,
  England: 1922.83,
  Brazil: 1804.92,
  Morocco: 1803.99,
  Portugal: 1787.85,
  Belgium: 1778.36,
  Netherlands: 1775.54,
  Mexico: 1754.3,
  Colombia: 1739.89,
  Germany: 1726.22,
  Croatia: 1723.05,
  Switzerland: 1710.88,
  Italy: 1704.73,
  USA: 1690.33,
  Japan: 1673.68,
  Senegal: 1653.43,
  Norway: 1651.29,
  Uruguay: 1634.7,
  Denmark: 1619.47,
  Iran: 1609.85,
  Austria: 1598.82,
  Egypt: 1597.04,
  Ecuador: 1592.59,
  Nigeria: 1585.02,
  Turkey: 1582.54,
  Australia: 1581.51,
  Algeria: 1576.8,
  Canada: 1571.34,
  "Ivory Coast": 1565.47,
  "South Korea": 1558.72,
  Ukraine: 1549.29,
  Paraguay: 1542.48,
  Russia: 1529.6,
  Poland: 1526.18,
  Sweden: 1525.58,
  Wales: 1516.95,
  Hungary: 1506.39,
  Serbia: 1502.13,
  "DR Congo": 1495.48,
  Scotland: 1491.22,
  Cameroon: 1481.24,
  Panama: 1478.41,
  Slovakia: 1473.66,
  Greece: 1473.19,
  Venezuela: 1469.18,
  "Czech Republic": 1467.26,
  Chile: 1458.2,
  Peru: 1457.69,
  "Costa Rica": 1456.03,
  Romania: 1455.89,
  Mali: 1455.59,
  "South Africa": 1451.24,
  Ireland: 1441.1,
  // listed as Republic of Ireland
  Slovenia: 1441.09,
  Tunisia: 1426.58,
  "Saudi Arabia": 1425.52,
  Qatar: 1411.06,
  Uzbekistan: 1409.73,
  "Bosnia & Herzegovina": 1408.93,
  "Burkina Faso": 1406.99,
  Iraq: 1404.17,
  "Cape Verde": 1402.97,
  // listed as Cabo Verde
  Ghana: 1387,
  Honduras: 1378.97,
  Albania: 1376.03,
  "United Arab Emirates": 1370.47,
  "North Macedonia": 1369.16,
  "Northern Ireland": 1365.3,
  Jamaica: 1357.84,
  Georgia: 1355.26,
  Jordan: 1350.41,
  Iceland: 1342.77,
  Finland: 1341.92,
  Israel: 1333.9,
  Bolivia: 1326,
  Kosovo: 1319.12,
  Oman: 1306.9,
  Montenegro: 1301.98,
  Guinea: 1295.6,
  "Cura\xE7ao": 1285.64,
  Syria: 1283.05,
  Gabon: 1272.51,
  Bulgaria: 1271.68,
  "New Zealand": 1269.8,
  Angola: 1265.58,
  Haiti: 1264.58,
  Uganda: 1264.09,
  Thailand: 1256.73,
  Zambia: 1255.82,
  China: 1254.81,
  // listed as China PR
  Bahrain: 1254.41,
  Benin: 1252.17,
  Palestine: 1243.71,
  Belarus: 1242.88,
  Guatemala: 1238.74,
  Luxembourg: 1232.82,
  Vietnam: 1230.67,
  "El Salvador": 1225.34
};
var RANK_ORDER = Object.entries(FIFA_POINTS).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

// src/lib/soccerBootIds.ts
var BOOT_IDS = [
  "vortex_strike",
  "vortex_ghost",
  "kinetiq_blaze",
  "kinetiq_void",
  "aurora_nine",
  "aurora_royal",
  "pulse_gold",
  "pulse_venom",
  "retro_classica",
  "bubblegum",
  "vortex_frost",
  "kinetiq_flare",
  "aurora_dusk",
  "pulse_copper",
  "terrace_navy",
  "sunday_league",
  "carnival",
  "midnight_chrome"
];

// src/lib/soccerBoots.ts
var BOOTS = [
  { id: BOOT_IDS[0], label: "Vortex Strike", color: "#E0342C", flavor: "The volume seller. Red, loud, everywhere." },
  { id: BOOT_IDS[1], label: "Vortex Ghost", color: "#EDEDED", flavor: "All white. You do NOT slide tackle in these." },
  { id: BOOT_IDS[2], label: "Kinetiq Blaze", color: "#F28A1F", flavor: "Construction-cone orange. Defenders see you coming and it does not help them." },
  { id: BOOT_IDS[3], label: "Kinetiq Void", color: "#181820", flavor: "Blackout edition for players who let the feet talk." },
  { id: BOOT_IDS[4], label: "Aurora Nine", color: "#37B58C", flavor: "Mint green, worn by exactly one show-off per league." },
  { id: BOOT_IDS[5], label: "Aurora Royal", color: "#2F4FB5", flavor: "Deep blue classics your dad approves of." },
  { id: BOOT_IDS[6], label: "Pulse Gold", color: "#D9A82D", flavor: "Gold boots. You had better score this week." },
  { id: BOOT_IDS[7], label: "Pulse Venom", color: "#7A3FB0", flavor: "Purple with attitude. The commentators will mention them." },
  { id: BOOT_IDS[8], label: "Classica '86", color: "#2B2B25", flavor: "Old-school black leather. Purists nod in respect." },
  { id: BOOT_IDS[9], label: "Bubblegum Pop", color: "#E86FAE", flavor: "Pink enough to trend on its own." },
  /* Round 131: eight more lines, same rule as the first ten. Every name is
     made up here and nobody else's. */
  { id: BOOT_IDS[10], label: "Vortex Frost", color: "#8FD4E8", flavor: "Ice blue. Somehow always look brand new at full time." },
  { id: BOOT_IDS[11], label: "Kinetiq Flare", color: "#F5E23C", flavor: "Highlighter yellow under floodlights. Impossible to miss." },
  { id: BOOT_IDS[12], label: "Aurora Dusk", color: "#6B4E9E", flavor: "Faded purple that looks better the muddier it gets." },
  { id: BOOT_IDS[13], label: "Pulse Copper", color: "#B4703A", flavor: "Burnt copper, worn by people who take free kicks." },
  { id: BOOT_IDS[14], label: "Terrace Navy", color: "#23335C", flavor: "Quiet, dark, sensible. The boots of somebody who tackles." },
  { id: BOOT_IDS[15], label: "Sunday League", color: "#C9CBC5", flavor: "Battered grey. You have had these since you were fourteen." },
  { id: BOOT_IDS[16], label: "Carnival", color: "#2FB56A", flavor: "Green and gold split. Loud on purpose, and it works." },
  { id: BOOT_IDS[17], label: "Midnight Chrome", color: "#4A4E57", flavor: "Gunmetal with a shine. Photographers love them." }
];

// src/lib/soccerCareerAppearance.ts
var HAIRSTYLES = [
  { id: "buzz", label: "Buzz Cut" },
  { id: "fade", label: "High Fade" },
  { id: "curls", label: "Curls" },
  { id: "afro", label: "Afro" },
  { id: "waves", label: "Waves" },
  { id: "topknot", label: "Top Knot" },
  { id: "long", label: "Flowing Locks" },
  { id: "mohawk", label: "Mohawk" },
  { id: "braids", label: "Braids" },
  { id: "mullet", label: "Mullet" },
  { id: "spiky", label: "Frosted Spikes" },
  { id: "bald", label: "Clean Bald" },
  /* Round 131: eleven more, all drawn as SVG paths in PlayerAvatar the same
     way the first twelve are. No image host, no photos, nothing fetched. */
  { id: "sidepart", label: "Side Part" },
  { id: "slickback", label: "Slicked Back" },
  { id: "curtains", label: "Curtains" },
  { id: "dreads", label: "Dreadlocks" },
  { id: "cornrows", label: "Cornrows" },
  { id: "hightop", label: "High Top" },
  { id: "ponytail", label: "Ponytail" },
  { id: "receding", label: "Receding" },
  { id: "shaggy", label: "Shaggy Bowl" },
  { id: "lines", label: "Shaved Lines" },
  { id: "quiff", label: "Big Quiff" }
];
var FACIAL_HAIR = [
  { id: "none", label: "Clean Shaven" },
  { id: "stubble", label: "Stubble" },
  { id: "goatee", label: "Goatee" },
  { id: "full", label: "Full Beard" },
  { id: "mustache", label: "Mustache" },
  { id: "chinstrap", label: "Chinstrap" },
  { id: "soul", label: "Soul Patch" },
  { id: "heavy", label: "Heavy Beard" },
  { id: "vandyke", label: "Van Dyke" },
  { id: "boxed", label: "Boxed Beard" },
  { id: "sideburns", label: "Sideburns" },
  { id: "pencil", label: "Pencil Moustache" },
  { id: "horseshoe", label: "Horseshoe" },
  { id: "patchy", label: "Patchy" }
];
var SOCCER_HAIRSTYLES = [
  ...HAIRSTYLES,
  { id: "texturedcrop", label: "Textured Crop" },
  { id: "sidefringe", label: "Side Fringe" },
  { id: "twists", label: "Twists" },
  { id: "shortlocs", label: "Short Locs" },
  { id: "halfup", label: "Half Up" },
  { id: "afropuff", label: "Afro Puff" }
];
var SOCCER_FACIAL_HAIR = [
  ...FACIAL_HAIR,
  { id: "circlebeard", label: "Circle Beard" },
  { id: "handlebar", label: "Handlebar" },
  { id: "ducktail", label: "Ducktail" },
  { id: "muttonchops", label: "Mutton Chops" }
];

// src/lib/squadShape.ts
var s = (label, allowed, x, y) => ({ label, allowed, x, y });
var G = () => s("GK", ["GK"], 50, 90);
var DC = ["CB"];
var DR = ["RB", "RWB", "CB"];
var DL = ["LB", "LWB", "CB"];
var MD = ["CM", "CDM", "CAM"];
var WR = ["RW", "RM", "RWB"];
var WL = ["LW", "LM", "LWB"];
var FW = ["ST", "CF"];
var DM = ["CDM", "CM"];
var AM = ["CAM", "CM"];
var AMF = ["CAM", "CF", "CM"];
var SLOT_ALLOWED = { DC, DR, DL, MD, DM, AM, AMF, WR, WL, FW };
var FORMATIONS = [
  { name: "4-3-3", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("CM", MD, 70, 50), s("CM", MD, 50, 54), s("CM", MD, 30, 50), s("RW", WR, 80, 24), s("ST", FW, 50, 18), s("LW", WL, 20, 24)] },
  { name: "4-4-2", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("RM", WR, 82, 48), s("CM", MD, 60, 52), s("CM", MD, 40, 52), s("LM", WL, 18, 48), s("ST", FW, 60, 20), s("ST", FW, 40, 20)] },
  { name: "4-2-3-1", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("CDM", DM, 62, 56), s("CDM", DM, 38, 56), s("RW", WR, 80, 34), s("CAM", AM, 50, 36), s("LW", WL, 20, 34), s("ST", FW, 50, 16)] },
  { name: "4-1-2-1-2", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("CDM", DM, 50, 60), s("CM", MD, 68, 46), s("CM", MD, 32, 46), s("CAM", AM, 50, 32), s("ST", FW, 60, 18), s("ST", FW, 40, 18)] },
  { name: "4-5-1", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("RM", WR, 84, 44), s("CM", MD, 64, 50), s("CM", MD, 50, 52), s("CM", MD, 36, 50), s("LM", WL, 16, 44), s("ST", FW, 50, 18)] },
  { name: "3-5-2", slots: [G(), s("CB", DC, 68, 74), s("CB", DC, 50, 76), s("CB", DC, 32, 74), s("RWB", WR, 86, 50), s("CM", MD, 64, 54), s("CM", MD, 50, 56), s("CM", MD, 36, 54), s("LWB", WL, 14, 50), s("ST", FW, 60, 20), s("ST", FW, 40, 20)] },
  { name: "3-4-3", slots: [G(), s("CB", DC, 68, 74), s("CB", DC, 50, 76), s("CB", DC, 32, 74), s("RM", WR, 84, 50), s("CM", MD, 60, 54), s("CM", MD, 40, 54), s("LM", WL, 16, 50), s("RW", WR, 78, 22), s("ST", FW, 50, 18), s("LW", WL, 22, 22)] },
  { name: "5-3-2", slots: [G(), s("RWB", WR, 88, 64), s("CB", DC, 68, 76), s("CB", DC, 50, 78), s("CB", DC, 32, 76), s("LWB", WL, 12, 64), s("CM", MD, 66, 50), s("CM", MD, 50, 52), s("CM", MD, 34, 50), s("ST", FW, 60, 20), s("ST", FW, 40, 20)] },
  { name: "4-4-1-1", slots: [G(), s("RB", DR, 84, 70), s("CB", DC, 62, 74), s("CB", DC, 38, 74), s("LB", DL, 16, 70), s("RM", WR, 82, 48), s("CM", MD, 60, 52), s("CM", MD, 40, 52), s("LM", WL, 18, 48), s("CAM", AMF, 50, 32), s("ST", FW, 50, 16)] }
];

// src/lib/positionFit.ts
var ALL_POSITIONS = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST"
];

// src/lib/uclLeaguePhase.ts
var LEAGUE_PHASE_SHAPES = {
  ucl: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2 },
  uel: { clubs: 36, pots: 4, potSize: 9, perPot: 2, games: 8, home: 4, away: 4, direct: 8, playoffTo: 24, capPerAssociation: 2 },
  uecl: { clubs: 36, pots: 6, potSize: 6, perPot: 1, games: 6, home: 3, away: 3, direct: 8, playoffTo: 24, capPerAssociation: 2 }
};
var UCL_LEAGUE = { ...LEAGUE_PHASE_SHAPES.ucl, winPoints: 3, drawPoints: 1 };

// src/lib/clubManagerWorldRoster.ts
var import_lz_string = __toESM(require_lz_string(), 1);

// src/data/clubManagerRosters.ts
var CM_ROSTER_META = {
  generated: "2026-10-07",
  asOf: "August 2026, after the summer window",
  players: 4401,
  clubs: 426,
  overlayMoves: 734
};
var CM_PARTIAL = ["AC Horsens", "ADO Den Haag", "AGF", "Aberdeen", "Abha", "Acad\xE9mico de Viseu", "Al-Diriyah", "Al-Ettifaq", "Al-Faisaly", "Al-Fateh", "Al-Fayha", "Al-Hazem", "Al-Khaleej", "Al-Kholood", "Al-Riyadh", "Al-Taawoun", "Albacete", "Almer\xEDa", "Altach", "Alverca", "Amedspor", "Annecy", "Arezzo", "Aris", "Arminia Bielefeld", "Arouca", "Ascoli", "Asteras Tripolis", "Atlante", "Atlas", "Atromitos", "Austria Lustenau", "Austria Wien", "Avellino", "Benevento", "Beveren", "Blackburn Rovers", "Bochum", "Bolton Wanderers", "Boulogne", "Braunschweig", "Burgos", "CF Montr\xE9al", "Cambuur", "Cardiff City", "Carrarese", "Casa Pia", "Castell\xF3n", "Catanzaro", "Cesena", "Ceuta", "Chapecoense", "Charleroi", "Clermont", "Coritiba", "Cremonese", "C\xE1diz", "C\xF3rdoba", "D.C. United", "Darmstadt", "Dijon", "Dundee", "Dundee United", "Dunkerque", "Dynamo Dresden", "Eibar", "Eldense", "Empoli", "Energie Cottbus", "Entella", "Erzurumspor", "Estrela Amadora", "Excelsior", "Ey\xFCpspor", "FC Andorra", "FC Cincinnati", "FC Dallas", "FC Z\xFCrich", "Falkirk", "Fortuna Sittard", "Gaziantep FK", "Gen\xE7lerbirli\u011Fi", "Gil Vicente", "Go Ahead Eagles", "Gorica", "Granada", "Grasshopper", "Grazer AK", "Grenoble", "Greuther F\xFCrth", "Groningen", "Guingamp", "Hannover 96", "Hartberg", "Hearts", "Hertha BSC", "Hibernian", "Iraklis", "Istra 1961", "Juve Stabia", "Kaiserslautern", "Kalamata", "Karlsruhe", "Kas\u0131mpa\u015Fa", "Kifisia", "Kilmarnock", "Kocaelispor", "Konyaspor", "Kortrijk", "LA Galaxy", "LASK", "La Louvi\xE8re", "Las Palmas", "Lausanne-Sport", "Laval", "Le Mans", "Legan\xE9s", "Levadiakos", "Lincoln City", "Lokomotiva Zagreb", "Lommel", "Lugano", "Luzern", "Lyngby", "Magdeburg", "Mantova", "Mar\xEDtimo", "Metz", "Mirassol", "Modena", "Montpellier", "Moreirense", "Motherwell", "M\xE1laga", "NEC Nijmegen", "Nacional", "Nancy", "Nashville SC", "OB", "OFI", "OH Leuven", "Osijek", "Osnabr\xFCck", "PEC Zwolle", "Padova", "Palermo", "Panetolikos", "Pau", "Portsmouth", "Puebla", "Quer\xE9taro", "Randers FC", "Real Oviedo", "Real Salt Lake", "Red Star FC", "Remo", "Ried", "Rijeka", "Rodez", "Rude\u0161", "Sabadell", "Sampdoria", "San Jose Earthquakes", "Santa Clara", "Santos Laguna", "Servette", "Silkeborg IF", "Sion", "Slaven Belupo", "Sochaux", "Sparta Rotterdam", "Sporting Gij\xF3n", "Sporting Kansas City", "St Johnstone", "St Mirren", "St. Gallen", "Standard Li\xE8ge", "S\xF8nderjyskE", "S\xFCdtirol", "Telstar", "Tenerife", "Thun", "Tijuana", "Troyes", "Vaduz", "Valladolid", "Vara\u017Edin", "Viborg FF", "Vicenza", "Volos", "WSG Tirol", "Willem II", "Wolfsberger AC", "Zulte Waregem", "\xC7orum FK"];
var CM_ROSTERS = {
  "AC Horsens": [],
  "AC Milan": [
    { n: "Christian Pulisic", p: "RW", a: 27, v: 40.5, r: 86 },
    { n: "Gon\xE7alo Ramos", p: "ST", a: 24, v: 28.5, r: 84 },
    { n: "Strahinja Pavlovi\u0107", p: "CB", a: 24, v: 28.5, r: 84 },
    { n: "Mario Gila", p: "CB", a: 25, v: 24, r: 83 },
    { n: "Omari Hutchinson", p: "CAM", a: 22, v: 24, r: 83 },
    { n: "Alexis Saelemaekers", p: "RM", a: 26, v: 20.3, r: 82 },
    { n: "Diego Moreira", p: "LM", a: 21, v: 20.3, r: 82 },
    { n: "Mike Maignan", p: "GK", a: 30, v: 20.3, r: 82 },
    { n: "Davide Bartesaghi", p: "LB", a: 20, v: 18.8, r: 82 },
    { n: "Koni De Winter", p: "CB", a: 23, v: 18.8, r: 82 },
    { n: "Ardon Jashari", p: "CDM", a: 23, v: 17.8, r: 82 },
    { n: "Adrien Rabiot", p: "CM", a: 30, v: 16.5, r: 81 },
    { n: "Fikayo Tomori", p: "CB", a: 28, v: 16.5, r: 81 },
    { n: "Matteo Gabbia", p: "CB", a: 26, v: 16.5, r: 81 },
    { n: "Samuel Chukwueze", p: "RW", a: 26, v: 12, r: 79 },
    { n: "Pervis Estupi\xF1\xE1n", p: "LB", a: 27, v: 11.3, r: 79 },
    { n: "Ruben Loftus-Cheek", p: "CM", a: 29, v: 8.3, r: 77 },
    { n: "Alphadjo Ciss\xE8", p: "CAM", a: 19, v: 6, r: 76 },
    { n: "Luka Modri\u0107", p: "CM", a: 40, v: 3, r: 72 }
  ],
  "ADO Den Haag": [],
  "AEK Athens": [
    { n: "Lovro Majer", p: "CAM", a: 27, v: 8.3, r: 77 },
    { n: "Luka Jovi\u0107", p: "ST", a: 28, v: 6, r: 76 },
    { n: "Orbel\xEDn Pineda", p: "CM", a: 29, v: 6, r: 76 },
    { n: "Aboubakary Koita", p: "LW", a: 27, v: 3.8, r: 73 },
    { n: "Harold Moukoudi", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Barnab\xE1s Varga", p: "ST", a: 31, v: 3, r: 72 },
    { n: "Dereck Kutesa", p: "LW", a: 28, v: 3, r: 72 },
    { n: "Lazaros Rota", p: "RB", a: 28, v: 3, r: 72 },
    { n: "Niclas Eliasson", p: "RM", a: 30, v: 3, r: 72 },
    { n: "R\u0103zvan Marin", p: "CM", a: 29, v: 3, r: 72 },
    { n: "James Penrice", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Robert Ljubicic", p: "CM", a: 26, v: 2.3, r: 70 },
    { n: "Thomas Strakosha", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Kervin Arriaga", p: "CDM", a: 27, v: 1.6, r: 68 },
    { n: "Dimitrios Kaloskamis", p: "CAM", a: 20, v: 1.5, r: 68 },
    { n: "Mijat Gacinovic", p: "CAM", a: 30, v: 1.5, r: 68 },
    { n: "Stavro Pilo", p: "LB", a: 25, v: 1.4, r: 68 }
  ],
  "AGF": [
    { n: "Kristian Arnstad", p: "LW", a: 22, v: 3.8, r: 73 },
    { n: "Tobias Bech", p: "RW", a: 23, v: 3, r: 72 },
    { n: "Gift Links", p: "LM", a: 27, v: 1.5, r: 68 },
    { n: "Rasmus Carstensen", p: "RM", a: 25, v: 1.5, r: 68 },
    { n: "Jacob Andersen", p: "RM", a: 21, v: 0.8, r: 64 },
    { n: "Mads Hedenstad", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "AZ Alkmaar": [
    { n: "Kees Smit", p: "CM", a: 19, v: 20.3, r: 82 },
    { n: "Peer Koopmeiners", p: "CDM", a: 25, v: 12.2, r: 80 },
    { n: "Wouter Goes", p: "CB", a: 21, v: 12, r: 79 },
    { n: "Sven Mijnans", p: "CAM", a: 25, v: 11.3, r: 79 },
    { n: "Mexx Meerdink", p: "ST", a: 22, v: 8.3, r: 77 },
    { n: "Alexandre Penetra", p: "CB", a: 24, v: 7.5, r: 77 },
    { n: "Rome-Jayden Owusu-Oduro", p: "GK", a: 21, v: 6, r: 76 },
    { n: "Stije Resink", p: "CDM", a: 22, v: 5.7, r: 75 },
    { n: "Denso Kasius", p: "RB", a: 23, v: 4.5, r: 74 },
    { n: "Weslley Patati", p: "RW", a: 22, v: 4.5, r: 74 },
    { n: "Mees de Wit", p: "LB", a: 27, v: 3.8, r: 73 },
    { n: "Ayoub Oufkir", p: "RW", a: 19, v: 3, r: 72 },
    { n: "Isak Jensen", p: "LW", a: 22, v: 3, r: 72 },
    { n: "Matej Sin", p: "CAM", a: 21, v: 3, r: 72 },
    { n: "Mateo Ch\xE1vez", p: "LB", a: 21, v: 3, r: 72 },
    { n: "Elijah Dijkstra", p: "RB", a: 19, v: 2.3, r: 70 },
    { n: "Seiya Maikuma", p: "RB", a: 28, v: 2.3, r: 70 }
  ],
  "Aberdeen": [
    { n: "Jeppe Okkels", p: "LW", a: 26, v: 2.1, r: 70 },
    { n: "Marius M\xFCller", p: "GK", a: 32, v: 1.4, r: 68 },
    { n: "Alexander Jensen", p: "RB", a: 24, v: 0.8, r: 64 },
    { n: "Ryan Duncan", p: "LM", a: 19, v: 0.8, r: 64 }
  ],
  "Abha": [
    { n: "Abdou Diallo", p: "CB", a: 29, v: 3.8, r: 73 },
    { n: "Michy Batshuayi", p: "ST", a: 32, v: 3.6, r: 73 }
  ],
  "Acad\xE9mico de Viseu": [],
  "Ajax": [
    { n: "Simon Adingra", p: "LW", a: 24, v: 20.3, r: 82 },
    { n: "Tolu Arokodare", p: "ST", a: 25, v: 18, r: 82 },
    { n: "Julian Brandt", p: "CAM", a: 29, v: 16.5, r: 81 },
    { n: "Youri Baas", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Jorthy Mokio", p: "CDM", a: 17, v: 12.2, r: 80 },
    { n: "Caio Henrique", p: "LB", a: 28, v: 12, r: 79 },
    { n: "Oscar Gloukh", p: "CAM", a: 21, v: 12, r: 79 },
    { n: "Thilo Kehrer", p: "CB", a: 29, v: 12, r: 79 },
    { n: "Kasper Dolberg", p: "ST", a: 28, v: 8.3, r: 77 },
    { n: "Maher Carrizo", p: "RW", a: 19, v: 8.3, r: 77 },
    { n: "Oleksandr Zinchenko", p: "LB", a: 29, v: 8.3, r: 77 },
    { n: "Yves Bissouma", p: "CDM", a: 29, v: 8.1, r: 77 },
    { n: "Sofyan Amrabat", p: "CDM", a: 29, v: 6.5, r: 76 },
    { n: "Anton Gaaei", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "Rayane Bounida", p: "CAM", a: 19, v: 3.8, r: 73 },
    { n: "Vitezslav Jaros", p: "GK", a: 24, v: 3.8, r: 73 },
    { n: "Oliver Edvardsen", p: "LW", a: 26, v: 3.6, r: 73 },
    { n: "Lucas Rosa", p: "RB", a: 25, v: 3, r: 72 },
    { n: "Marc-Andr\xE9 ter Stegen", p: "GK", a: 33, v: 3, r: 72 },
    { n: "Owen Wijndal", p: "LB", a: 26, v: 3, r: 72 },
    { n: "Davy Klaassen", p: "CM", a: 32, v: 2.9, r: 71 },
    { n: "Steven Berghuis", p: "RW", a: 34, v: 2.9, r: 71 },
    { n: "Wout Weghorst", p: "ST", a: 33, v: 2.9, r: 71 },
    { n: "Matheus", p: "GK", a: 33, v: 2.1, r: 70 },
    { n: "Maarten Paes", p: "GK", a: 27, v: 1.5, r: 68 }
  ],
  "Al-Ahli": [
    { n: "Francisco Trinc\xE3o", p: "CAM", a: 26, v: 28.5, r: 84 },
    { n: "Enzo Millot", p: "CAM", a: 23, v: 22.5, r: 83 },
    { n: "Eduard Spertsyan", p: "CAM", a: 25, v: 20.3, r: 82 },
    { n: "Galeno", p: "LW", a: 28, v: 18, r: 82 },
    { n: "Ivan Toney", p: "ST", a: 29, v: 16.5, r: 81 },
    { n: "Valentin Atangana", p: "CM", a: 20, v: 14.3, r: 80 },
    { n: "Roger Iba\xF1ez", p: "CB", a: 27, v: 13.5, r: 80 },
    { n: "Merih Demiral", p: "CB", a: 27, v: 11.3, r: 79 },
    { n: "Matheus Gon\xE7alves", p: "RW", a: 20, v: 7.5, r: 77 },
    { n: "Ricardo Mathias", p: "ST", a: 19, v: 6.8, r: 76 },
    { n: "Riyad Mahrez", p: "RW", a: 34, v: 6, r: 76 },
    { n: "Edouard Mendy", p: "GK", a: 33, v: 3.8, r: 73 },
    { n: "Roberto Firmino", p: "ST", a: 34, v: 3.6, r: 73 },
    { n: "Firas Al-Buraikan", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Matteo Dams", p: "LB", a: 21, v: 3, r: 72 }
  ],
  "Al-Diriyah": [
    { n: "Ga\xEBtan Laborde", p: "ST", a: 31, v: 3, r: 72 },
    { n: "Georges-Kevin N'Koudou", p: "LW", a: 30, v: 2.3, r: 70 },
    { n: "\xD3scar Rodr\xEDguez", p: "CAM", a: 27, v: 1.5, r: 68 }
  ],
  "Al-Ettifaq": [
    { n: "Moussa Demb\xE9l\xE9", p: "ST", a: 29, v: 6, r: 76 },
    { n: "Abdoulaye Kant\xE9", p: "CDM", a: 20, v: 4.1, r: 73 },
    { n: "\xC1lvaro Medr\xE1n", p: "CM", a: 31, v: 3, r: 72 },
    { n: "Jo\xE3o Costa", p: "RW", a: 20, v: 2.3, r: 70 },
    { n: "Marek Rod\xE1k", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Ondrej Duda", p: "CM", a: 31, v: 2.3, r: 70 },
    { n: "Rayane Messi", p: "LW", a: 18, v: 2.3, r: 70 }
  ],
  "Al-Faisaly": [],
  "Al-Fateh": [
    { n: "Zaydou Youssouf", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Mat\xEDas Vargas", p: "LW", a: 28, v: 3.8, r: 73 }
  ],
  "Al-Fayha": [
    { n: "Fashion Sakala", p: "LW", a: 28, v: 3, r: 72 },
    { n: "Jason Remeseiro", p: "RW", a: 31, v: 1.5, r: 68 }
  ],
  "Al-Hazem": [
    { n: "Bruno Varela", p: "GK", a: 31, v: 1.5, r: 68 },
    { n: "F\xE1bio Martins", p: "LW", a: 32, v: 1.5, r: 68 }
  ],
  "Al-Hilal": [
    { n: "Gabriel Martinelli", p: "LW", a: 24, v: 36.8, r: 86 },
    { n: "Crysencio Summerville", p: "LW", a: 24, v: 24, r: 83 },
    { n: "Ollie Watkins", p: "ST", a: 30, v: 24, r: 83 },
    { n: "Theo Hern\xE1ndez", p: "LB", a: 28, v: 22.5, r: 83 },
    { n: "Darwin N\xFA\xF1ez", p: "ST", a: 26, v: 20.3, r: 82 },
    { n: "R\xFAben Neves", p: "CDM", a: 29, v: 20.3, r: 82 },
    { n: "Malcom", p: "RW", a: 28, v: 16.5, r: 81 },
    { n: "Marcos Leonardo", p: "ST", a: 22, v: 16.5, r: 81 },
    { n: "Kader Me\xEFt\xE9", p: "ST", a: 18, v: 14.3, r: 80 },
    { n: "Aleksandar Mitrovi\u0107", p: "ST", a: 31, v: 13.5, r: 80 },
    { n: "Sa\xEFmon Bouabr\xE9", p: "CAM", a: 19, v: 12, r: 79 },
    { n: "Sergej Milinkovi\u0107-Savi\u0107", p: "CM", a: 30, v: 12, r: 79 },
    { n: "Yusuf Ak\xE7i\xE7ek", p: "CB", a: 19, v: 12, r: 79 },
    { n: "Kalidou Koulibaly", p: "CB", a: 34, v: 3.8, r: 73 },
    { n: "Yassine Bounou", p: "GK", a: 34, v: 3, r: 72 },
    { n: "Moteb Al-Harbi", p: "LB", a: 25, v: 0.8, r: 64 }
  ],
  "Al-Ittihad": [
    { n: "Richard R\xEDos", p: "CDM", a: 25, v: 20.3, r: 82 },
    { n: "Roger Fernandes", p: "RW", a: 20, v: 18, r: 82 },
    { n: "George Ilenikhena", p: "ST", a: 19, v: 9.8, r: 78 },
    { n: "Jan-Carlo Simi\u0107", p: "CB", a: 20, v: 9.8, r: 78 },
    { n: "Steven Bergwijn", p: "LW", a: 28, v: 9.8, r: 78 },
    { n: "Mahamadou Doumbia", p: "CM", a: 21, v: 7.5, r: 77 },
    { n: "Houssem Aouar", p: "CAM", a: 27, v: 6.8, r: 76 },
    { n: "Predrag Rajkovi\u0107", p: "GK", a: 30, v: 6, r: 76 },
    { n: "Karim Benzema", p: "ST", a: 38, v: 4.5, r: 74 },
    { n: "Danilo Pereira", p: "CB", a: 34, v: 3.6, r: 73 }
  ],
  "Al-Khaleej": [
    { n: "Musa Barrow", p: "LW", a: 27, v: 5.7, r: 75 },
    { n: "Angelo Fulgini", p: "CAM", a: 29, v: 3.8, r: 73 },
    { n: "Miguel Crespo", p: "CM", a: 29, v: 2.1, r: 70 },
    { n: "Anthony Moris", p: "GK", a: 35, v: 1.5, r: 68 },
    { n: "Georgios Masouras", p: "LW", a: 32, v: 1.5, r: 68 }
  ],
  "Al-Kholood": [
    { n: "Juan Pablo Cozzani", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Ramiro Enrique", p: "ST", a: 24, v: 3, r: 72 },
    { n: "\xC1lex Collado", p: "CAM", a: 26, v: 1.4, r: 68 }
  ],
  "Al-Nassr": [
    { n: "Jo\xE3o F\xE9lix", p: "CF", a: 26, v: 19.2, r: 82 },
    { n: "Kingsley Coman", p: "LW", a: 29, v: 18, r: 82 },
    { n: "Mohamed Simakan", p: "CB", a: 25, v: 16.5, r: 81 },
    { n: "Sam\xFA Costa", p: "CDM", a: 25, v: 12.2, r: 80 },
    { n: "\xC2ngelo", p: "RW", a: 21, v: 11.3, r: 79 },
    { n: "Cristiano Ronaldo", p: "ST", a: 40, v: 9.8, r: 78 },
    { n: "Bento", p: "GK", a: 26, v: 7.5, r: 77 },
    { n: "Sadio Man\xE9", p: "LW", a: 33, v: 6, r: 76 },
    { n: "I\xF1igo Mart\xEDnez", p: "CB", a: 34, v: 3.8, r: 73 },
    { n: "Ayman Yahya", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Nawaf Boushal", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Sultan Al-Ghannam", p: "RB", a: 31, v: 1.5, r: 68 },
    { n: "Abdulrahman Ghareeb", p: "LW", a: 28, v: 1.4, r: 68 },
    { n: "Saad Haqawi", p: "CF", a: 20, v: 0.7, r: 64 }
  ],
  "Al-Qadsiah": [
    { n: "Tijjani Reijnders", p: "CM", a: 27, v: 48.8, r: 87 },
    { n: "Mateo Retegui", p: "ST", a: 26, v: 28.5, r: 84 },
    { n: "Christopher Bonsu Baah", p: "LW", a: 21, v: 9.8, r: 78 },
    { n: "Gabriel Carvalho", p: "RW", a: 18, v: 9.8, r: 78 },
    { n: "Juli\xE1n Qui\xF1ones", p: "ST", a: 28, v: 9.8, r: 78 },
    { n: "Ot\xE1vio", p: "CAM", a: 30, v: 9.8, r: 78 },
    { n: "Gast\xF3n \xC1lvarez", p: "CB", a: 25, v: 6.8, r: 76 },
    { n: "Musab Al-Juwayr", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Nahitan N\xE1ndez", p: "CM", a: 30, v: 3.8, r: 73 },
    { n: "Suleman Sani", p: "LW", a: 19, v: 3.8, r: 73 },
    { n: "Julian Weigl", p: "CDM", a: 30, v: 3.7, r: 73 },
    { n: "Koen Casteels", p: "GK", a: 33, v: 3, r: 72 },
    { n: "Mohammed Abu Al-Shamat", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "Al-Riyadh": [
    { n: "Toz\xE9", p: "CAM", a: 32, v: 2.3, r: 70 },
    { n: "Khaled Al-Asbahi", p: "LM", a: 22, v: 0.7, r: 64 }
  ],
  "Al-Shabab": [
    { n: "Josh Brownhill", p: "CM", a: 30, v: 8.3, r: 77 },
    { n: "Yacine Adli", p: "CDM", a: 25, v: 6.1, r: 76 },
    { n: "Yannick Carrasco", p: "LW", a: 32, v: 4.5, r: 74 },
    { n: "Georgiy Bushchan", p: "GK", a: 31, v: 4.3, r: 74 },
    { n: "Carlos J\xFAnior", p: "RW", a: 30, v: 3, r: 72 },
    { n: "Cristian Guanca", p: "CAM", a: 32, v: 2.9, r: 71 },
    { n: "Thomas Partey", p: "CDM", a: 33, v: 1.7, r: 68 },
    { n: "Leandrinho", p: "LB", a: 20, v: 1.4, r: 68 }
  ],
  "Al-Taawoun": [
    { n: "Biel", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Mailson", p: "GK", a: 29, v: 3, r: 72 },
    { n: "Marin Petkov", p: "RW", a: 22, v: 3, r: 72 },
    { n: "Aschraf El Mahdioui", p: "CDM", a: 29, v: 2.4, r: 71 }
  ],
  "Alanyaspor": [
    { n: "Maestro", p: "CDM", a: 22, v: 5.7, r: 75 },
    { n: "\xDCmit Akda\u011F", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Yusuf \xD6zdemir", p: "LM", a: 22, v: 2.3, r: 70 },
    { n: "Gaius Makouta", p: "CDM", a: 28, v: 1.6, r: 68 },
    { n: "Florent Hadergjonaj", p: "RM", a: 31, v: 1.5, r: 68 },
    { n: "Ianis Hagi", p: "CAM", a: 27, v: 1.5, r: 68 },
    { n: "Meschack Elia", p: "CAM", a: 28, v: 1.5, r: 68 },
    { n: "Ruan", p: "LM", a: 20, v: 1.5, r: 68 },
    { n: "Enes Keskin", p: "RM", a: 24, v: 0.8, r: 64 }
  ],
  "Alav\xE9s": [
    { n: "Antonio Blanco", p: "CDM", a: 25, v: 8.1, r: 77 },
    { n: "Antonio Sivera", p: "GK", a: 29, v: 4.5, r: 74 },
    { n: "Jon Pacheco", p: "CB", a: 24, v: 4.5, r: 74 },
    { n: "Nicol\xE1s Valentini", p: "CB", a: 24, v: 4.3, r: 74 },
    { n: "Lucas Boy\xE9", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Miguel Rodr\xEDguez", p: "RW", a: 22, v: 3.8, r: 73 },
    { n: "Youssef Enr\xEDquez", p: "LB", a: 20, v: 3.6, r: 73 },
    { n: "Carles Ale\xF1\xE1", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Pablo Ib\xE1\xF1ez", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Toni Mart\xEDnez", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Ander Guevara", p: "CM", a: 28, v: 2.3, r: 70 },
    { n: "Jonny Otto", p: "RB", a: 31, v: 2.3, r: 70 },
    { n: "Nahuel Tenaglia", p: "RB", a: 29, v: 2.3, r: 70 },
    { n: "Calebe", p: "CAM", a: 25, v: 1.5, r: 68 },
    { n: "Victor Parada", p: "LB", a: 23, v: 1.5, r: 68 },
    { n: "Hugo Novoa", p: "RB", a: 22, v: 1.4, r: 68 },
    { n: "Tom\xE1s Conechny", p: "LW", a: 27, v: 1.4, r: 68 }
  ],
  "Albacete": [
    { n: "Agust\xEDn Albarrac\xEDn", p: "LW", a: 20, v: 1.5, r: 68 }
  ],
  "Almer\xEDa": [
    { n: "Sergio Arribas", p: "CAM", a: 24, v: 12, r: 79 },
    { n: "Thalys", p: "ST", a: 20, v: 4.5, r: 74 },
    { n: "Nico Melamed", p: "CAM", a: 24, v: 2.3, r: 70 },
    { n: "\xC1lex Sola", p: "RW", a: 26, v: 2.1, r: 70 },
    { n: "Daijiro Chirino", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "Altach": [],
  "Alverca": [
    { n: "Chissumba", p: "LB", a: 20, v: 3.8, r: 73 },
    { n: "Bastien Meupiyou", p: "CB", a: 19, v: 3, r: 72 },
    { n: "Lincoln", p: "CAM", a: 27, v: 3, r: 72 },
    { n: "Z\xE9 Rafael", p: "CM", a: 32, v: 2.9, r: 71 },
    { n: "Nabil Touaizi", p: "RM", a: 24, v: 0.8, r: 64 }
  ],
  "Amedspor": [],
  "Am\xE9rica": [
    { n: "\xC1lex Zendejas", p: "RW", a: 27, v: 8.3, r: 77 },
    { n: "Santiago Bueno", p: "CB", a: 27, v: 8.3, r: 77 },
    { n: "Brian Rodr\xEDguez", p: "LW", a: 25, v: 6.8, r: 76 },
    { n: "Luis Malag\xF3n", p: "GK", a: 28, v: 5.3, r: 75 },
    { n: "\xC9rick S\xE1nchez", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Isa\xEDas Violante", p: "LW", a: 22, v: 4.5, r: 74 },
    { n: "Israel Reyes", p: "CB", a: 25, v: 3.8, r: 73 },
    { n: "Ram\xF3n Ju\xE1rez", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "V\xEDctor D\xE1vila", p: "ST", a: 28, v: 3.8, r: 73 },
    { n: "Alan Cervantes", p: "CDM", a: 27, v: 3.6, r: 73 },
    { n: "Alexis Guti\xE9rrez", p: "CAM", a: 25, v: 3, r: 72 },
    { n: "Edwin Cerrillo", p: "CDM", a: 25, v: 2.8, r: 71 },
    { n: "Kevin \xC1lvarez", p: "RB", a: 26, v: 2.3, r: 70 },
    { n: "Ralph Orquin", p: "LB", a: 22, v: 2.3, r: 70 },
    { n: "Dagoberto Espinoza", p: "RB", a: 21, v: 2.1, r: 70 },
    { n: "Aar\xF3n Mej\xEDa", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Cristi\xE1n Borja", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "\xD3scar Perea", p: "LW", a: 20, v: 1.5, r: 68 },
    { n: "Thiago Espinosa", p: "LB", a: 21, v: 0.8, r: 64 }
  ],
  "Anderlecht": [
    { n: "Andrew Omobamidele", p: "CB", a: 23, v: 6, r: 76 },
    { n: "Mario Stroeykens", p: "CAM", a: 21, v: 4.5, r: 74 },
    { n: "Mihajlo Cvetkovic", p: "ST", a: 18, v: 4.5, r: 74 },
    { n: "Adriano Bertaccini", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Danylo Sikan", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "Yasin \xD6zcan", p: "CB", a: 19, v: 3.8, r: 73 },
    { n: "Lucas Hey", p: "CB", a: 22, v: 3.6, r: 73 },
    { n: "Ilay Camara", p: "RB", a: 22, v: 3, r: 72 },
    { n: "Killian Sardella", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Coba da Costa", p: "LW", a: 23, v: 2.3, r: 70 },
    { n: "Tristan Degreef", p: "RW", a: 20, v: 2.3, r: 70 },
    { n: "Yari Verschaeren", p: "CAM", a: 24, v: 2.3, r: 70 },
    { n: "Enric Llansana", p: "CDM", a: 24, v: 1.6, r: 68 },
    { n: "Ali Maamar", p: "RB", a: 20, v: 1.5, r: 68 },
    { n: "Colin Coosemans", p: "GK", a: 33, v: 1.5, r: 68 },
    { n: "Ludwig Augustinsson", p: "LB", a: 31, v: 1.5, r: 68 },
    { n: "Thomas Foket", p: "RB", a: 31, v: 1.4, r: 68 }
  ],
  "Angers": [
    { n: "Prosper Peter", p: "ST", a: 18, v: 12, r: 79 },
    { n: "Ousmane Camara", p: "CB", a: 22, v: 6.8, r: 76 },
    { n: "Jacques Ekomi\xE9", p: "LB", a: 22, v: 6, r: 76 },
    { n: "Yassin Belkhdim", p: "CM", a: 23, v: 6, r: 76 },
    { n: "Herv\xE9 Koffi", p: "GK", a: 29, v: 3.8, r: 73 },
    { n: "Louis Mouton", p: "CAM", a: 23, v: 3.8, r: 73 },
    { n: "Lilian Raolisoa", p: "RB", a: 25, v: 3, r: 72 },
    { n: "Branco van den Boomen", p: "CM", a: 30, v: 2.9, r: 71 },
    { n: "Emmanuel Biumla", p: "CB", a: 20, v: 2.9, r: 71 },
    { n: "Amine Sba\xEF", p: "LW", a: 25, v: 2.3, r: 70 },
    { n: "Carlens Arcus", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Harouna Djibirin", p: "RW", a: 19, v: 1.5, r: 68 }
  ],
  "Annecy": [
    { n: "Cl\xE9ment Billemaz", p: "LM", a: 25, v: 0.8, r: 64 }
  ],
  "Antwerp": [
    { n: "Arthur Vermeeren", p: "CDM", a: 20, v: 16.2, r: 81 },
    { n: "Vincent Janssen", p: "ST", a: 31, v: 3.8, r: 73 },
    { n: "Daam Foulon", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Gyrano Kerk", p: "RW", a: 30, v: 2.3, r: 70 },
    { n: "Taishi Brandon Nozawa", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Thibo Somers", p: "RM", a: 26, v: 2.3, r: 70 },
    { n: "Jelle Bataille", p: "RB", a: 26, v: 2.1, r: 70 },
    { n: "Farouck Adekami", p: "CAM", a: 19, v: 1.5, r: 68 },
    { n: "Isaac Babadi", p: "CAM", a: 20, v: 1.5, r: 68 },
    { n: "Christopher Scott", p: "LM", a: 21, v: 0.8, r: 64 }
  ],
  "Arezzo": [],
  "Aris": [
    { n: "Monchu", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Christian Kouam\xE9", p: "ST", a: 28, v: 4.3, r: 74 },
    { n: "Benjam\xEDn Garr\xE9", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Uros Racic", p: "CDM", a: 27, v: 2.4, r: 71 },
    { n: "Fredrik Jensen", p: "CAM", a: 28, v: 2.3, r: 70 },
    { n: "\xC1lvaro Tejero", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Noah Fadiga", p: "RB", a: 26, v: 1.5, r: 68 }
  ],
  "Arminia Bielefeld": [
    { n: "Monju Momuluh", p: "RW", a: 23, v: 1.5, r: 68 },
    { n: "Henri Koudossou", p: "RB", a: 26, v: 1.4, r: 68 },
    { n: "Jonas Kersken", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "Arouca": [
    { n: "Morlaye Sylla", p: "LW", a: 27, v: 2.1, r: 70 },
    { n: "Amadou Dante", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Ignacio de Arruabarrena", p: "GK", a: 28, v: 0.8, r: 64 }
  ],
  "Arsenal": [
    { n: "Bukayo Saka", p: "RW", a: 24, v: 97.5, r: 91 },
    { n: "Declan Rice", p: "CM", a: 26, v: 97.5, r: 91 },
    { n: "William Saliba", p: "CB", a: 24, v: 72.8, r: 90 },
    { n: "Bruno Guimar\xE3es", p: "CM", a: 28, v: 60.8, r: 89 },
    { n: "Gabriel", p: "CB", a: 28, v: 60.8, r: 89 },
    { n: "Mart\xEDn Zubimendi", p: "CDM", a: 27, v: 60.8, r: 89 },
    { n: "Jurri\xEBn Timber", p: "RB", a: 24, v: 57, r: 88 },
    { n: "Martin \xD8degaard", p: "CAM", a: 27, v: 52.5, r: 88 },
    { n: "Viktor Gy\xF6keres", p: "ST", a: 27, v: 52.5, r: 88 },
    { n: "Eberechi Eze", p: "CAM", a: 27, v: 48.8, r: 87 },
    { n: "Kai Havertz", p: "ST", a: 26, v: 40.5, r: 86 },
    { n: "Noni Madueke", p: "RW", a: 23, v: 40.5, r: 86 },
    { n: "Piero Hincapi\xE9", p: "CB", a: 23, v: 40.5, r: 86 },
    { n: "Riccardo Calafiori", p: "LB", a: 23, v: 40.5, r: 86 },
    { n: "Ezri Konsa", p: "CB", a: 28, v: 32.3, r: 85 },
    { n: "Cristhian Mosquera", p: "CB", a: 21, v: 28.5, r: 84 },
    { n: "David Raya", p: "GK", a: 30, v: 28.5, r: 84 },
    { n: "Myles Lewis-Skelly", p: "LB", a: 19, v: 28.5, r: 84 },
    { n: "Ben White", p: "RB", a: 28, v: 24, r: 83 },
    { n: "Christos Tzolis", p: "LW", a: 23, v: 24, r: 83 },
    { n: "Mikel Merino", p: "CM", a: 29, v: 24, r: 83 },
    { n: "Max Dowman", p: "RW", a: 16, v: 16.5, r: 81 },
    { n: "Illan Meslier", p: "GK", a: 25, v: 8.3, r: 77 },
    { n: "Kepa Arrizabalaga", p: "GK", a: 31, v: 6, r: 76 },
    { n: "Valent\xEDn Serrano", p: "LM", a: 19, v: 0.8, r: 64 }
  ],
  "Ascoli": [
    { n: "Andrea Oliveri", p: "RM", a: 22, v: 0.8, r: 64 }
  ],
  "Asteras Tripolis": [],
  "Aston Villa": [
    { n: "Amadou Onana", p: "CDM", a: 25, v: 36.5, r: 86 },
    { n: "Boubacar Kamara", p: "CDM", a: 26, v: 32.4, r: 85 },
    { n: "Alejandro Garnacho", p: "LW", a: 21, v: 32.3, r: 85 },
    { n: "Nicolas Jackson", p: "ST", a: 24, v: 32.3, r: 85 },
    { n: "Jo\xE3o Gomes", p: "CM", a: 24, v: 28.5, r: 84 },
    { n: "Johan Manzambi", p: "CM", a: 20, v: 28.5, r: 84 },
    { n: "Ian Maatsen", p: "LB", a: 23, v: 24, r: 83 },
    { n: "Ibrahim Mbaye", p: "RW", a: 17, v: 24, r: 83 },
    { n: "Aaron Wan-Bissaka", p: "RB", a: 28, v: 18, r: 82 },
    { n: "Matty Cash", p: "RB", a: 28, v: 18, r: 82 },
    { n: "Pau Torres", p: "CB", a: 28, v: 18, r: 82 },
    { n: "Jadon Sancho", p: "LW", a: 25, v: 16.5, r: 81 },
    { n: "Matteo Ruggeri", p: "LB", a: 23, v: 16.5, r: 81 },
    { n: "Tammy Abraham", p: "ST", a: 28, v: 16.5, r: 81 },
    { n: "Taylor Harwood-Bellis", p: "CB", a: 23, v: 16.5, r: 81 },
    { n: "Zion Suzuki", p: "GK", a: 23, v: 16.5, r: 81 },
    { n: "Lamare Bogarde", p: "CDM", a: 21, v: 14.6, r: 81 },
    { n: "Emiliano Buend\xEDa", p: "CAM", a: 29, v: 14.3, r: 80 },
    { n: "John McGinn", p: "CM", a: 31, v: 12, r: 79 },
    { n: "Leon Goretzka", p: "CM", a: 30, v: 12, r: 79 },
    { n: "Alysson", p: "RW", a: 19, v: 8.3, r: 77 },
    { n: "Victor Lindel\xF6f", p: "CB", a: 31, v: 4.5, r: 74 },
    { n: "Tyrone Mings", p: "CB", a: 32, v: 4.3, r: 74 },
    { n: "Modou K\xE9ba Ciss\xE9", p: "CB", a: 20, v: 3.8, r: 73 },
    { n: "Ross Barkley", p: "CM", a: 32, v: 3.8, r: 73 },
    { n: "Marco Bizot", p: "GK", a: 34, v: 2.3, r: 70 }
  ],
  "Atalanta": [
    { n: "\xC9derson", p: "CM", a: 26, v: 32.3, r: 85 },
    { n: "Charles De Ketelaere", p: "CAM", a: 24, v: 27.1, r: 84 },
    { n: "Giorgio Scalvini", p: "CB", a: 22, v: 24, r: 83 },
    { n: "Gianluca Scamacca", p: "ST", a: 27, v: 20.3, r: 82 },
    { n: "Marco Carnesecchi", p: "GK", a: 25, v: 20.3, r: 82 },
    { n: "Nikola Krstovi\u0107", p: "ST", a: 25, v: 20.3, r: 82 },
    { n: "Giacomo Raspadori", p: "CF", a: 25, v: 19.2, r: 82 },
    { n: "Isak Hien", p: "CB", a: 26, v: 18, r: 82 },
    { n: "Jonathan Rowe", p: "LW", a: 22, v: 16.5, r: 81 },
    { n: "Nicola Zalewski", p: "LM", a: 23, v: 16.5, r: 81 },
    { n: "Kamaldeen Sulemana", p: "LW", a: 23, v: 14.3, r: 80 },
    { n: "Odilon Kossounou", p: "CB", a: 24, v: 14.3, r: 80 },
    { n: "Raoul Bellanova", p: "RM", a: 25, v: 14.3, r: 80 },
    { n: "Yunus Musah", p: "CM", a: 23, v: 14.3, r: 80 },
    { n: "Lazar Samard\u017Ei\u0107", p: "CAM", a: 23, v: 13.5, r: 80 },
    { n: "Lorenzo Bernasconi", p: "LM", a: 22, v: 12, r: 79 },
    { n: "Eljif Elmas", p: "CAM", a: 26, v: 11.3, r: 79 },
    { n: "Franck Kessi\xE9", p: "CM", a: 29, v: 9.8, r: 78 },
    { n: "Thomas Kristensen", p: "CB", a: 23, v: 9.8, r: 78 },
    { n: "Mario Pa\u0161ali\u0107", p: "CM", a: 30, v: 6, r: 76 },
    { n: "Mitchel Bakker", p: "LM", a: 23, v: 6, r: 76 },
    { n: "Sead Kolasinac", p: "CB", a: 32, v: 4.5, r: 74 },
    { n: "Berat Djimsiti", p: "CB", a: 32, v: 3.8, r: 73 },
    { n: "Davide Zappacosta", p: "RM", a: 33, v: 3, r: 72 }
  ],
  "Athletic Club": [
    { n: "Nico Williams", p: "LW", a: 23, v: 40.5, r: 86 },
    { n: "Mikel Jauregizar", p: "CM", a: 22, v: 28.5, r: 84 },
    { n: "Oihan Sancet", p: "CAM", a: 25, v: 28.5, r: 84 },
    { n: "Dani Vivian", p: "CB", a: 26, v: 20.3, r: 82 },
    { n: "Unai Sim\xF3n", p: "GK", a: 28, v: 20.3, r: 82 },
    { n: "Be\xF1at Prados", p: "CM", a: 24, v: 14.3, r: 80 },
    { n: "Aitor Paredes", p: "CB", a: 25, v: 12, r: 79 },
    { n: "I\xF1aki Williams", p: "RW", a: 31, v: 8.3, r: 77 },
    { n: "Aymeric Laporte", p: "CB", a: 31, v: 7.5, r: 77 },
    { n: "Jes\xFAs Areso", p: "RB", a: 26, v: 6.8, r: 76 },
    { n: "Peio Canales", p: "CAM", a: 20, v: 6.8, r: 76 },
    { n: "Yeray \xC1lvarez", p: "CB", a: 30, v: 5.7, r: 75 },
    { n: "Robert Navarro", p: "RW", a: 23, v: 4.5, r: 74 },
    { n: "\xC1lex Berenguer", p: "LW", a: 30, v: 3.8, r: 73 },
    { n: "Gorka Guruzeta", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Maroan Sannadi", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "Hugo Rinc\xF3n", p: "RB", a: 22, v: 3, r: 72 },
    { n: "Alejandro Rego", p: "CM", a: 22, v: 2.3, r: 70 },
    { n: "\xC1lex Padilla", p: "GK", a: 22, v: 2.3, r: 70 },
    { n: "Selton S\xE1nchez", p: "CM", a: 18, v: 2.3, r: 70 },
    { n: "Yuri Berchiche", p: "LB", a: 35, v: 1.4, r: 68 }
  ],
  "Athletico Paranaense": [
    { n: "Bruno Zapelli", p: "CAM", a: 23, v: 3.8, r: 73 },
    { n: "Juan Portilla", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Kevin Viveros", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Lucas Esquivel", p: "LB", a: 24, v: 3, r: 72 },
    { n: "Chiqueti", p: "CAM", a: 20, v: 2.3, r: 70 },
    { n: "Gast\xF3n Benav\xEDdez", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Mycael", p: "GK", a: 21, v: 2.3, r: 70 },
    { n: "Dudu", p: "CAM", a: 20, v: 1.5, r: 68 },
    { n: "Julimar", p: "LW", a: 24, v: 1.5, r: 68 }
  ],
  "Atlanta United": [
    { n: "Breel Embolo", p: "ST", a: 28, v: 9.8, r: 78 },
    { n: "Miguel Almir\xF3n", p: "RW", a: 31, v: 7.5, r: 77 },
    { n: "Aleksey Miranchuk", p: "CAM", a: 30, v: 6.8, r: 76 },
    { n: "J\xFAnior Alonso", p: "CB", a: 32, v: 3.6, r: 73 },
    { n: "Saba Lobjanidze", p: "LW", a: 31, v: 3, r: 72 },
    { n: "Tom\xE1s Jacob", p: "CB", a: 21, v: 3, r: 72 },
    { n: "Steven Alzate", p: "CM", a: 27, v: 2.9, r: 71 },
    { n: "El\xEDas B\xE1ez", p: "LB", a: 21, v: 2.3, r: 70 },
    { n: "Mat\xEDas Galarza", p: "CM", a: 23, v: 2.3, r: 70 },
    { n: "Brooks Lennon", p: "RB", a: 28, v: 2.1, r: 70 },
    { n: "Luke Brennan", p: "RM", a: 20, v: 0.8, r: 64 }
  ],
  "Atlante": [],
  "Atlas": [
    { n: "Diego Gonz\xE1lez", p: "RW", a: 22, v: 4.5, r: 74 },
    { n: "Duk", p: "LW", a: 25, v: 2.1, r: 70 },
    { n: "Arturo Gonz\xE1lez", p: "LW", a: 31, v: 1.5, r: 68 },
    { n: "Rivaldo Lozano", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Sergio Hern\xE1ndez", p: "LM", a: 21, v: 1.5, r: 68 },
    { n: "Gustavo Ferrareis", p: "RB", a: 29, v: 1.4, r: 68 },
    { n: "Jorge Guzm\xE1n", p: "LM", a: 20, v: 0.8, r: 64 }
  ],
  "Atl\xE9tico Madrid": [
    { n: "Juli\xE1n Alvarez", p: "ST", a: 25, v: 72.8, r: 90 },
    { n: "Pablo Barrios", p: "CM", a: 22, v: 48.8, r: 87 },
    { n: "Cristian Romero", p: "CB", a: 27, v: 40.5, r: 86 },
    { n: "\xC1lex Baena", p: "LW", a: 24, v: 36.8, r: 86 },
    { n: "Morten Hjulmand", p: "CDM", a: 26, v: 36.5, r: 86 },
    { n: "Ademola Lookman", p: "LW", a: 28, v: 32.3, r: 85 },
    { n: "Giuliano Simeone", p: "RW", a: 23, v: 32.3, r: 85 },
    { n: "D\xE1vid Hancko", p: "CB", a: 28, v: 28.5, r: 84 },
    { n: "Jonathan David", p: "ST", a: 25, v: 28.5, r: 84 },
    { n: "Kang-in Lee", p: "CAM", a: 24, v: 22.5, r: 83 },
    { n: "Marc Pubill", p: "CB", a: 22, v: 22.5, r: 83 },
    { n: "Robin Le Normand", p: "CB", a: 29, v: 20.3, r: 82 },
    { n: "Alejandro Grimaldo", p: "LB", a: 30, v: 19.5, r: 82 },
    { n: "Johnny Cardoso", p: "CM", a: 24, v: 18, r: 82 },
    { n: "Marcos Llorente", p: "RB", a: 30, v: 18, r: 82 },
    { n: "Alexander S\xF8rloth", p: "ST", a: 30, v: 16.5, r: 81 },
    { n: "Rodrigo Mendoza", p: "CM", a: 20, v: 16.5, r: 81 },
    { n: "Thiago Almada", p: "LW", a: 24, v: 16.5, r: 81 },
    { n: "Jan Oblak", p: "GK", a: 32, v: 13.5, r: 80 },
    { n: "Obed Vargas", p: "CM", a: 20, v: 6.8, r: 76 },
    { n: "Koke", p: "CM", a: 33, v: 4.5, r: 74 },
    { n: "Cl\xE9ment Lenglet", p: "CB", a: 30, v: 3.8, r: 73 },
    { n: "Juan Musso", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Salvi Esquivel", p: "GK", a: 20, v: 0.8, r: 64 }
  ],
  "Atl\xE9tico Mineiro": [
    { n: "Renan Lodi", p: "LB", a: 27, v: 9.8, r: 78 },
    { n: "Mateo Cassierra", p: "ST", a: 28, v: 7.5, r: 77 },
    { n: "Rubens", p: "LB", a: 24, v: 6.4, r: 76 },
    { n: "Alexsander", p: "CDM", a: 22, v: 4.5, r: 74 },
    { n: "Tom\xE1s Cuello", p: "LW", a: 25, v: 4.5, r: 74 },
    { n: "Kevin Casta\xF1o", p: "CDM", a: 25, v: 4.1, r: 73 },
    { n: "Alan Franco", p: "CM", a: 27, v: 3.8, r: 73 },
    { n: "Gustavo Scarpa", p: "CAM", a: 31, v: 3.8, r: 73 },
    { n: "Lyanco", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Natanael", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "Victor Hugo", p: "CM", a: 21, v: 3.8, r: 73 },
    { n: "Angelo Preciado", p: "RB", a: 27, v: 3, r: 72 },
    { n: "Tom\xE1s P\xE9rez", p: "CDM", a: 20, v: 2.4, r: 71 },
    { n: "Igor Gomes", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Reinier", p: "CAM", a: 23, v: 1.5, r: 68 },
    { n: "Dudu", p: "LW", a: 33, v: 1.4, r: 68 },
    { n: "Everson", p: "GK", a: 35, v: 0.7, r: 64 }
  ],
  "Atl\xE9tico San Luis": [
    { n: "Juan Manuel Sanabria", p: "LB", a: 25, v: 3.8, r: 73 },
    { n: "Eduardo \xC1guila", p: "CB", a: 23, v: 3, r: 72 },
    { n: "Andr\xE9s S\xE1nchez", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Benjam\xEDn Galdames", p: "RW", a: 24, v: 2.3, r: 70 },
    { n: "Ronaldo N\xE1jera", p: "LW", a: 22, v: 2.1, r: 70 },
    { n: "Johan Caicedo", p: "CDM", a: 21, v: 1.6, r: 68 },
    { n: "Anderson Duarte", p: "RW", a: 21, v: 1.5, r: 68 },
    { n: "Lucas Esteves", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Sebasti\xE1n P\xE9rez-Bouquet", p: "CAM", a: 22, v: 1.5, r: 68 },
    { n: "Aldo Cruz", p: "LB", a: 28, v: 0.8, r: 64 }
  ],
  "Atromitos": [],
  "Augsburg": [
    { n: "Chrislain Matsima", p: "CB", a: 23, v: 18, r: 82 },
    { n: "Noahkai Banks", p: "CB", a: 19, v: 18, r: 82 },
    { n: "Alexis Claude-Maurice", p: "CAM", a: 27, v: 12, r: 79 },
    { n: "Finn Dahmen", p: "GK", a: 27, v: 9.8, r: 78 },
    { n: "Mert K\xF6m\xFCr", p: "CAM", a: 20, v: 9.8, r: 78 },
    { n: "Juma Bah", p: "CB", a: 19, v: 8.3, r: 77 },
    { n: "Fabian Rieder", p: "CAM", a: 23, v: 6.8, r: 76 },
    { n: "Anton Kade", p: "CAM", a: 21, v: 6, r: 76 },
    { n: "Arijon Ibrahimovic", p: "CAM", a: 20, v: 4.5, r: 74 },
    { n: "Han-Noah Massengo", p: "CM", a: 24, v: 4.5, r: 74 },
    { n: "Isma\xEBl Gharbi", p: "LW", a: 21, v: 3.8, r: 73 },
    { n: "Young-woo Seol", p: "RB", a: 27, v: 3.8, r: 73 },
    { n: "Rodrigo Ribeiro", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Uchenna Ogundu", p: "ST", a: 19, v: 3, r: 72 },
    { n: "Michael Gregoritsch", p: "ST", a: 31, v: 2.9, r: 71 },
    { n: "Dimitrios Giannoulis", p: "LB", a: 30, v: 2.3, r: 70 },
    { n: "Marius Wolf", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Yannik Keitel", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Hennes Behrens", p: "LB", a: 20, v: 1.5, r: 68 },
    { n: "Nediljko Labrovic", p: "GK", a: 26, v: 1.5, r: 68 }
  ],
  "Austin FC": [
    { n: "Facundo Torres", p: "RW", a: 25, v: 8.3, r: 77 },
    { n: "Brandon Vazquez", p: "ST", a: 27, v: 4.5, r: 74 },
    { n: "Myrto Uzuni", p: "LW", a: 30, v: 3.8, r: 73 },
    { n: "Owen Wolff", p: "CM", a: 21, v: 3, r: 72 },
    { n: "Daniel Pereira", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Jayden Nelson", p: "LW", a: 23, v: 2.1, r: 70 },
    { n: "Guilherme Biro", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Jon Gallagher", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Joseph Rosales", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Mikkel Desler", p: "RB", a: 30, v: 1.5, r: 68 }
  ],
  "Austria Lustenau": [],
  "Austria Wien": [
    { n: "Philipp Maybach", p: "CDM", a: 18, v: 2, r: 70 },
    { n: "Tae-seok Lee", p: "LB", a: 23, v: 1.5, r: 68 },
    { n: "Marijan \xD6sterreicher", p: "RM", a: 19, v: 0.8, r: 64 }
  ],
  "Auxerre": [
    { n: "Rudy Matondo", p: "CM", a: 17, v: 12, r: 79 },
    { n: "K\xE9vin Danois", p: "CM", a: 21, v: 9.8, r: 78 },
    { n: "Cl\xE9ment Akpa", p: "CB", a: 24, v: 7.5, r: 77 },
    { n: "Lassine Sinayoko", p: "ST", a: 26, v: 6.8, r: 76 },
    { n: "Arthur Piedfort", p: "CDM", a: 20, v: 4.1, r: 73 },
    { n: "Danny Namaso", p: "LW", a: 25, v: 3.8, r: 73 },
    { n: "Romain Faivre", p: "CAM", a: 27, v: 3.8, r: 73 },
    { n: "Sinaly Diomand\xE9", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "Josu\xE9 Casimir", p: "RW", a: 24, v: 3, r: 72 },
    { n: "Naouirou Ahamada", p: "CM", a: 23, v: 3, r: 72 },
    { n: "S\xE9kou Mara", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Lamine Sy", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Marvin Senaya", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "R\xE9my Labeau Lascary", p: "ST", a: 22, v: 2.3, r: 70 }
  ],
  "Avellino": [
    { n: "Giacomo Faticanti", p: "CDM", a: 21, v: 3.6, r: 73 },
    { n: "Filippo Missori", p: "RB", a: 21, v: 1.5, r: 68 }
  ],
  "Bahia": [
    { n: "Jean Lucas", p: "CM", a: 27, v: 9.8, r: 78 },
    { n: "Santiago Ramos Mingo", p: "CB", a: 24, v: 9.8, r: 78 },
    { n: "Erick Pulga", p: "LW", a: 25, v: 9, r: 78 },
    { n: "Luciano Juba", p: "LB", a: 26, v: 9, r: 78 },
    { n: "Ruan Pablo", p: "LW", a: 17, v: 6.8, r: 76 },
    { n: "Rodrigo Nestor", p: "CM", a: 25, v: 6, r: 76 },
    { n: "Caio Alexandre", p: "CDM", a: 26, v: 5.7, r: 75 },
    { n: "Nicol\xE1s Acevedo", p: "CDM", a: 26, v: 4.9, r: 74 },
    { n: "Cristian Olivera", p: "RW", a: 23, v: 3.8, r: 73 },
    { n: "Alejo Veliz", p: "ST", a: 22, v: 3, r: 72 },
    { n: "Cauly", p: "CAM", a: 30, v: 3, r: 72 },
    { n: "Dell", p: "ST", a: 17, v: 3, r: 72 },
    { n: "Gabriel Xavier", p: "CB", a: 24, v: 3, r: 72 },
    { n: "Iago", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Gilberto", p: "RB", a: 32, v: 2.3, r: 70 },
    { n: "Kau\xEA Furquim", p: "RW", a: 16, v: 2.3, r: 70 },
    { n: "Michel Ara\xFAjo", p: "RW", a: 29, v: 2.3, r: 70 },
    { n: "Ademir", p: "RW", a: 30, v: 1.5, r: 68 },
    { n: "Jo\xE3o Paulo", p: "GK", a: 30, v: 1.5, r: 68 },
    { n: "Rom\xE1n G\xF3mez", p: "RB", a: 21, v: 1.5, r: 68 },
    { n: "Santiago Arias", p: "RB", a: 33, v: 1.4, r: 68 },
    { n: "Willian Jos\xE9", p: "ST", a: 34, v: 1, r: 65 }
  ],
  "Barcelona": [
    { n: "Lamine Yamal", p: "RW", a: 18, v: 162, r: 94 },
    { n: "Pedri", p: "CM", a: 23, v: 121.5, r: 92 },
    { n: "Ferm\xEDn L\xF3pez", p: "CAM", a: 22, v: 81, r: 90 },
    { n: "Rodri", p: "CDM", a: 29, v: 67.5, r: 89 },
    { n: "Pau Cubars\xED", p: "CB", a: 18, v: 64.5, r: 89 },
    { n: "Raphinha", p: "LW", a: 29, v: 64.5, r: 89 },
    { n: "Jules Kound\xE9", p: "RB", a: 27, v: 52.5, r: 88 },
    { n: "Anthony Gordon", p: "LW", a: 24, v: 48.8, r: 87 },
    { n: "Dani Olmo", p: "CAM", a: 27, v: 48.8, r: 87 },
    { n: "Alejandro Balde", p: "LB", a: 22, v: 44.3, r: 87 },
    { n: "Karim Adeyemi", p: "RW", a: 23, v: 40.5, r: 86 },
    { n: "Frenkie de Jong", p: "CM", a: 28, v: 36.8, r: 86 },
    { n: "Joan Garc\xEDa", p: "GK", a: 24, v: 32.3, r: 85 },
    { n: "Eric Garc\xEDa", p: "CB", a: 24, v: 28.5, r: 84 },
    { n: "Gavi", p: "CM", a: 21, v: 24, r: 83 },
    { n: "Gerard Mart\xEDn", p: "LB", a: 23, v: 20.3, r: 82 },
    { n: "Gabriel Jesus", p: "ST", a: 28, v: 16.5, r: 81 },
    { n: "Roony Bardghji", p: "RW", a: 20, v: 12, r: 79 },
    { n: "Andreas Christensen", p: "CB", a: 29, v: 7.5, r: 77 },
    { n: "Jo\xE3o Cancelo", p: "RB", a: 31, v: 7.5, r: 77 },
    { n: "Xavi Espart", p: "RB", a: 18, v: 3.8, r: 73 },
    { n: "Dominik Livakovic", p: "GK", a: 30, v: 3, r: 72 },
    { n: "Juan Hern\xE1ndez", p: "CAM", a: 18, v: 1.5, r: 68 },
    { n: "Wojciech Szcz\u0119sny", p: "GK", a: 36, v: 0.7, r: 63 }
  ],
  "Basel": [
    { n: "B\xE9nie Traor\xE9", p: "LW", a: 23, v: 6.8, r: 76 },
    { n: "Metinho", p: "CM", a: 22, v: 4.5, r: 74 },
    { n: "Jeremy Agbonifo", p: "RW", a: 20, v: 3.8, r: 73 },
    { n: "Philip Otele", p: "LW", a: 26, v: 3.8, r: 73 },
    { n: "Koba Koindredi", p: "CM", a: 24, v: 3, r: 72 },
    { n: "Zan Celar", p: "ST", a: 26, v: 2.9, r: 71 },
    { n: "Dominik Schmid", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Keigo Tsunemoto", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "L\xE9o Leroy", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Andrej Bacanin", p: "CDM", a: 18, v: 2, r: 70 },
    { n: "Ibrahim Salah", p: "LW", a: 24, v: 1.5, r: 68 },
    { n: "Jonas Omlin", p: "GK", a: 31, v: 1.5, r: 68 },
    { n: "Xherdan Shaqiri", p: "CAM", a: 34, v: 1.4, r: 68 },
    { n: "Benjamin Kololli", p: "LM", a: 31, v: 0.8, r: 64 }
  ],
  "Bayer Leverkusen": [
    { n: "Jarell Quansah", p: "CB", a: 22, v: 36.8, r: 86 },
    { n: "Christian Kofane", p: "ST", a: 19, v: 32.3, r: 85 },
    { n: "Ibrahim Maza", p: "CAM", a: 20, v: 32.3, r: 85 },
    { n: "Edmond Tapsoba", p: "CB", a: 26, v: 28.5, r: 84 },
    { n: "Malik Tillman", p: "CAM", a: 23, v: 24, r: 83 },
    { n: "Moussa Diaby", p: "RW", a: 26, v: 22.5, r: 83 },
    { n: "Lo\xEFc Bad\xE9", p: "CB", a: 25, v: 20.3, r: 82 },
    { n: "Aleix Garc\xEDa", p: "CM", a: 28, v: 16.5, r: 81 },
    { n: "Eliesse Ben Seghir", p: "LW", a: 20, v: 16.5, r: 81 },
    { n: "Patrik Schick", p: "ST", a: 29, v: 16.5, r: 81 },
    { n: "Equi Fern\xE1ndez", p: "CDM", a: 23, v: 16.2, r: 81 },
    { n: "Kennet Eichhorn", p: "CDM", a: 16, v: 16.2, r: 81 },
    { n: "Facundo Medina", p: "CB", a: 26, v: 14.3, r: 80 },
    { n: "Gu\xE9la Dou\xE9", p: "RB", a: 23, v: 14.3, r: 80 },
    { n: "Miguel Guti\xE9rrez", p: "LB", a: 24, v: 13.5, r: 80 },
    { n: "Nathan Tella", p: "RW", a: 26, v: 12, r: 79 },
    { n: "Martin Terrier", p: "LW", a: 28, v: 9.8, r: 78 },
    { n: "Afonso Moreira", p: "LW", a: 20, v: 8.3, r: 77 },
    { n: "Mark Flekken", p: "GK", a: 32, v: 6.8, r: 76 },
    { n: "Montrell Culbreath", p: "RW", a: 18, v: 3.8, r: 73 },
    { n: "Victor Boniface", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Tim Oermann", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Lucas V\xE1zquez", p: "RB", a: 34, v: 2.3, r: 70 },
    { n: "Jonas Hofmann", p: "CAM", a: 33, v: 1.5, r: 68 }
  ],
  "Bayern Munich": [
    { n: "Michael Olise", p: "RW", a: 24, v: 113.3, r: 92 },
    { n: "Jamal Musiala", p: "CAM", a: 22, v: 97.5, r: 91 },
    { n: "Aleksandar Pavlovic", p: "CDM", a: 21, v: 72.9, r: 90 },
    { n: "Dayot Upamecano", p: "CB", a: 27, v: 57, r: 88 },
    { n: "Luis D\xEDaz", p: "LW", a: 28, v: 57, r: 88 },
    { n: "Harry Kane", p: "ST", a: 32, v: 52.5, r: 88 },
    { n: "Lennart Karl", p: "CAM", a: 17, v: 48.8, r: 87 },
    { n: "Alphonso Davies", p: "LB", a: 25, v: 36.8, r: 86 },
    { n: "Joshua Kimmich", p: "CDM", a: 31, v: 32.3, r: 85 },
    { n: "Tom Bischof", p: "CM", a: 20, v: 32.3, r: 85 },
    { n: "Josip Stanisic", p: "RB", a: 25, v: 28.5, r: 84 },
    { n: "Nathaniel Brown", p: "LB", a: 22, v: 28.5, r: 84 },
    { n: "Ismael Saibari", p: "CAM", a: 24, v: 26.3, r: 84 },
    { n: "Konrad Laimer", p: "RB", a: 28, v: 26.3, r: 84 },
    { n: "Jonathan Tah", p: "CB", a: 29, v: 24, r: 83 },
    { n: "Min-jae Kim", p: "CB", a: 29, v: 20.3, r: 82 },
    { n: "Serge Gnabry", p: "CF", a: 30, v: 14.6, r: 81 },
    { n: "Hiroki Ito", p: "CB", a: 26, v: 14.3, r: 80 },
    { n: "Jonas Urbig", p: "GK", a: 22, v: 12, r: 79 },
    { n: "Sacha Boey", p: "RB", a: 25, v: 12, r: 79 },
    { n: "Rapha\xEBl Guerreiro", p: "CAM", a: 32, v: 4.5, r: 74 },
    { n: "Manuel Neuer", p: "GK", a: 39, v: 3, r: 72 }
  ],
  "Ba\u015Fak\u015Fehir": [
    { n: "Andreas Skov Olsen", p: "RW", a: 26, v: 10.7, r: 79 },
    { n: "Krzysztof Piatek", p: "ST", a: 30, v: 6.4, r: 76 },
    { n: "Abbosbek Fayzullaev", p: "RW", a: 22, v: 6, r: 76 },
    { n: "Eldor Shomurodov", p: "ST", a: 30, v: 6, r: 76 },
    { n: "Amine Harit", p: "LW", a: 28, v: 3.8, r: 73 },
    { n: "Jerome Opoku", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Bertu\u011F Y\u0131ld\u0131r\u0131m", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Christopher Operi", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Festy Ebosele", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Yusuf Sar\u0131", p: "RW", a: 27, v: 2.9, r: 71 },
    { n: "Muhammed \u015Eengezer", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Jakub Kaluzinski", p: "CDM", a: 23, v: 2, r: 70 },
    { n: "Do\u011Fan Alemdar", p: "GK", a: 23, v: 1.5, r: 68 },
    { n: "Edin Visca", p: "RW", a: 35, v: 1.4, r: 68 }
  ],
  "Benevento": [
    { n: "Luigi Cherubini", p: "LW", a: 21, v: 1.5, r: 68 },
    { n: "Pier Luigi Simonetti", p: "LM", a: 22, v: 0.8, r: 64 }
  ],
  "Benfica": [
    { n: "Vangelis Pavlidis", p: "ST", a: 27, v: 26.3, r: 84 },
    { n: "Georgiy Sudakov", p: "CAM", a: 23, v: 22.5, r: 83 },
    { n: "Tom\xE1s Ara\xFAjo", p: "CB", a: 23, v: 22.5, r: 83 },
    { n: "Anatoliy Trubin", p: "GK", a: 24, v: 20.3, r: 82 },
    { n: "Andreas Schjelderup", p: "LW", a: 21, v: 16.5, r: 81 },
    { n: "Dodi Luk\xE9bakio", p: "RW", a: 28, v: 16.5, r: 81 },
    { n: "Fredrik Aursnes", p: "CM", a: 30, v: 13.5, r: 80 },
    { n: "Jo\xE3o Palhinha", p: "CDM", a: 31, v: 12.2, r: 80 },
    { n: "Claudio Echeverri", p: "CAM", a: 19, v: 12, r: 79 },
    { n: "Leandro Barreiro", p: "CM", a: 25, v: 12, r: 79 },
    { n: "Souffian El Karouani", p: "LB", a: 25, v: 12, r: 79 },
    { n: "Jakub Kaminski", p: "LW", a: 23, v: 9.8, r: 78 },
    { n: "Samuel Dahl", p: "LB", a: 22, v: 9.8, r: 78 },
    { n: "Enzo Barrenechea", p: "CDM", a: 24, v: 9.7, r: 78 },
    { n: "Gianluca Prestianni", p: "RW", a: 19, v: 9.3, r: 78 },
    { n: "Alessandro Circati", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Rafa Silva", p: "CF", a: 32, v: 7.8, r: 77 },
    { n: "Alexander Bah", p: "RB", a: 28, v: 7.5, r: 77 },
    { n: "Manu Silva", p: "CDM", a: 24, v: 5.7, r: 75 },
    { n: "An\xEDsio Cabral", p: "ST", a: 17, v: 3.8, r: 73 },
    { n: "Bruma", p: "LW", a: 31, v: 3.8, r: 73 },
    { n: "Daniel Banjaqui", p: "RB", a: 17, v: 3.8, r: 73 },
    { n: "Sidny Lopes Cabral", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "Samuel Soares", p: "GK", a: 23, v: 3, r: 72 },
    { n: "Jo\xE3o Rego", p: "CAM", a: 20, v: 2.3, r: 70 },
    { n: "Jos\xE9 Neto", p: "LB", a: 17, v: 2.3, r: 70 }
  ],
  "Beveren": [
    { n: "Beau Reus", p: "GK", a: 24, v: 0.8, r: 64 }
  ],
  "Be\u015Fikta\u015F": [
    { n: "Du\u0161an Vlahovi\u0107", p: "ST", a: 25, v: 28.5, r: 84 },
    { n: "Ernest Poku", p: "RW", a: 21, v: 20.3, r: 82 },
    { n: "Orkun K\xF6k\xE7\xFC", p: "CM", a: 25, v: 20.3, r: 82 },
    { n: "Leandro Trossard", p: "LW", a: 31, v: 16.5, r: 81 },
    { n: "Gedson Fernandes", p: "CM", a: 26, v: 15.7, r: 81 },
    { n: "Emmanuel Agbadou", p: "CB", a: 28, v: 14.3, r: 80 },
    { n: "Fabio Miretti", p: "CM", a: 22, v: 12.8, r: 80 },
    { n: "Alexander N\xFCbel", p: "GK", a: 29, v: 9.8, r: 78 },
    { n: "Kassoum Ouattara", p: "LB", a: 21, v: 9.8, r: 78 },
    { n: "Wilfred Ndidi", p: "CDM", a: 29, v: 8.3, r: 77 },
    { n: "Amir Murillo", p: "RB", a: 29, v: 6.8, r: 76 },
    { n: "Vaclav Cerny", p: "RW", a: 28, v: 6.8, r: 76 },
    { n: "Tiago Djal\xF3", p: "CB", a: 25, v: 6, r: 76 },
    { n: "Emirhan Top\xE7u", p: "CB", a: 25, v: 4.5, r: 74 },
    { n: "Mustafa Hekimo\u011Flu", p: "ST", a: 18, v: 3.8, r: 73 },
    { n: "Taylan Bulut", p: "RB", a: 19, v: 3.8, r: 73 },
    { n: "Milot Rashica", p: "RW", a: 29, v: 3, r: 72 },
    { n: "R\u0131dvan Y\u0131lmaz", p: "LB", a: 24, v: 3, r: 72 },
    { n: "Bakhtiyor Zaynutdinov", p: "LB", a: 27, v: 2.9, r: 71 },
    { n: "Salih \xD6zcan", p: "CDM", a: 27, v: 2.8, r: 71 },
    { n: "Ersin Destano\u011Flu", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "Kartal Y\u0131lmaz", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Devis V\xE1squez", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "G\xF6khan Sazda\u011F\u0131", p: "RB", a: 31, v: 1.5, r: 68 }
  ],
  "Birmingham City": [
    { n: "Jay Stansfield", p: "ST", a: 23, v: 14.3, r: 80 },
    { n: "August Priske", p: "ST", a: 21, v: 6, r: 76 },
    { n: "Carlos Vicente", p: "RW", a: 26, v: 6, r: 76 },
    { n: "Christoph Klarer", p: "CB", a: 25, v: 6, r: 76 },
    { n: "Marvin Ducksch", p: "ST", a: 31, v: 5.7, r: 75 },
    { n: "Bright Osayi-Samuel", p: "RB", a: 28, v: 4.5, r: 74 },
    { n: "James Beadle", p: "GK", a: 21, v: 3.8, r: 73 },
    { n: "Kyogo Furuhashi", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Patrick Roberts", p: "RW", a: 28, v: 3.8, r: 73 },
    { n: "Demarai Gray", p: "LW", a: 29, v: 3, r: 72 },
    { n: "Willum Th\xF3r Willumsson", p: "CAM", a: 27, v: 3, r: 72 },
    { n: "Alex Cochrane", p: "LB", a: 25, v: 2.3, r: 70 },
    { n: "Ethan Laird", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "Kai Wagner", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Kanya Fujimoto", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Liam Millar", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Taylor Gardner-Hickman", p: "CDM", a: 24, v: 1.6, r: 68 },
    { n: "Alfons Sampsted", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Lee Buchanan", p: "LB", a: 24, v: 1.5, r: 68 }
  ],
  "Blackburn Rovers": [
    { n: "Mathias J\xF8rgensen", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Oladapo Afolayan", p: "RW", a: 28, v: 2.9, r: 71 },
    { n: "Todd Cantwell", p: "CAM", a: 27, v: 2.3, r: 70 },
    { n: "Harry Pickering", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Ryoya Morishita", p: "CAM", a: 28, v: 1.5, r: 68 },
    { n: "Aynsley Pears", p: "GK", a: 27, v: 0.8, r: 64 },
    { n: "Augustus Kargbo", p: "CF", a: 26, v: 0.7, r: 64 }
  ],
  "Bochum": [
    { n: "Leandro Morgalla", p: "RB", a: 21, v: 3, r: 72 },
    { n: "Mats Pannewig", p: "CM", a: 21, v: 2.3, r: 70 },
    { n: "Oliver Olsen", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Koji Miyoshi", p: "RM", a: 28, v: 0.8, r: 64 }
  ],
  "Bologna": [
    { n: "Arthur Theate", p: "CB", a: 25, v: 16.5, r: 81 },
    { n: "Lewis Ferguson", p: "CM", a: 26, v: 14.3, r: 80 },
    { n: "Riccardo Orsolini", p: "RW", a: 28, v: 14.3, r: 80 },
    { n: "Nicol\xF2 Cambiaghi", p: "LW", a: 25, v: 12.8, r: 80 },
    { n: "Roberto Piccoli", p: "ST", a: 24, v: 12.8, r: 80 },
    { n: "Artem Dovbyk", p: "ST", a: 28, v: 12, r: 79 },
    { n: "Jens Odgaard", p: "CAM", a: 26, v: 12, r: 79 },
    { n: "Juan Miranda", p: "LB", a: 25, v: 12, r: 79 },
    { n: "Torbj\xF8rn Heggem", p: "CB", a: 26, v: 11.3, r: 79 },
    { n: "Emil Holm", p: "RB", a: 25, v: 10.5, r: 79 },
    { n: "Benja Dom\xEDnguez", p: "LW", a: 22, v: 8.3, r: 77 },
    { n: "Martin Vit\xEDk", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Samuel Mbangula", p: "LW", a: 21, v: 8.3, r: 77 },
    { n: "Tommaso Pobega", p: "CM", a: 26, v: 7.5, r: 77 },
    { n: "Eivind Helland", p: "CB", a: 20, v: 6, r: 76 },
    { n: "Nadir Zortea", p: "RB", a: 26, v: 6, r: 76 },
    { n: "Nikola Moro", p: "CDM", a: 27, v: 5.7, r: 75 },
    { n: "Nicol\xF2 Casale", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Federico Bernardeschi", p: "RW", a: 31, v: 3, r: 72 },
    { n: "Remo Freuler", p: "CM", a: 33, v: 3, r: 72 },
    { n: "Lukasz Skorupski", p: "GK", a: 34, v: 2.3, r: 70 },
    { n: "Charalampos Lykogiannis", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "Rahim Alhassane", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Massimo Pessina", p: "GK", a: 18, v: 0.8, r: 64 }
  ],
  "Bolton Wanderers": [
    { n: "Rob Apter", p: "RW", a: 22, v: 1.5, r: 68 },
    { n: "Randell Williams", p: "LM", a: 27, v: 0.8, r: 64 },
    { n: "John McAtee", p: "CF", a: 26, v: 0.7, r: 64 }
  ],
  "Borussia Dortmund": [
    { n: "Nico Schlotterbeck", p: "CB", a: 26, v: 44.3, r: 87 },
    { n: "Felix Nmecha", p: "CM", a: 25, v: 40.5, r: 86 },
    { n: "Ethan Nwaneri", p: "CAM", a: 18, v: 32.3, r: 85 },
    { n: "Gregor Kobel", p: "GK", a: 28, v: 32.3, r: 85 },
    { n: "Maximilian Beier", p: "ST", a: 23, v: 32.3, r: 85 },
    { n: "Serhou Guirassy", p: "ST", a: 29, v: 32.3, r: 85 },
    { n: "Konstantinos Karetsas", p: "CAM", a: 18, v: 28.5, r: 84 },
    { n: "Jobe Bellingham", p: "CM", a: 20, v: 24, r: 83 },
    { n: "F\xE1bio Silva", p: "ST", a: 23, v: 22.5, r: 83 },
    { n: "Joey Veerman", p: "CM", a: 27, v: 21.8, r: 83 },
    { n: "Julian Ryerson", p: "RB", a: 28, v: 20.3, r: 82 },
    { n: "Daniel Svensson", p: "LB", a: 23, v: 18, r: 82 },
    { n: "Carney Chukwuemeka", p: "CM", a: 22, v: 16.5, r: 81 },
    { n: "Giannis Konstantelias", p: "CAM", a: 22, v: 16.5, r: 81 },
    { n: "Waldemar Anton", p: "CB", a: 29, v: 14.3, r: 80 },
    { n: "Joane Gadou", p: "CB", a: 18, v: 9.8, r: 78 },
    { n: "Kau\xE3 Prates", p: "LB", a: 17, v: 8.3, r: 77 },
    { n: "Marcel Sabitzer", p: "CM", a: 31, v: 6, r: 76 },
    { n: "Ramy Bensebaini", p: "CB", a: 30, v: 6, r: 76 },
    { n: "Emre Can", p: "CB", a: 31, v: 5.7, r: 75 },
    { n: "Luca Reggiani", p: "CB", a: 17, v: 3.8, r: 73 },
    { n: "Justin Lerma", p: "CAM", a: 17, v: 2.3, r: 70 }
  ],
  "Botafogo": [
    { n: "Danilo", p: "CM", a: 24, v: 19.5, r: 82 },
    { n: "\xC1lvaro Montoro", p: "LW", a: 18, v: 8.3, r: 77 },
    { n: "Arthur Cabral", p: "ST", a: 27, v: 6.8, r: 76 },
    { n: "Vitinho", p: "RB", a: 26, v: 6.8, r: 76 },
    { n: "Artur", p: "RW", a: 27, v: 6, r: 76 },
    { n: "David Ricardo", p: "CB", a: 23, v: 5.7, r: 75 },
    { n: "Matheus Martins", p: "LW", a: 22, v: 5.7, r: 75 },
    { n: "Santiago Rodr\xEDguez", p: "CAM", a: 25, v: 4.5, r: 74 },
    { n: "Alexander Barboza", p: "CB", a: 30, v: 3.8, r: 73 },
    { n: "Jeffinho", p: "LW", a: 26, v: 3.6, r: 73 },
    { n: "Alex Telles", p: "LB", a: 33, v: 2.3, r: 70 },
    { n: "J\xFAnior Santos", p: "RW", a: 31, v: 2.3, r: 70 },
    { n: "L\xE9o Linck", p: "GK", a: 24, v: 2.3, r: 70 },
    { n: "Lucas Villalba", p: "RW", a: 24, v: 1.5, r: 68 },
    { n: "Mateo Ponte", p: "RB", a: 22, v: 1.5, r: 68 },
    { n: "Carlos Alberto", p: "RW", a: 23, v: 1.4, r: 68 }
  ],
  "Boulogne": [
    { n: "Aur\xE9lien Platret", p: "RM", a: 22, v: 0.8, r: 64 }
  ],
  "Bournemouth": [
    { n: "Alex Scott", p: "CM", a: 22, v: 32.3, r: 85 },
    { n: "Junior Kroupi", p: "ST", a: 19, v: 32.3, r: 85 },
    { n: "Rayan", p: "RW", a: 19, v: 32.3, r: 85 },
    { n: "Evanilson", p: "ST", a: 26, v: 28.5, r: 84 },
    { n: "Bafod\xE9 Diakit\xE9", p: "CB", a: 24, v: 24, r: 83 },
    { n: "Justin Kluivert", p: "CAM", a: 26, v: 24, r: 83 },
    { n: "Ant\xF3nio Silva", p: "CB", a: 22, v: 22.5, r: 83 },
    { n: "Djordje Petrovic", p: "GK", a: 26, v: 22.5, r: 83 },
    { n: "Adrien Truffert", p: "LB", a: 24, v: 20.3, r: 82 },
    { n: "Tyler Adams", p: "CDM", a: 26, v: 20.3, r: 82 },
    { n: "Marcus Tavernier", p: "CAM", a: 26, v: 18.8, r: 82 },
    { n: "Amine Adli", p: "LW", a: 25, v: 16.5, r: 81 },
    { n: "Veljko Milosavljevic", p: "CB", a: 18, v: 16.5, r: 81 },
    { n: "Ben Gannon-Doak", p: "RW", a: 20, v: 12.8, r: 80 },
    { n: "James Hill", p: "CB", a: 23, v: 12, r: 79 },
    { n: "Juanlu S\xE1nchez", p: "RB", a: 22, v: 12, r: 79 },
    { n: "David Brooks", p: "RW", a: 28, v: 11.3, r: 79 },
    { n: "Michele Di Gregorio", p: "GK", a: 28, v: 11.3, r: 79 },
    { n: "Lewis Cook", p: "CM", a: 28, v: 10.5, r: 79 },
    { n: "Alex T\xF3th", p: "CM", a: 20, v: 9.8, r: 78 },
    { n: "Juli\xE1n Araujo", p: "RB", a: 24, v: 8.3, r: 77 },
    { n: "Ryan Christie", p: "CM", a: 30, v: 7.5, r: 77 },
    { n: "Julio Soler", p: "LB", a: 20, v: 6.8, r: 76 },
    { n: "Daniel Jebbison", p: "ST", a: 22, v: 4.5, r: 74 },
    { n: "\xC1lvaro Rodr\xEDguez", p: "ST", a: 21, v: 3.8, r: 73 },
    { n: "Max Aarons", p: "RB", a: 25, v: 3, r: 72 },
    { n: "Zain Silcott-Duberry", p: "LM", a: 20, v: 0.7, r: 64 }
  ],
  "Braga": [
    { n: "Rodrigo Zalazar", p: "CAM", a: 26, v: 18, r: 82 },
    { n: "Pau V\xEDctor", p: "ST", a: 24, v: 9.8, r: 78 },
    { n: "Mario Dorgeles", p: "RM", a: 21, v: 8.3, r: 77 },
    { n: "Ricardo Horta", p: "LW", a: 31, v: 8.3, r: 77 },
    { n: "Sikou Niakat\xE9", p: "CB", a: 26, v: 6.8, r: 76 },
    { n: "Demir Ege T\u0131knaz", p: "CDM", a: 21, v: 6.5, r: 76 },
    { n: "Bright Arrey-Mbi", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Gorby", p: "CM", a: 23, v: 6, r: 76 },
    { n: "Jovan Milosevic", p: "ST", a: 20, v: 6, r: 76 },
    { n: "Leonardo Lelo", p: "LB", a: 25, v: 6, r: 76 },
    { n: "V\xEDctor G\xF3mez", p: "RB", a: 25, v: 6, r: 76 },
    { n: "Diogo Rodrigues", p: "CM", a: 20, v: 3.8, r: 73 },
    { n: "Gabri Mart\xEDnez", p: "LW", a: 22, v: 3.8, r: 73 },
    { n: "Gustaf Lagerbielke", p: "CB", a: 25, v: 3.8, r: 73 },
    { n: "Jonas Wind", p: "ST", a: 26, v: 3.8, r: 73 },
    { n: "Adrian Leon Barisic", p: "CB", a: 24, v: 3.6, r: 73 },
    { n: "Diego Rodrigues", p: "CM", a: 20, v: 3.6, r: 73 },
    { n: "Amine El Ouazzani", p: "ST", a: 24, v: 3, r: 72 },
    { n: "Fran Navarro", p: "ST", a: 27, v: 3, r: 72 },
    { n: "Tommy Marqu\xE9s", p: "CDM", a: 19, v: 2.4, r: 71 },
    { n: "Denis Huseinbasic", p: "CM", a: 24, v: 2.3, r: 70 }
  ],
  "Braunschweig": [
    { n: "Jovan Mijatovic", p: "ST", a: 20, v: 2.1, r: 70 },
    { n: "Ron-Thorben Hoffmann", p: "GK", a: 26, v: 0.8, r: 64 }
  ],
  "Brentford": [
    { n: "Igor Thiago", p: "ST", a: 24, v: 40.5, r: 86 },
    { n: "Dango Ouattara", p: "RW", a: 23, v: 28.5, r: 84 },
    { n: "Kevin Schade", p: "LW", a: 24, v: 28.5, r: 84 },
    { n: "Michael Kayode", p: "RB", a: 21, v: 28.5, r: 84 },
    { n: "Sepp van den Berg", p: "CB", a: 24, v: 26.3, r: 84 },
    { n: "Mamadou Sangar\xE9", p: "CM", a: 23, v: 24, r: 83 },
    { n: "Mikkel Damsgaard", p: "CAM", a: 25, v: 24, r: 83 },
    { n: "Nathan Collins", p: "CB", a: 24, v: 24, r: 83 },
    { n: "Yegor Yarmolyuk", p: "CM", a: 21, v: 24, r: 83 },
    { n: "El Hadji Malick Diouf", p: "LB", a: 21, v: 22.5, r: 83 },
    { n: "Caoimh\xEDn Kelleher", p: "GK", a: 27, v: 20.3, r: 82 },
    { n: "Keane Lewis-Potter", p: "LM", a: 24, v: 20.3, r: 82 },
    { n: "Antoni Milambo", p: "CAM", a: 20, v: 16.5, r: 81 },
    { n: "Jaidon Anthony", p: "LW", a: 26, v: 14.3, r: 80 },
    { n: "Kristoffer Ajer", p: "CB", a: 27, v: 14.3, r: 80 },
    { n: "Vitaly Janelt", p: "CDM", a: 27, v: 13, r: 80 },
    { n: "Aaron Hickey", p: "RB", a: 23, v: 12.8, r: 80 },
    { n: "Rico Henry", p: "LB", a: 28, v: 12, r: 79 },
    { n: "Mathias Jensen", p: "CM", a: 30, v: 9.8, r: 78 },
    { n: "F\xE1bio Carvalho", p: "CAM", a: 23, v: 8.3, r: 77 },
    { n: "Kaye Furo", p: "ST", a: 18, v: 6.8, r: 76 },
    { n: "Josh Dasilva", p: "CM", a: 27, v: 5.7, r: 75 },
    { n: "Callum Wilson", p: "ST", a: 33, v: 3.8, r: 73 },
    { n: "H\xE1kon Valdimarsson", p: "GK", a: 24, v: 2.3, r: 70 }
  ],
  "Brest": [
    { n: "Kamory Doumbia", p: "CAM", a: 22, v: 7.5, r: 77 },
    { n: "Bradley Locko", p: "LB", a: 23, v: 6, r: 76 },
    { n: "Joris Chotard", p: "CDM", a: 24, v: 5.7, r: 75 },
    { n: "Hugo Magnetti", p: "CM", a: 27, v: 4.5, r: 74 },
    { n: "Junior Diaz", p: "CB", a: 22, v: 4.5, r: 74 },
    { n: "Brendan Chardonnet", p: "CB", a: 31, v: 3.8, r: 73 },
    { n: "Noah Edjouma", p: "RW", a: 20, v: 3.8, r: 73 },
    { n: "Ludovic Ajorque", p: "ST", a: 31, v: 3, r: 72 },
    { n: "Mama Bald\xE9", p: "ST", a: 30, v: 3, r: 72 },
    { n: "Daouda Guindo", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Path\xE9 Mboup", p: "LW", a: 22, v: 2.3, r: 70 },
    { n: "Radoslaw Majecki", p: "GK", a: 26, v: 2.3, r: 70 },
    { n: "Kenny Lala", p: "RB", a: 34, v: 1.5, r: 68 },
    { n: "Luck Zogb\xE9", p: "RB", a: 20, v: 1.5, r: 68 }
  ],
  "Brighton": [
    { n: "Luka Vuskovic", p: "CB", a: 18, v: 48.8, r: 87 },
    { n: "Bart Verbruggen", p: "GK", a: 23, v: 32.3, r: 85 },
    { n: "Yankuba Minteh", p: "RW", a: 21, v: 32.3, r: 85 },
    { n: "Ferdi Kad\u0131o\u011Flu", p: "LB", a: 26, v: 24, r: 83 },
    { n: "Georginio Rutter", p: "ST", a: 23, v: 24, r: 83 },
    { n: "Yasin Ayari", p: "CM", a: 22, v: 24, r: 83 },
    { n: "Jack Hinshelwood", p: "CDM", a: 20, v: 22.7, r: 83 },
    { n: "Charalampos Kostoulas", p: "ST", a: 18, v: 20.3, r: 82 },
    { n: "Diego G\xF3mez", p: "CM", a: 22, v: 20.3, r: 82 },
    { n: "Evan Ferguson", p: "ST", a: 21, v: 20.3, r: 82 },
    { n: "Kaoru Mitoma", p: "LW", a: 28, v: 20.3, r: 82 },
    { n: "Mats Wieffer", p: "RB", a: 26, v: 20.3, r: 82 },
    { n: "Maxim De Cuyper", p: "LB", a: 25, v: 18, r: 82 },
    { n: "Pascal Struijk", p: "CB", a: 26, v: 18, r: 82 },
    { n: "Matt O'Riley", p: "CM", a: 25, v: 16.5, r: 81 },
    { n: "Stefanos Tzimas", p: "ST", a: 19, v: 16.5, r: 81 },
    { n: "Chema Andr\xE9s", p: "CDM", a: 20, v: 16.2, r: 81 },
    { n: "Promise David", p: "ST", a: 24, v: 13.5, r: 80 },
    { n: "Olivier Boscagli", p: "CB", a: 28, v: 12, r: 79 },
    { n: "Ibrahim Osman", p: "LW", a: 21, v: 6.8, r: 76 },
    { n: "Jaouen Hadjam", p: "LB", a: 22, v: 6.8, r: 76 },
    { n: "Lewis Dunk", p: "CB", a: 34, v: 6.4, r: 76 },
    { n: "Costinha", p: "RB", a: 25, v: 4.5, r: 74 },
    { n: "Adam Webster", p: "CB", a: 30, v: 3.8, r: 73 },
    { n: "Femi Azeez", p: "RM", a: 24, v: 3.8, r: 73 },
    { n: "Pascal Gro\xDF", p: "CM", a: 34, v: 3, r: 72 },
    { n: "Solly March", p: "RW", a: 31, v: 1.5, r: 68 },
    { n: "Jason Steele", p: "GK", a: 35, v: 1.4, r: 68 }
  ],
  "Bristol City": [
    { n: "Scott Twine", p: "CAM", a: 26, v: 9.8, r: 78 },
    { n: "Jason Knight", p: "CM", a: 24, v: 6, r: 76 },
    { n: "Emil Riis", p: "ST", a: 27, v: 4.5, r: 74 },
    { n: "Tomi Horvat", p: "RM", a: 26, v: 3.8, r: 73 },
    { n: "Adam Randell", p: "CDM", a: 25, v: 2.4, r: 71 },
    { n: "George Tanner", p: "RB", a: 26, v: 2.3, r: 70 },
    { n: "Max Bird", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Max O'Leary", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Neto Borges", p: "LB", a: 29, v: 2.3, r: 70 },
    { n: "Ross McCrorie", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Brian De Keersmaecker", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Cameron Pring", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "George Earthy", p: "CAM", a: 21, v: 1.5, r: 68 },
    { n: "Mark Sykes", p: "RM", a: 28, v: 1.5, r: 68 },
    { n: "Haydon Roberts", p: "LB", a: 23, v: 0.8, r: 64 }
  ],
  "Br\xF8ndby IF": [
    { n: "Benjamin Tahirovi\u0107", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Nicolai Vallys", p: "LW", a: 29, v: 3.8, r: 73 },
    { n: "Mats K\xF6hlert", p: "LB", a: 27, v: 3, r: 72 },
    { n: "Bartosz Slisz", p: "CDM", a: 26, v: 2.8, r: 71 },
    { n: "Marko Divkovi\u0107", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Patrick Pentz", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Sean Klaiber", p: "RB", a: 31, v: 1.5, r: 68 },
    { n: "Oliver Villadsen", p: "RB", a: 24, v: 1.4, r: 68 }
  ],
  "Burgos": [
    { n: "Curro S\xE1nchez", p: "RW", a: 29, v: 1.5, r: 68 }
  ],
  "Burnley": [
    { n: "Hannibal", p: "CAM", a: 22, v: 12.8, r: 80 },
    { n: "Bashir Humphreys", p: "CB", a: 22, v: 12, r: 79 },
    { n: "Anel Ahmedhodzic", p: "CB", a: 26, v: 9.8, r: 78 },
    { n: "Igor Julio", p: "CB", a: 27, v: 9.8, r: 78 },
    { n: "Reo Hatate", p: "CM", a: 28, v: 8.3, r: 77 },
    { n: "Zeki Amdouni", p: "ST", a: 25, v: 7.5, r: 77 },
    { n: "Aaron Ramsey", p: "CAM", a: 22, v: 6.8, r: 76 },
    { n: "Armando Broja", p: "ST", a: 24, v: 6.8, r: 76 },
    { n: "Largie Ramazani", p: "LW", a: 24, v: 6.8, r: 76 },
    { n: "Max Alleyne", p: "CB", a: 20, v: 6.8, r: 76 },
    { n: "Hjalmar Ekdal", p: "CB", a: 27, v: 4.5, r: 74 },
    { n: "Josh Cullen", p: "CM", a: 29, v: 4.5, r: 74 },
    { n: "Jordan Beyer", p: "CB", a: 25, v: 4.3, r: 74 },
    { n: "Ugo Raghouber", p: "CDM", a: 22, v: 4.1, r: 73 },
    { n: "Andr\xE9as Hountondji", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Axel Tuanzebe", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Jacob Bruun Larsen", p: "LW", a: 27, v: 3.8, r: 73 },
    { n: "Lucas Pires", p: "LB", a: 24, v: 3.8, r: 73 },
    { n: "Max Wei\xDF", p: "GK", a: 21, v: 3, r: 72 },
    { n: "Manuel Benson", p: "RW", a: 28, v: 2.9, r: 71 },
    { n: "Oliver Sonne", p: "RB", a: 25, v: 2.9, r: 71 },
    { n: "Connor Roberts", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Dastan Satpaev", p: "ST", a: 17, v: 2.3, r: 70 },
    { n: "Gr\xE9goire Coudert", p: "GK", a: 26, v: 2.3, r: 70 },
    { n: "Kyle Walker", p: "RB", a: 35, v: 2.3, r: 70 },
    { n: "Mike Tresor", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Shurandy Sambo", p: "RB", a: 24, v: 1.5, r: 68 }
  ],
  "CF Montr\xE9al": [
    { n: "Iv\xE1n Jaime", p: "CAM", a: 25, v: 3.8, r: 73 },
    { n: "Gennadiy Synchuk", p: "RW", a: 19, v: 2.3, r: 70 },
    { n: "Wikelman Carmona", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Bode Hidalgo", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Dagur Dan Th\xF3rhallsson", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Thomas Gillier", p: "GK", a: 21, v: 1.5, r: 68 },
    { n: "Alexis S\xE1nchez", p: "CF", a: 37, v: 1.4, r: 68 }
  ],
  "Cagliari": [
    { n: "Elia Caprile", p: "GK", a: 24, v: 12, r: 79 },
    { n: "Semih K\u0131l\u0131\xE7soy", p: "ST", a: 20, v: 10.5, r: 79 },
    { n: "Daniel Maldini", p: "CAM", a: 24, v: 8.3, r: 77 },
    { n: "Jacopo Fazzini", p: "CM", a: 22, v: 7.5, r: 77 },
    { n: "Alberto Dossena", p: "CB", a: 27, v: 6, r: 76 },
    { n: "Yukinari Sugawara", p: "RB", a: 25, v: 6, r: 76 },
    { n: "Adam Obert", p: "CB", a: 23, v: 5.3, r: 75 },
    { n: "Michel Adopo", p: "CM", a: 25, v: 4.5, r: 74 },
    { n: "Alieu Fadera", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Juan Rodr\xEDguez", p: "CB", a: 20, v: 3.8, r: 73 },
    { n: "Kevin Carlos", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "M'Bala Nzola", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Raphael Kofler", p: "CB", a: 20, v: 3.8, r: 73 },
    { n: "Florinel Coman", p: "LW", a: 27, v: 3.6, r: 73 },
    { n: "Joseph Liteta", p: "CM", a: 19, v: 3, r: 72 },
    { n: "Riyad Idrissi", p: "LB", a: 20, v: 3, r: 72 },
    { n: "Yanis Massolin", p: "CAM", a: 23, v: 3, r: 72 },
    { n: "Mattia Felici", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "Harry Winks", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "Yerry Mina", p: "CB", a: 31, v: 2, r: 70 },
    { n: "Jakub Jankto", p: "LM", a: 27, v: 0.8, r: 64 }
  ],
  "Cambuur": [],
  "Cardiff City": [
    { n: "Yousef Salech", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Perry Ng", p: "RB", a: 29, v: 2.1, r: 70 },
    { n: "Callum O'Dowda", p: "LM", a: 28, v: 1.5, r: 68 },
    { n: "Nathan Trott", p: "GK", a: 27, v: 1.5, r: 68 }
  ],
  "Carrarese": [
    { n: "Tommaso Rubino", p: "CAM", a: 19, v: 2.3, r: 70 },
    { n: "Jonas Rouhi", p: "LB", a: 21, v: 1.5, r: 68 }
  ],
  "Casa Pia": [
    { n: "Patrick Sequeira", p: "GK", a: 26, v: 3, r: 72 },
    { n: "Gaizka Larrazabal", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "J\xE9r\xE9my Livolant", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Tiago Morais", p: "LW", a: 22, v: 1.5, r: 68 },
    { n: "Kevin Prieto", p: "RM", a: 22, v: 0.8, r: 64 }
  ],
  "Castell\xF3n": [
    { n: "Mat\xEDas Orozco", p: "CDM", a: 18, v: 4.1, r: 73 },
    { n: "Romain Matthys", p: "GK", a: 27, v: 0.8, r: 64 }
  ],
  "Catanzaro": [
    { n: "Simone Pafundi", p: "CAM", a: 19, v: 3.8, r: 73 },
    { n: "Antonio Candela", p: "RB", a: 25, v: 1.4, r: 68 },
    { n: "Nicol\xF2 Buso", p: "CF", a: 25, v: 0.7, r: 64 }
  ],
  "Celta Vigo": [
    { n: "Javi Rodr\xEDguez", p: "CB", a: 22, v: 12, r: 79 },
    { n: "Miguel Rom\xE1n", p: "CM", a: 23, v: 12, r: 79 },
    { n: "Williot Swedberg", p: "LW", a: 21, v: 12, r: 79 },
    { n: "Ilaix Moriba", p: "CM", a: 22, v: 8.3, r: 77 },
    { n: "Hugo \xC1lvarez", p: "LW", a: 22, v: 6.8, r: 76 },
    { n: "Ionu\u021B Radu", p: "GK", a: 28, v: 6.8, r: 76 },
    { n: "Jones El-Abdellaoui", p: "RW", a: 19, v: 6.8, r: 76 },
    { n: "Sergio Carreira", p: "RB", a: 25, v: 6.8, r: 76 },
    { n: "Altay Bay\u0131nd\u0131r", p: "GK", a: 27, v: 6, r: 76 },
    { n: "Ferran Jutgl\xE0", p: "RW", a: 26, v: 6, r: 76 },
    { n: "\xC1lvaro N\xFA\xF1ez", p: "RB", a: 25, v: 4.5, r: 74 },
    { n: "Couhaib Driouech", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Aleix Febas", p: "CM", a: 29, v: 3.8, r: 73 },
    { n: "Carl Starfelt", p: "CB", a: 30, v: 3.8, r: 73 },
    { n: "Sebasti\xE1n C\xE1ceres", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Javi Rueda", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Pablo Dur\xE1n", p: "ST", a: 24, v: 3, r: 72 },
    { n: "Borja Iglesias", p: "ST", a: 33, v: 2.3, r: 70 },
    { n: "Javi Gal\xE1n", p: "LB", a: 31, v: 1.5, r: 68 },
    { n: "Marcos Alonso", p: "CB", a: 35, v: 1, r: 65 }
  ],
  "Celtic": [
    { n: "Benjamin Nygren", p: "RW", a: 24, v: 11.3, r: 79 },
    { n: "Cameron Carter-Vickers", p: "CB", a: 28, v: 8.3, r: 77 },
    { n: "Jota", p: "LW", a: 26, v: 7.1, r: 77 },
    { n: "Alistair Johnston", p: "RB", a: 27, v: 6.8, r: 76 },
    { n: "Kieran Tierney", p: "LB", a: 28, v: 6.8, r: 76 },
    { n: "Oliver S\xF8rensen", p: "CM", a: 23, v: 6, r: 76 },
    { n: "Auston Trusty", p: "CB", a: 27, v: 4.5, r: 74 },
    { n: "Hyun-jun Yang", p: "RW", a: 23, v: 3.8, r: 73 },
    { n: "Liam Scales", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Michel-Ange Balikwisha", p: "LW", a: 24, v: 3, r: 72 },
    { n: "Mika Baur", p: "CM", a: 21, v: 3, r: 72 },
    { n: "Paulo Bernardo", p: "CM", a: 23, v: 3, r: 72 },
    { n: "Luis Palma", p: "LW", a: 25, v: 2.9, r: 71 },
    { n: "Sam Johnstone", p: "GK", a: 32, v: 2.3, r: 70 },
    { n: "Callum McGregor", p: "CDM", a: 32, v: 1.6, r: 68 },
    { n: "Anthony Ralston", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Marcelo Saracchi", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Alex Oxlade-Chamberlain", p: "CM", a: 33, v: 0.8, r: 65 },
    { n: "Viljami Sinisalo", p: "GK", a: 24, v: 0.8, r: 64 }
  ],
  "Cercle Brugge": [
    { n: "Oumar Diakit\xE9", p: "ST", a: 22, v: 3.8, r: 73 },
    { n: "Dante Vanzeir", p: "ST", a: 27, v: 3.6, r: 73 },
    { n: "Steve Ngoura", p: "ST", a: 20, v: 2.3, r: 70 },
    { n: "Lazare Amani", p: "CM", a: 27, v: 2.1, r: 70 },
    { n: "Lucas Michal", p: "LW", a: 20, v: 2.1, r: 70 },
    { n: "Gary Magn\xE9e", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Maxime Delanghe", p: "GK", a: 24, v: 1.5, r: 68 },
    { n: "Erick Nunes", p: "RM", a: 21, v: 0.8, r: 64 },
    { n: "Ibrahim Diakit\xE9", p: "RB", a: 22, v: 0.8, r: 64 },
    { n: "Warleson", p: "GK", a: 29, v: 0.8, r: 64 }
  ],
  "Cesena": [
    { n: "Cristian Shpendi", p: "ST", a: 22, v: 4.5, r: 74 },
    { n: "Jonathan Klinsmann", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Maat Daniel Caprini", p: "LW", a: 19, v: 1.5, r: 68 },
    { n: "Gianluca Frabotta", p: "LB", a: 26, v: 0.8, r: 64 }
  ],
  "Ceuta": [],
  "Chapecoense": [],
  "Charleroi": [
    { n: "Parfait Guiagon", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Kevin Van Den Kerkhof", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Lewin Blum", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Martin Delavall\xE9e", p: "GK", a: 21, v: 1.5, r: 68 },
    { n: "Patrick Pfl\xFCcke", p: "RM", a: 29, v: 1.5, r: 68 },
    { n: "Mohamed Kon\xE9", p: "GK", a: 23, v: 0.7, r: 64 }
  ],
  "Charlotte FC": [
    { n: "Allan Saint-Maximin", p: "LW", a: 28, v: 8.3, r: 77 },
    { n: "Liel Abada", p: "RW", a: 24, v: 4.5, r: 74 },
    { n: "Pep Biel", p: "CAM", a: 29, v: 4.5, r: 74 },
    { n: "Idan Toklomati", p: "ST", a: 21, v: 3.8, r: 73 },
    { n: "Wilfried Zaha", p: "LW", a: 33, v: 3, r: 72 },
    { n: "Kerwin Vargas", p: "RW", a: 23, v: 2.3, r: 70 },
    { n: "Luca de la Torre", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Harry Toffolo", p: "LB", a: 30, v: 1.5, r: 68 },
    { n: "Kristijan Kahlina", p: "GK", a: 33, v: 1.5, r: 68 },
    { n: "David Schnegg", p: "LB", a: 27, v: 1.4, r: 68 }
  ],
  "Charlton Athletic": [
    { n: "Sonny Carey", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Karlan Grant", p: "ST", a: 28, v: 2.9, r: 71 },
    { n: "Harry Clarke", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "James Bree", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "Conor Coventry", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Harvey Knibbs", p: "CAM", a: 26, v: 1.5, r: 68 },
    { n: "Joe Rankin-Costello", p: "RB", a: 26, v: 1.4, r: 68 },
    { n: "Thomas Kaminski", p: "GK", a: 33, v: 0.8, r: 64 }
  ],
  "Chelsea": [
    { n: "Cole Palmer", p: "CAM", a: 23, v: 89.3, r: 91 },
    { n: "Mois\xE9s Caicedo", p: "CDM", a: 24, v: 81, r: 90 },
    { n: "Est\xEAv\xE3o", p: "RW", a: 18, v: 64.5, r: 89 },
    { n: "Morgan Rogers", p: "CAM", a: 23, v: 64.5, r: 89 },
    { n: "Jo\xE3o Pedro", p: "ST", a: 24, v: 60.8, r: 89 },
    { n: "Pedro Neto", p: "RW", a: 25, v: 48.8, r: 87 },
    { n: "Reece James", p: "RB", a: 26, v: 48.8, r: 87 },
    { n: "Levi Colwill", p: "CB", a: 22, v: 40.5, r: 86 },
    { n: "Geovany Quenda", p: "RW", a: 18, v: 33.8, r: 85 },
    { n: "Maxence Lacroix", p: "CB", a: 25, v: 32.3, r: 85 },
    { n: "Jamie Gittens", p: "LW", a: 21, v: 28.5, r: 84 },
    { n: "Jorrel Hato", p: "LB", a: 19, v: 28.5, r: 84 },
    { n: "Malo Gusto", p: "RB", a: 22, v: 28.5, r: 84 },
    { n: "Valent\xEDn Barco", p: "CM", a: 21, v: 28.5, r: 84 },
    { n: "Marco Palestra", p: "RB", a: 20, v: 24, r: 83 },
    { n: "Emmanuel Emegha", p: "ST", a: 22, v: 22.5, r: 83 },
    { n: "Wesley Fofana", p: "CB", a: 25, v: 22.5, r: 83 },
    { n: "Josh Acheampong", p: "RB", a: 19, v: 20.3, r: 82 },
    { n: "Rom\xE9o Lavia", p: "CDM", a: 21, v: 17.8, r: 82 },
    { n: "Emiliano Mart\xEDnez", p: "GK", a: 33, v: 12, r: 79 },
    { n: "Aar\xF3n Anselmino", p: "CB", a: 20, v: 9.8, r: 78 },
    { n: "Pep Chavarr\xEDa", p: "LB", a: 27, v: 8.3, r: 77 },
    { n: "Danny Welbeck", p: "ST", a: 35, v: 3, r: 72 },
    { n: "Jordan Henderson", p: "CM", a: 36, v: 1, r: 65 }
  ],
  "Chicago Fire": [
    { n: "Hugo Cuypers", p: "ST", a: 28, v: 7.5, r: 77 },
    { n: "Robert Lewandowski", p: "ST", a: 37, v: 6.8, r: 76 },
    { n: "Andreas Hanche-Olsen", p: "CB", a: 28, v: 4.3, r: 74 },
    { n: "Dj\xE9 D'Avilla", p: "CDM", a: 22, v: 3.2, r: 72 },
    { n: "Jonathan Bamba", p: "LW", a: 29, v: 3, r: 72 },
    { n: "Philip Zinckernagel", p: "RW", a: 31, v: 3, r: 72 },
    { n: "Chris Brady", p: "GK", a: 21, v: 2.3, r: 70 },
    { n: "Anzor Mekvabishvili", p: "CDM", a: 24, v: 2, r: 70 },
    { n: "Andr\xE9 Franco", p: "CAM", a: 27, v: 1.5, r: 68 },
    { n: "Maren Haile-Selassie", p: "RM", a: 26, v: 1.5, r: 68 },
    { n: "Viktor Radojevi\u0107", p: "LB", a: 21, v: 1.5, r: 68 },
    { n: "Omari Glasgow", p: "RM", a: 22, v: 0.7, r: 64 }
  ],
  "Clermont": [
    { n: "Florian Bianchini", p: "RW", a: 24, v: 1.4, r: 68 }
  ],
  "Club Brugge": [
    { n: "Joel Ord\xF3\xF1ez", p: "CB", a: 21, v: 27, r: 84 },
    { n: "Carlos Forbs", p: "RW", a: 21, v: 14.3, r: 80 },
    { n: "Joaquin Seys", p: "LB", a: 20, v: 13.5, r: 80 },
    { n: "Nicol\xF2 Tresoldi", p: "ST", a: 21, v: 10.5, r: 79 },
    { n: "Romeo Vermant", p: "ST", a: 21, v: 9, r: 78 },
    { n: "Freddie Potts", p: "CDM", a: 22, v: 8.1, r: 77 },
    { n: "Mamadou Diakhon", p: "LW", a: 20, v: 7.5, r: 77 },
    { n: "Kyriani Sabbe", p: "RB", a: 20, v: 6.8, r: 76 },
    { n: "Hans Vanaken", p: "CAM", a: 33, v: 4.5, r: 74 },
    { n: "Gustaf Nilsson", p: "ST", a: 28, v: 4.3, r: 74 },
    { n: "Wisdom Mike", p: "LW", a: 17, v: 3.6, r: 73 },
    { n: "Bjorn Meijer", p: "LB", a: 22, v: 3, r: 72 },
    { n: "Hugo Siquet", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Hugo Vetlesen", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Nordin Jackers", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Shion Homma", p: "LM", a: 23, v: 0.8, r: 64 }
  ],
  "Colorado Rapids": [
    { n: "Paxten Aaronson", p: "CAM", a: 22, v: 6, r: 76 },
    { n: "Rafael Navarro", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Ibrahim Sadiq", p: "RW", a: 25, v: 2.9, r: 71 },
    { n: "Hamzat Ojediran", p: "CDM", a: 22, v: 2.4, r: 71 },
    { n: "Josh Atencio", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Dante Sealy", p: "RW", a: 22, v: 1.5, r: 68 },
    { n: "Miguel Navarro", p: "LB", a: 26, v: 1.5, r: 68 },
    { n: "Reggie Cannon", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Zack Steffen", p: "GK", a: 30, v: 1.5, r: 68 },
    { n: "Theodore Ku-DiPietro", p: "CAM", a: 23, v: 1.4, r: 68 }
  ],
  "Columbus Crew": [
    { n: "Brais M\xE9ndez", p: "CAM", a: 28, v: 9.8, r: 78 },
    { n: "Wessam Abou Ali", p: "ST", a: 26, v: 4.5, r: 74 },
    { n: "Max Arfsten", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Andr\xE9 Gomes", p: "CM", a: 32, v: 3, r: 72 },
    { n: "D\xE1niel Gazdag", p: "CAM", a: 29, v: 3, r: 72 },
    { n: "Patrick Schulte", p: "GK", a: 24, v: 3, r: 72 },
    { n: "Hugo Picard", p: "LM", a: 22, v: 2.3, r: 70 },
    { n: "Mohamed Farsi", p: "RM", a: 26, v: 2.3, r: 70 },
    { n: "Andr\xE9s Herrera", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Steven Moreira", p: "RB", a: 31, v: 1.5, r: 68 },
    { n: "Eric Bailly", p: "CB", a: 32, v: 1, r: 65 }
  ],
  "Como": [
    { n: "Nico Paz", p: "CAM", a: 21, v: 52.5, r: 88 },
    { n: "Moise Kean", p: "ST", a: 25, v: 32.3, r: 85 },
    { n: "Trevoh Chalobah", p: "CB", a: 26, v: 32.3, r: 85 },
    { n: "M\xE1ximo Perrone", p: "CDM", a: 22, v: 28.4, r: 84 },
    { n: "Assane Diao", p: "LW", a: 20, v: 24, r: 83 },
    { n: "Jes\xFAs Rodr\xEDguez", p: "LW", a: 20, v: 24, r: 83 },
    { n: "Jacobo Ram\xF3n", p: "CB", a: 20, v: 20.3, r: 82 },
    { n: "Martin Baturina", p: "CAM", a: 22, v: 19.5, r: 82 },
    { n: "Robert S\xE1nchez", p: "GK", a: 28, v: 18, r: 82 },
    { n: "Samuele Ricci", p: "CDM", a: 24, v: 17.8, r: 82 },
    { n: "Jayden Addai", p: "RW", a: 20, v: 16.5, r: 81 },
    { n: "Lucas Da Cunha", p: "CM", a: 24, v: 16.5, r: 81 },
    { n: "Yan Couto", p: "RM", a: 23, v: 16.5, r: 81 },
    { n: "Anastasios Douvikas", p: "ST", a: 26, v: 14.3, r: 80 },
    { n: "Maxence Caqueret", p: "CM", a: 25, v: 12, r: 79 },
    { n: "Adrian Lahdo", p: "CM", a: 18, v: 8.3, r: 77 },
    { n: "\xC1lex Valle", p: "LB", a: 21, v: 8.3, r: 77 },
    { n: "Jean Butez", p: "GK", a: 30, v: 6.8, r: 76 },
    { n: "Mattia Liberali", p: "CAM", a: 18, v: 6, r: 76 },
    { n: "Luis Milla", p: "CM", a: 31, v: 3, r: 72 },
    { n: "Willy Kambwala", p: "CB", a: 21, v: 3, r: 72 },
    { n: "Ivan Smolcic", p: "RB", a: 25, v: 2.3, r: 70 }
  ],
  "Corinthians": [
    { n: "Yuri Alberto", p: "ST", a: 24, v: 20.3, r: 82 },
    { n: "Breno Bidon", p: "CM", a: 20, v: 18, r: 82 },
    { n: "Andr\xE9", p: "CM", a: 19, v: 12.8, r: 80 },
    { n: "Hugo Souza", p: "GK", a: 26, v: 9, r: 78 },
    { n: "Rodrigo Garro", p: "CAM", a: 27, v: 9, r: 78 },
    { n: "Memphis Depay", p: "CF", a: 31, v: 7.8, r: 77 },
    { n: "Gui Neg\xE3o", p: "ST", a: 18, v: 6.8, r: 76 },
    { n: "Matheuzinho", p: "RB", a: 25, v: 6, r: 76 },
    { n: "Matheus Bidu", p: "LB", a: 26, v: 4.5, r: 74 },
    { n: "Raniele", p: "CDM", a: 29, v: 3.2, r: 72 },
    { n: "Dieguinho", p: "RW", a: 18, v: 3, r: 72 },
    { n: "Tchoca", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Pedro Raul", p: "ST", a: 29, v: 2.9, r: 71 },
    { n: "Allan", p: "CDM", a: 28, v: 2, r: 70 },
    { n: "Jesse Lingard", p: "CAM", a: 33, v: 1.5, r: 68 },
    { n: "Matheus Donelli", p: "GK", a: 23, v: 1.5, r: 68 },
    { n: "Pedro Milans", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "Coritiba": [
    { n: "Pedro Morisco", p: "GK", a: 21, v: 3.8, r: 73 },
    { n: "Nicol\xE1s Fonseca", p: "CDM", a: 27, v: 2.4, r: 71 },
    { n: "Breno Lopes", p: "LW", a: 29, v: 2.3, r: 70 },
    { n: "Joaqu\xEDn Lavega", p: "LW", a: 20, v: 2.3, r: 70 },
    { n: "Lucas Ronier", p: "RW", a: 21, v: 2.1, r: 70 }
  ],
  "Coventry City": [
    { n: "Jack Rudoni", p: "CAM", a: 24, v: 14.3, r: 80 },
    { n: "Milan van Ewijk", p: "RB", a: 25, v: 14.3, r: 80 },
    { n: "Sidiki Ch\xE9rif", p: "ST", a: 19, v: 14.3, r: 80 },
    { n: "Gustavo Hamer", p: "CM", a: 28, v: 12.8, r: 80 },
    { n: "Yann Gboho", p: "LW", a: 24, v: 12, r: 79 },
    { n: "Loum Tchaouna", p: "RW", a: 22, v: 11.4, r: 79 },
    { n: "Bobby Thomas", p: "CB", a: 24, v: 11.3, r: 79 },
    { n: "Brandon Thomas-Asante", p: "ST", a: 27, v: 11.3, r: 79 },
    { n: "Haji Wright", p: "ST", a: 27, v: 11.3, r: 79 },
    { n: "Victor Torp", p: "CM", a: 26, v: 9.8, r: 78 },
    { n: "Carl Rushworth", p: "GK", a: 24, v: 8.3, r: 77 },
    { n: "Ellis Simms", p: "ST", a: 24, v: 8.3, r: 77 },
    { n: "Ephron Mason-Clark", p: "LM", a: 26, v: 8.3, r: 77 },
    { n: "Taiwo Awoniyi", p: "ST", a: 28, v: 7.5, r: 77 },
    { n: "Aur\xE8le Amenda", p: "CB", a: 22, v: 6.8, r: 76 },
    { n: "Frank Onyeka", p: "CM", a: 28, v: 6, r: 76 },
    { n: "Josh Eccles", p: "CM", a: 25, v: 6, r: 76 },
    { n: "Ethan Pinnock", p: "CB", a: 32, v: 5.7, r: 75 },
    { n: "Caleb Yirenkyi", p: "CM", a: 19, v: 4.5, r: 74 },
    { n: "Jay Dasilva", p: "LB", a: 27, v: 4.3, r: 74 },
    { n: "Matt Grimes", p: "CDM", a: 30, v: 4.1, r: 73 },
    { n: "Tatsuhiro Sakamoto", p: "RW", a: 29, v: 3.8, r: 73 },
    { n: "Kaine Kesler-Hayden", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Oliver Dovin", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Daniel Bentley", p: "GK", a: 32, v: 1.4, r: 68 }
  ],
  "Cremonese": [
    { n: "Jari Vandeputte", p: "CM", a: 29, v: 3, r: 72 },
    { n: "Tommaso Barbieri", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Giuseppe Pezzella", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Michele Collocolo", p: "CM", a: 26, v: 2.3, r: 70 },
    { n: "Morten Thorsby", p: "CM", a: 29, v: 2.3, r: 70 },
    { n: "Andrea Fulignati", p: "GK", a: 31, v: 0.7, r: 64 }
  ],
  "Cruz Azul": [
    { n: "Jos\xE9 Paradela", p: "CM", a: 27, v: 7.5, r: 77 },
    { n: "Kevin Mier", p: "GK", a: 25, v: 5.3, r: 75 },
    { n: "Jeremy M\xE1rquez", p: "CM", a: 25, v: 4.5, r: 74 },
    { n: "Jes\xFAs Orozco Chiquete", p: "CB", a: 23, v: 4.5, r: 74 },
    { n: "Agust\xEDn Palavecino", p: "CM", a: 29, v: 3.8, r: 73 },
    { n: "Omar Campos", p: "LB", a: 23, v: 3.8, r: 73 },
    { n: "Willer Ditta", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Andr\xE9s Monta\xF1o", p: "CM", a: 23, v: 2.9, r: 71 },
    { n: "Luka Romero", p: "RW", a: 21, v: 2.9, r: 71 },
    { n: "Andr\xE9s Gudi\xF1o", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Carlos Rotondi", p: "LW", a: 28, v: 2.3, r: 70 },
    { n: "Amaury Morales", p: "LW", a: 20, v: 2.1, r: 70 },
    { n: "Jorge Rodarte", p: "RB", a: 21, v: 1.5, r: 68 },
    { n: "Emmanuel Ochoa", p: "GK", a: 20, v: 0.8, r: 64 }
  ],
  "Cruzeiro": [
    { n: "Kaio Jorge", p: "ST", a: 23, v: 21, r: 83 },
    { n: "Gerson", p: "CM", a: 28, v: 16.5, r: 81 },
    { n: "Matheus Pereira", p: "CAM", a: 29, v: 11.3, r: 79 },
    { n: "Fabr\xEDcio Bruno", p: "CB", a: 29, v: 9.8, r: 78 },
    { n: "Kaiki", p: "LB", a: 22, v: 9.8, r: 78 },
    { n: "Luis Sinisterra", p: "LW", a: 26, v: 9, r: 78 },
    { n: "Christian", p: "CM", a: 25, v: 8.3, r: 77 },
    { n: "Keny Arroyo", p: "RW", a: 19, v: 7.5, r: 77 },
    { n: "Z\xE9 Lucas", p: "CDM", a: 17, v: 6.5, r: 76 },
    { n: "Gabriel Pec", p: "RW", a: 24, v: 6, r: 76 },
    { n: "Matheus Henrique", p: "CM", a: 28, v: 3.8, r: 73 },
    { n: "Jo\xE3o Marcelo", p: "CB", a: 25, v: 3, r: 72 },
    { n: "Wanderson", p: "LW", a: 31, v: 3, r: 72 },
    { n: "William", p: "RB", a: 30, v: 3, r: 72 },
    { n: "Lucas Romero", p: "CDM", a: 31, v: 2, r: 70 }
  ],
  "Crystal Palace": [
    { n: "Adam Wharton", p: "CDM", a: 21, v: 56.7, r: 88 },
    { n: "J\xF8rgen Strand Larsen", p: "ST", a: 25, v: 36.8, r: 86 },
    { n: "Isma\xEFla Sarr", p: "RW", a: 27, v: 28.5, r: 84 },
    { n: "Jean-Philippe Mateta", p: "ST", a: 28, v: 28.5, r: 84 },
    { n: "Y\xE9remy Pino", p: "RW", a: 23, v: 28.5, r: 84 },
    { n: "Dean Henderson", p: "GK", a: 28, v: 22.5, r: 83 },
    { n: "Evann Guessand", p: "RW", a: 24, v: 22.5, r: 83 },
    { n: "Chris Richards", p: "CB", a: 25, v: 20.3, r: 82 },
    { n: "Honest Ahanor", p: "CB", a: 17, v: 20.3, r: 82 },
    { n: "Quinten Timber", p: "CM", a: 24, v: 20.3, r: 82 },
    { n: "Tyrick Mitchell", p: "LB", a: 26, v: 20.3, r: 82 },
    { n: "Dwight McNeil", p: "LW", a: 26, v: 16.5, r: 81 },
    { n: "Jaydee Canvot", p: "CB", a: 19, v: 16.5, r: 81 },
    { n: "Anan Khalaili", p: "RM", a: 21, v: 14.3, r: 80 },
    { n: "\xD3scar Mingueza", p: "RB", a: 26, v: 14.3, r: 80 },
    { n: "Axel Disasi", p: "CB", a: 27, v: 12, r: 79 },
    { n: "Christantus Uche", p: "ST", a: 22, v: 12, r: 79 },
    { n: "Eddie Nketiah", p: "ST", a: 26, v: 11.3, r: 79 },
    { n: "Ben Chilwell", p: "LB", a: 29, v: 9.8, r: 78 },
    { n: "Chadi Riad", p: "CB", a: 22, v: 9.8, r: 78 },
    { n: "Daichi Kamada", p: "CAM", a: 29, v: 9.8, r: 78 },
    { n: "Dar\xEDo Osorio", p: "RW", a: 21, v: 8.3, r: 77 },
    { n: "Cheick Doucour\xE9", p: "CDM", a: 26, v: 8.1, r: 77 },
    { n: "Takehiro Tomiyasu", p: "RB", a: 27, v: 6.8, r: 76 },
    { n: "Jeffrey Schlupp", p: "LM", a: 31, v: 6, r: 76 },
    { n: "Jefferson Lerma", p: "CDM", a: 31, v: 4.9, r: 74 },
    { n: "Will Hughes", p: "CM", a: 30, v: 4.5, r: 74 },
    { n: "Walter Ben\xEDtez", p: "GK", a: 32, v: 3.8, r: 73 },
    { n: "Zavier Gozo", p: "RW", a: 18, v: 3, r: 72 }
  ],
  "C\xE1diz": [
    { n: "Javi Ontiveros", p: "LW", a: 28, v: 2.1, r: 70 },
    { n: "Anto\xF1ito Cordero", p: "LW", a: 19, v: 1.4, r: 68 }
  ],
  "C\xF3rdoba": [],
  "D.C. United": [
    { n: "Louis Munteanu", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Tai Baribo", p: "ST", a: 27, v: 3.8, r: 73 },
    { n: "Jared Stroud", p: "LW", a: 29, v: 2.1, r: 70 },
    { n: "Aar\xF3n Herrera", p: "RB", a: 28, v: 1.5, r: 68 },
    { n: "Gabriel Pirani", p: "CAM", a: 23, v: 1.5, r: 68 },
    { n: "Fidel Barajas", p: "RW", a: 19, v: 1.4, r: 68 }
  ],
  "Darmstadt": [
    { n: "Hiroki Akiyama", p: "CDM", a: 25, v: 2.4, r: 71 },
    { n: "Fabian N\xFCrnberger", p: "LM", a: 24, v: 2.3, r: 70 },
    { n: "Noah Wei\xDFhaupt", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "William Mikelbrencis", p: "RB", a: 21, v: 2.3, r: 70 }
  ],
  "Deportivo La Coru\xF1a": [
    { n: "Yeremay Hern\xE1ndez", p: "LW", a: 23, v: 20.3, r: 82 },
    { n: "Marc Casad\xF3", p: "CDM", a: 22, v: 14.6, r: 81 },
    { n: "Jos\xE9 Mar\xEDa Gim\xE9nez", p: "CB", a: 30, v: 9.8, r: 78 },
    { n: "Angeli\xF1o", p: "LB", a: 28, v: 8.3, r: 77 },
    { n: "Adama Traor\xE9", p: "RW", a: 29, v: 6.8, r: 76 },
    { n: "Lorenzo Amatucci", p: "CDM", a: 21, v: 6.5, r: 76 },
    { n: "Leo Rom\xE1n", p: "GK", a: 25, v: 4.5, r: 74 },
    { n: "David Mella", p: "RW", a: 20, v: 3.6, r: 73 },
    { n: "Jonathan Asp Jensen", p: "CAM", a: 19, v: 3, r: 72 },
    { n: "Mario Soriano", p: "CAM", a: 23, v: 2.3, r: 70 },
    { n: "Pierre-Emerick Aubameyang", p: "ST", a: 37, v: 2, r: 70 },
    { n: "Adri\xE0 Altimira", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "\xC1lvaro Fern\xE1ndez", p: "GK", a: 27, v: 1.5, r: 68 }
  ],
  "Derby County": [
    { n: "Patrick Agyemang", p: "ST", a: 25, v: 7.5, r: 77 },
    { n: "Bobby Clark", p: "CM", a: 20, v: 6, r: 76 },
    { n: "Ben Brereton D\xEDaz", p: "ST", a: 26, v: 4.5, r: 74 },
    { n: "Carlton Morris", p: "ST", a: 30, v: 4.5, r: 74 },
    { n: "Sammie Szmodics", p: "CAM", a: 30, v: 4.5, r: 74 },
    { n: "Eiran Cashin", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "David Ozoh", p: "CDM", a: 20, v: 3.2, r: 72 },
    { n: "Filip Bilbija", p: "LW", a: 25, v: 2.3, r: 70 },
    { n: "Jacob Widell Zetterstr\xF6m", p: "GK", a: 27, v: 2.3, r: 70 },
    { n: "Max Johnston", p: "RB", a: 22, v: 2.3, r: 70 },
    { n: "Oscar Fraulo", p: "CM", a: 22, v: 2.3, r: 70 },
    { n: "Derry Murkin", p: "LB", a: 26, v: 1.5, r: 68 },
    { n: "Joe Ward", p: "RM", a: 30, v: 0.8, r: 64 }
  ],
  "Dijon": [],
  "Dinamo Zagreb": [
    { n: "Dion Beljo", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Arb\xEBr Hoxha", p: "LW", a: 27, v: 2.3, r: 70 },
    { n: "Luka Stojkovic", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Matteo P\xE9rez Vinl\xF6f", p: "LB", a: 20, v: 2.3, r: 70 },
    { n: "Rona\xEBl Pierre-Gabriel", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Moris Valincic", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Ivan Nevistic", p: "GK", a: 27, v: 1.4, r: 68 },
    { n: "Lukas Kacavenda", p: "CAM", a: 22, v: 1.4, r: 68 },
    { n: "Bruno Goda", p: "LB", a: 27, v: 0.8, r: 64 }
  ],
  "Dundee": [
    { n: "Drey Wright", p: "RM", a: 30, v: 0.8, r: 64 }
  ],
  "Dundee United": [
    { n: "Neil Farrugia", p: "LM", a: 26, v: 0.8, r: 64 },
    { n: "Will Ferry", p: "LM", a: 25, v: 0.7, r: 64 }
  ],
  "Dunkerque": [
    { n: "Steven Nzonzi", p: "CDM", a: 37, v: 0.2, r: 57 }
  ],
  "Dynamo Dresden": [
    { n: "Robert Wagner", p: "CM", a: 22, v: 2.1, r: 70 }
  ],
  "Eibar": [
    { n: "Juan Bernat", p: "LB", a: 32, v: 1.4, r: 68 },
    { n: "Jonmi Magunagoitia", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "Eintracht Frankfurt": [
    { n: "Can Uzun", p: "CAM", a: 20, v: 36.8, r: 86 },
    { n: "Jonathan Burkardt", p: "ST", a: 25, v: 28.5, r: 84 },
    { n: "Raphael Onyedika", p: "CDM", a: 24, v: 18.6, r: 82 },
    { n: "Nnamdi Collins", p: "CB", a: 21, v: 16.5, r: 81 },
    { n: "Noah Atubolu", p: "GK", a: 23, v: 16.5, r: 81 },
    { n: "Ritsu Doan", p: "RW", a: 27, v: 16.5, r: 81 },
    { n: "Far\xE8s Cha\xEFbi", p: "CAM", a: 23, v: 12, r: 79 },
    { n: "Robin Koch", p: "CB", a: 29, v: 12, r: 79 },
    { n: "Ansgar Knauff", p: "RW", a: 23, v: 11.4, r: 79 },
    { n: "Tuta", p: "CB", a: 26, v: 11.4, r: 79 },
    { n: "Lilian Brassier", p: "CB", a: 26, v: 9.8, r: 78 },
    { n: "No\xEBl As\xE9ko", p: "CDM", a: 20, v: 9.7, r: 78 },
    { n: "Oscar H\xF8jlund", p: "CM", a: 20, v: 8.3, r: 77 },
    { n: "Younes Ebnoutalib", p: "ST", a: 22, v: 6.8, r: 76 },
    { n: "Ayoube Amaimouni-Echghouyab", p: "RW", a: 21, v: 6, r: 76 },
    { n: "Kau\xE3 Santos", p: "GK", a: 22, v: 6, r: 76 },
    { n: "Keita Kosugi", p: "LB", a: 19, v: 4.5, r: 74 },
    { n: "Love Arrhov", p: "CAM", a: 17, v: 3.8, r: 73 },
    { n: "Elias Baum", p: "RB", a: 20, v: 3, r: 72 },
    { n: "Mario G\xF6tze", p: "CAM", a: 33, v: 3, r: 72 }
  ],
  "Elche": [
    { n: "Facundo Buonanotte", p: "CAM", a: 21, v: 12.8, r: 80 },
    { n: "Kevin Lom\xF3naco", p: "CB", a: 23, v: 7.5, r: 77 },
    { n: "Germ\xE1n Valera", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Ezequiel Ponce", p: "ST", a: 28, v: 3.8, r: 73 },
    { n: "I\xF1aki Pe\xF1a", p: "GK", a: 26, v: 3.8, r: 73 },
    { n: "Martim Neto", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Lucas Cepeda", p: "LW", a: 23, v: 3, r: 72 },
    { n: "Rafa Mir", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Marc Aguado", p: "CDM", a: 25, v: 2.8, r: 71 },
    { n: "Grady Diangana", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Roy Revivo", p: "LB", a: 22, v: 2.3, r: 70 },
    { n: "Alejandro Iturbe", p: "GK", a: 22, v: 1.5, r: 68 },
    { n: "L\xE9o P\xE9trot", p: "LB", a: 28, v: 1.5, r: 68 },
    { n: "Rub\xE9n S\xE1nchez", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Thomas Lemar", p: "CAM", a: 30, v: 1.5, r: 68 },
    { n: "Adam Boayar", p: "CF", a: 20, v: 0.7, r: 64 }
  ],
  "Eldense": [],
  "Elversberg": [
    { n: "Francis Onyeka", p: "CAM", a: 18, v: 8.3, r: 77 },
    { n: "Cole Campbell", p: "RW", a: 19, v: 3.8, r: 73 },
    { n: "Noel Futkeu", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Maurice Krattenmacher", p: "CAM", a: 20, v: 3, r: 72 },
    { n: "Noah Darvich", p: "RW", a: 19, v: 2.3, r: 70 },
    { n: "Lukasz Poreba", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Nicolas Kristof", p: "GK", a: 26, v: 1.5, r: 68 },
    { n: "Lukas Petkov", p: "RW", a: 25, v: 1.4, r: 68 },
    { n: "Lasse G\xFCnther", p: "LB", a: 22, v: 0.8, r: 64 },
    { n: "Maurice Neubauer", p: "LM", a: 27, v: 0.8, r: 64 }
  ],
  "Empoli": [
    { n: "Bogdan Popov", p: "ST", a: 18, v: 2.3, r: 70 },
    { n: "Filippo Distefano", p: "CF", a: 22, v: 1.4, r: 68 },
    { n: "Joseph Ceesay", p: "RM", a: 27, v: 0.8, r: 64 }
  ],
  "Energie Cottbus": [],
  "Entella": [
    { n: "Stefano Di Mario", p: "LM", a: 21, v: 1.5, r: 68 },
    { n: "Davide Bariti", p: "RM", a: 34, v: 0.8, r: 64 },
    { n: "Francesco Mezzoni", p: "RM", a: 25, v: 0.8, r: 64 }
  ],
  "Erzurumspor": [
    { n: "Elisha Owusu", p: "CDM", a: 28, v: 3.2, r: 72 }
  ],
  "Espanyol": [
    { n: "Quilindschy Hartman", p: "LB", a: 24, v: 14.3, r: 80 },
    { n: "Omar El Hilali", p: "RB", a: 22, v: 12, r: 79 },
    { n: "Urko Gonz\xE1lez de Z\xE1rate", p: "CDM", a: 24, v: 9.7, r: 78 },
    { n: "Bryan Zaragoza", p: "LW", a: 24, v: 8.3, r: 77 },
    { n: "Roberto Fern\xE1ndez", p: "ST", a: 23, v: 8.3, r: 77 },
    { n: "Tyrhys Dolan", p: "RW", a: 24, v: 8.3, r: 77 },
    { n: "Javi Puado", p: "LW", a: 27, v: 6, r: 76 },
    { n: "Gabriel Moscardo", p: "CDM", a: 20, v: 5.7, r: 75 },
    { n: "Pol Lozano", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Clemens Riedel", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Edu Exp\xF3sito", p: "CM", a: 29, v: 3.8, r: 73 },
    { n: "Andoni Gorosabel", p: "RB", a: 29, v: 3, r: 72 },
    { n: "Jofre Carreras", p: "RW", a: 24, v: 2.3, r: 70 },
    { n: "Antoniu Roca", p: "RW", a: 23, v: 1.5, r: 68 }
  ],
  "Estoril": [
    { n: "Rodrigo Gomes", p: "LM", a: 20, v: 12, r: 79 },
    { n: "Yanis Begraoui", p: "ST", a: 24, v: 6.8, r: 76 },
    { n: "K\xE9vin Boma", p: "CB", a: 23, v: 4.5, r: 74 },
    { n: "Jordan Holsgrove", p: "CDM", a: 26, v: 4.1, r: 73 },
    { n: "Rafik Guitane", p: "RW", a: 26, v: 3.8, r: 73 },
    { n: "Jo\xE3o Carvalho", p: "CAM", a: 28, v: 3, r: 72 },
    { n: "Ricard S\xE1nchez", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Roko Jurisic", p: "LB", a: 24, v: 1.4, r: 68 }
  ],
  "Estrela Amadora": [
    { n: "Billal Brahimi", p: "RW", a: 25, v: 1.5, r: 68 },
    { n: "Lovro Zvonarek", p: "CAM", a: 20, v: 1.4, r: 68 },
    { n: "Nilton", p: "LB", a: 24, v: 1.4, r: 68 }
  ],
  "Everton": [
    { n: "Jarrad Branthwaite", p: "CB", a: 23, v: 36.8, r: 86 },
    { n: "James Garner", p: "CDM", a: 24, v: 36.5, r: 86 },
    { n: "Brennan Johnson", p: "RW", a: 24, v: 28.5, r: 84 },
    { n: "Kiernan Dewsbury-Hall", p: "CM", a: 27, v: 26.3, r: 84 },
    { n: "Hayden Hackney", p: "CDM", a: 23, v: 25.9, r: 84 },
    { n: "Thierno Barry", p: "ST", a: 23, v: 24, r: 83 },
    { n: "Jack Grealish", p: "LW", a: 30, v: 20.3, r: 82 },
    { n: "Vitaliy Mykolenko", p: "LB", a: 26, v: 20.3, r: 82 },
    { n: "Tyler Dibling", p: "RW", a: 19, v: 18, r: 82 },
    { n: "Tyrique George", p: "LW", a: 19, v: 18, r: 82 },
    { n: "Jake O'Brien", p: "RB", a: 24, v: 14.3, r: 80 },
    { n: "Merlin R\xF6hl", p: "CAM", a: 23, v: 12.8, r: 80 },
    { n: "Carlos Alcaraz", p: "CM", a: 23, v: 12, r: 79 },
    { n: "Jordan Pickford", p: "GK", a: 31, v: 12, r: 79 },
    { n: "Harrison Armstrong", p: "CM", a: 18, v: 9.8, r: 78 },
    { n: "Ainsley Maitland-Niles", p: "RB", a: 28, v: 8.3, r: 77 },
    { n: "James Tarkowski", p: "CB", a: 33, v: 6, r: 76 },
    { n: "Christian N\xF8rgaard", p: "CDM", a: 31, v: 4.1, r: 73 },
    { n: "Michael Keane", p: "CB", a: 32, v: 3.6, r: 73 },
    { n: "Mark Travers", p: "GK", a: 26, v: 3, r: 72 }
  ],
  "Excelsior": [
    { n: "Arthur Zagr\xE9", p: "LB", a: 24, v: 0.8, r: 64 }
  ],
  "Ey\xFCpspor": [
    { n: "Calegari", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Marcos Felipe", p: "GK", a: 29, v: 1.5, r: 68 }
  ],
  "FC Andorra": [],
  "FC Cincinnati": [
    { n: "Evander", p: "CAM", a: 27, v: 12.8, r: 80 },
    { n: "K\xE9vin Denkey", p: "ST", a: 25, v: 11.3, r: 79 },
    { n: "Pavel Bucha", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Bryan Ram\xEDrez", p: "RW", a: 25, v: 2.3, r: 70 },
    { n: "Roman Celentano", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "Obinna Nwobodo", p: "CDM", a: 29, v: 2, r: 70 }
  ],
  "FC Copenhagen": [
    { n: "Diant Ramaj", p: "GK", a: 24, v: 6, r: 76 },
    { n: "Youssoufa Moukoko", p: "ST", a: 21, v: 6, r: 76 },
    { n: "Gabriel Pereira", p: "CB", a: 25, v: 5.3, r: 75 },
    { n: "Dominik Kotarski", p: "GK", a: 25, v: 4.5, r: 74 },
    { n: "Rodrigo Huescas", p: "RB", a: 22, v: 4.5, r: 74 },
    { n: "Alex Kr\xE1l", p: "CM", a: 27, v: 4.3, r: 74 },
    { n: "Mohamed Elyounoussi", p: "CF", a: 31, v: 3.6, r: 73 },
    { n: "Elias Achouri", p: "LW", a: 26, v: 3, r: 72 },
    { n: "Magnus Mattsson", p: "CM", a: 26, v: 3, r: 72 },
    { n: "Marcos L\xF3pez", p: "LB", a: 26, v: 3, r: 72 },
    { n: "William Clem", p: "CDM", a: 21, v: 2.8, r: 71 },
    { n: "Aur\xE9lio Buta", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "Jordan Larsson", p: "RW", a: 28, v: 2.3, r: 70 },
    { n: "Viktor Dadason", p: "ST", a: 17, v: 2.3, r: 70 },
    { n: "Birger Meling", p: "LB", a: 31, v: 1.5, r: 68 },
    { n: "Robert", p: "LW", a: 20, v: 1.5, r: 68 }
  ],
  "FC Dallas": [
    { n: "Petar Musa", p: "ST", a: 27, v: 6.8, r: 76 },
    { n: "Anderson Julio", p: "RW", a: 29, v: 2.3, r: 70 },
    { n: "Herman Johansson", p: "RM", a: 28, v: 1.5, r: 68 },
    { n: "Joaqu\xEDn Valiente", p: "CAM", a: 24, v: 1.5, r: 68 },
    { n: "Shaq Moore", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Louicius Deedson", p: "RW", a: 24, v: 1.4, r: 68 },
    { n: "Jonathan Sirois", p: "GK", a: 24, v: 0.8, r: 64 }
  ],
  "FC Ju\xE1rez": [
    { n: "Denzell Garc\xEDa", p: "CDM", a: 22, v: 4.5, r: 74 },
    { n: "\xD3scar Estupi\xF1\xE1n", p: "ST", a: 29, v: 3, r: 72 },
    { n: "Jairo Torres", p: "RW", a: 25, v: 2.9, r: 71 },
    { n: "Rodrigo Dourado", p: "CDM", a: 31, v: 1.6, r: 68 },
    { n: "Madson", p: "LW", a: 26, v: 1.5, r: 68 },
    { n: "Raymundo Fulgencio", p: "LW", a: 25, v: 1.5, r: 68 },
    { n: "Sebasti\xE1n Jurado", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Alejandro Mayorga", p: "LB", a: 28, v: 1.4, r: 68 },
    { n: "Jos\xE9 Luis Rodr\xEDguez", p: "LW", a: 27, v: 1.4, r: 68 }
  ],
  "FC Midtjylland": [
    { n: "Franculino", p: "ST", a: 21, v: 18, r: 82 },
    { n: "Rasmus Kristensen", p: "RB", a: 28, v: 9.8, r: 78 },
    { n: "Ousmane Diao", p: "CB", a: 21, v: 6.8, r: 76 },
    { n: "Philip Billing", p: "CM", a: 29, v: 6, r: 76 },
    { n: "Aral \u015Eim\u015Fir", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Denil Castillo", p: "CM", a: 21, v: 4.5, r: 74 },
    { n: "Mads Bech S\xF8rensen", p: "CB", a: 26, v: 4.5, r: 74 },
    { n: "David Mart\xEDnez", p: "RW", a: 19, v: 2.9, r: 71 },
    { n: "Hyun-seok Hong", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Kevin Mbabu", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Kjell W\xE4tjen", p: "CM", a: 19, v: 2.3, r: 70 },
    { n: "Victor Bak", p: "LB", a: 22, v: 2.3, r: 70 },
    { n: "Mikel Gogorza", p: "LW", a: 19, v: 2.1, r: 70 },
    { n: "El\xEDas \xD3lafsson", p: "GK", a: 25, v: 1.5, r: 68 }
  ],
  "FC Nordsj\xE6lland": [
    { n: "Alexander Lind", p: "ST", a: 23, v: 4.5, r: 74 },
    { n: "Prince Amoako Junior", p: "LW", a: 18, v: 3.8, r: 73 },
    { n: "Juho L\xE4hteenm\xE4ki", p: "LB", a: 19, v: 3, r: 72 },
    { n: "Ibrahim Adel", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "Mark Brink", p: "CDM", a: 27, v: 1.6, r: 68 },
    { n: "Ola Solbakken", p: "RW", a: 27, v: 1.5, r: 68 },
    { n: "Runar Norheim", p: "LB", a: 20, v: 1.5, r: 68 },
    { n: "Andreas Hansen", p: "GK", a: 30, v: 0.7, r: 64 }
  ],
  "FC Z\xFCrich": [
    { n: "Cheveyo Tsawa", p: "CM", a: 19, v: 3.8, r: 73 },
    { n: "Matthias Pha\xEBton", p: "LW", a: 25, v: 1.5, r: 68 },
    { n: "Sebastian Walker", p: "LM", a: 20, v: 0.8, r: 64 }
  ],
  "Falkirk": [
    { n: "Calvin Miller", p: "LM", a: 25, v: 0.8, r: 64 },
    { n: "Ethan Ross", p: "LM", a: 22, v: 0.8, r: 64 }
  ],
  "Famalic\xE3o": [
    { n: "Gustavo S\xE1", p: "CAM", a: 21, v: 14.3, r: 80 },
    { n: "Mathias de Amorim", p: "CM", a: 21, v: 4.5, r: 74 },
    { n: "Tom van de Looi", p: "CDM", a: 26, v: 4.1, r: 73 },
    { n: "Sorriso", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Finn van Breemen", p: "CB", a: 22, v: 3.6, r: 73 },
    { n: "Georgios Koutsias", p: "ST", a: 21, v: 3.6, r: 73 },
    { n: "L\xE9o Realpe", p: "CB", a: 24, v: 3, r: 72 },
    { n: "\xD3scar Aranda", p: "LW", a: 23, v: 3, r: 72 },
    { n: "Rodrigo Pinheiro", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Lazar Carevi\u0107", p: "GK", a: 26, v: 2.3, r: 70 },
    { n: "Garcia", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Ivan Zlobin", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Pedro Bondo", p: "LB", a: 21, v: 1.5, r: 68 }
  ],
  "Fenerbah\xE7e": [
    { n: "Mason Greenwood", p: "RW", a: 24, v: 44.3, r: 87 },
    { n: "Matt\xE9o Guendouzi", p: "CM", a: 26, v: 22.5, r: 83 },
    { n: "Jhon Dur\xE1n", p: "ST", a: 22, v: 20.3, r: 82 },
    { n: "Kerem Akt\xFCrko\u011Flu", p: "LW", a: 27, v: 18, r: 82 },
    { n: "Youssef En-Nesyri", p: "ST", a: 28, v: 16.5, r: 81 },
    { n: "Dorgeles Nene", p: "RW", a: 23, v: 14.3, r: 80 },
    { n: "Jayden Oosterwolde", p: "CB", a: 24, v: 14.3, r: 80 },
    { n: "\u0130smail Y\xFCksek", p: "CDM", a: 26, v: 12.2, r: 80 },
    { n: "Marco Asensio", p: "CAM", a: 29, v: 12, r: 79 },
    { n: "Nathan Ak\xE9", p: "CB", a: 30, v: 12, r: 79 },
    { n: "Ederson", p: "GK", a: 32, v: 10.5, r: 79 },
    { n: "Romelu Lukaku", p: "ST", a: 32, v: 9.8, r: 78 },
    { n: "Milan \u0160kriniar", p: "CB", a: 30, v: 9, r: 78 },
    { n: "Kojo Peprah Oppong", p: "CB", a: 21, v: 8.3, r: 77 },
    { n: "Archie Brown", p: "LB", a: 23, v: 7.5, r: 77 },
    { n: "O\u011Fuz Ayd\u0131n", p: "LW", a: 25, v: 6.8, r: 76 },
    { n: "Mert M\xFCld\xFCr", p: "RB", a: 26, v: 6, r: 76 },
    { n: "N\xE9lson Semedo", p: "RB", a: 32, v: 6, r: 76 },
    { n: "Talisca", p: "CAM", a: 31, v: 6, r: 76 },
    { n: "Fred", p: "CM", a: 32, v: 4.5, r: 74 },
    { n: "\xC7a\u011Flar S\xF6y\xFCnc\xFC", p: "CB", a: 29, v: 3.8, r: 73 },
    { n: "Levent Mercan", p: "LB", a: 25, v: 3.8, r: 73 },
    { n: "Yi\u011Fit Efe Demir", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "N'Golo Kant\xE9", p: "CDM", a: 35, v: 3.2, r: 72 },
    { n: "Du\u0161an Tadi\u0107", p: "RW", a: 37, v: 2.1, r: 70 },
    { n: "Mert G\xFCnok", p: "GK", a: 36, v: 0.7, r: 64 }
  ],
  "Feyenoord": [
    { n: "Givairo Read", p: "RB", a: 19, v: 20.3, r: 82 },
    { n: "Anis Hadj Moussa", p: "RW", a: 23, v: 16.5, r: 81 },
    { n: "Luciano Valente", p: "CM", a: 22, v: 14.3, r: 80 },
    { n: "Oussama Targhalline", p: "CDM", a: 23, v: 13, r: 80 },
    { n: "Reiss Nelson", p: "LW", a: 26, v: 9.8, r: 78 },
    { n: "Sem Steijn", p: "CAM", a: 24, v: 9, r: 78 },
    { n: "Jakub Moder", p: "CM", a: 26, v: 8.3, r: 77 },
    { n: "Tsuyoshi Watanabe", p: "CB", a: 28, v: 8.3, r: 77 },
    { n: "Jordan Bos", p: "LB", a: 23, v: 6.8, r: 76 },
    { n: "Thomas Beelen", p: "CB", a: 24, v: 6, r: 76 },
    { n: "Charles Vanhoutte", p: "CDM", a: 27, v: 5.7, r: 75 },
    { n: "Gijs Smal", p: "LB", a: 28, v: 4.5, r: 74 },
    { n: "Jeremiah St. Juste", p: "CB", a: 29, v: 4.3, r: 74 },
    { n: "Raheem Sterling", p: "RW", a: 31, v: 3.8, r: 73 },
    { n: "Gon\xE7alo Borges", p: "RW", a: 24, v: 3.6, r: 73 },
    { n: "Casper Tengstedt", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Jordan Lotomba", p: "RB", a: 27, v: 3, r: 72 },
    { n: "Aymen Sliti", p: "LW", a: 19, v: 2.3, r: 70 },
    { n: "Bart Nieuwkoop", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Gaoussou Diarra", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Plamen Andreev", p: "GK", a: 21, v: 1.4, r: 68 },
    { n: "Steven Benda", p: "GK", a: 27, v: 0.8, r: 64 }
  ],
  "Fiorentina": [
    { n: "Franco Mastantuono", p: "RW", a: 18, v: 36.8, r: 86 },
    { n: "Pedro Gon\xE7alves", p: "LW", a: 27, v: 22.5, r: 83 },
    { n: "\xC1lex Jim\xE9nez", p: "RB", a: 20, v: 18, r: 82 },
    { n: "Beto", p: "ST", a: 27, v: 16.5, r: 81 },
    { n: "Radu Dr\u0103gu\u0219in", p: "CB", a: 23, v: 16.5, r: 81 },
    { n: "Dod\xF4", p: "RB", a: 27, v: 14.3, r: 80 },
    { n: "Wilfried Gnonto", p: "RW", a: 22, v: 14.3, r: 80 },
    { n: "Christ Inao Oula\xEF", p: "CM", a: 19, v: 13.5, r: 80 },
    { n: "Nicol\xF2 Fagioli", p: "CM", a: 24, v: 12.8, r: 80 },
    { n: "Arthur Atta", p: "CM", a: 22, v: 12, r: 79 },
    { n: "Mateo Pellegrino", p: "ST", a: 24, v: 12, r: 79 },
    { n: "Cher Ndour", p: "CM", a: 21, v: 8.3, r: 77 },
    { n: "Marco Brescianini", p: "CM", a: 25, v: 7.5, r: 77 },
    { n: "Jo\xE3o M\xE1rio", p: "RB", a: 25, v: 6.8, r: 76 },
    { n: "Luca Ranieri", p: "CB", a: 26, v: 6, r: 76 },
    { n: "Marin Pongracic", p: "CB", a: 28, v: 6, r: 76 },
    { n: "Fabiano Parisi", p: "LB", a: 25, v: 4.5, r: 74 },
    { n: "Tariq Lamptey", p: "RB", a: 25, v: 3.8, r: 73 },
    { n: "V\xEDctor Valdepe\xF1as", p: "CB", a: 19, v: 3.8, r: 73 },
    { n: "David de Gea", p: "GK", a: 35, v: 3, r: 72 },
    { n: "Alieu Njie", p: "LW", a: 20, v: 2.3, r: 70 },
    { n: "Oliver Christensen", p: "GK", a: 26, v: 1.5, r: 68 }
  ],
  "Flamengo": [
    { n: "Lucas Paquet\xE1", p: "CAM", a: 28, v: 28.5, r: 84 },
    { n: "Pedro", p: "ST", a: 28, v: 17.1, r: 81 },
    { n: "Samuel Lino", p: "LW", a: 26, v: 13.5, r: 80 },
    { n: "Giorgian de Arrascaeta", p: "CAM", a: 31, v: 12, r: 79 },
    { n: "L\xE9o Ortiz", p: "CB", a: 29, v: 11.3, r: 79 },
    { n: "Jorge Carrascal", p: "CAM", a: 27, v: 9, r: 78 },
    { n: "Vit\xE3o", p: "CB", a: 25, v: 9, r: 78 },
    { n: "Agust\xEDn Rossi", p: "GK", a: 30, v: 8.3, r: 77 },
    { n: "L\xE9o Pereira", p: "CB", a: 29, v: 8.3, r: 77 },
    { n: "Evertton Ara\xFAjo", p: "CDM", a: 22, v: 8.1, r: 77 },
    { n: "Nicol\xE1s de la Cruz", p: "CM", a: 28, v: 7.5, r: 77 },
    { n: "Gonzalo Plata", p: "RW", a: 25, v: 6.8, r: 76 },
    { n: "Emerson Royal", p: "RB", a: 26, v: 6, r: 76 },
    { n: "Everton", p: "LW", a: 29, v: 6, r: 76 },
    { n: "Luiz Ara\xFAjo", p: "RW", a: 29, v: 5.7, r: 75 },
    { n: "Wallace Yan", p: "ST", a: 20, v: 4.5, r: 74 },
    { n: "Michael", p: "LW", a: 29, v: 4.3, r: 74 },
    { n: "Erick Pulgar", p: "CDM", a: 31, v: 3.6, r: 73 },
    { n: "Jorginho", p: "CDM", a: 34, v: 3.2, r: 72 },
    { n: "Ayrton Lucas", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Alex Sandro", p: "LB", a: 34, v: 1.5, r: 68 },
    { n: "Sa\xFAl \xD1\xEDguez", p: "CM", a: 31, v: 0.8, r: 65 }
  ],
  "Fluminense": [
    { n: "Martinelli", p: "CDM", a: 24, v: 13, r: 80 },
    { n: "H\xE9rcules", p: "CM", a: 25, v: 9.8, r: 78 },
    { n: "Jefferson Savarino", p: "CAM", a: 29, v: 6.8, r: 76 },
    { n: "Isaque", p: "CAM", a: 18, v: 6.4, r: 76 },
    { n: "Guilherme Arana", p: "LB", a: 28, v: 6, r: 76 },
    { n: "John Kennedy", p: "ST", a: 23, v: 6, r: 76 },
    { n: "Agust\xEDn Canobbio", p: "LW", a: 27, v: 4.5, r: 74 },
    { n: "Riquelme", p: "RW", a: 18, v: 4.5, r: 74 },
    { n: "Juan Pablo Freytes", p: "CB", a: 25, v: 3.8, r: 73 },
    { n: "Kevin Serna", p: "RW", a: 28, v: 3.8, r: 73 },
    { n: "Luciano Acosta", p: "CAM", a: 31, v: 3.8, r: 73 },
    { n: "Rub\xE9n Lezcano", p: "LW", a: 21, v: 3, r: 72 },
    { n: "Yeferson Soteldo", p: "LW", a: 28, v: 3, r: 72 },
    { n: "Santiago Moreno", p: "RW", a: 25, v: 2.3, r: 70 },
    { n: "Hulk", p: "ST", a: 40, v: 0.8, r: 65 }
  ],
  "Fortuna Sittard": [
    { n: "Mohamed Ihattaren", p: "CAM", a: 23, v: 2.3, r: 70 },
    { n: "Philip Brittijn", p: "CDM", a: 21, v: 1.6, r: 68 },
    { n: "Jasper Dahlhaus", p: "LB", a: 24, v: 0.8, r: 64 }
  ],
  "Freiburg": [
    { n: "Yuito Suzuki", p: "CF", a: 24, v: 11.4, r: 79 },
    { n: "Mio Backhaus", p: "GK", a: 21, v: 9.8, r: 78 },
    { n: "Philipp Lienhart", p: "CB", a: 29, v: 9.8, r: 78 },
    { n: "Patrick Osterhage", p: "CDM", a: 25, v: 9.7, r: 78 },
    { n: "Bruno Ogbus", p: "CB", a: 20, v: 8.3, r: 77 },
    { n: "Igor Matanovic", p: "ST", a: 22, v: 8.3, r: 77 },
    { n: "Maximilian Eggestein", p: "CM", a: 29, v: 8.3, r: 77 },
    { n: "Philipp Treu", p: "RB", a: 25, v: 8.3, r: 77 },
    { n: "Niklas Beste", p: "RW", a: 26, v: 7.8, r: 77 },
    { n: "Cyriaque Iri\xE9", p: "RW", a: 20, v: 6.8, r: 76 },
    { n: "Keisuke Goto", p: "ST", a: 20, v: 6.8, r: 76 },
    { n: "Yannik Engelhardt", p: "CDM", a: 24, v: 5.7, r: 75 },
    { n: "Derry Scherhant", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Jordy Makengo", p: "LB", a: 24, v: 4.5, r: 74 },
    { n: "Matthias Ginter", p: "CB", a: 31, v: 4.5, r: 74 },
    { n: "Max Rosenfelder", p: "CB", a: 22, v: 4.5, r: 74 },
    { n: "Vincenzo Grifo", p: "LW", a: 32, v: 4.3, r: 74 },
    { n: "Rihito Yamamoto", p: "CM", a: 24, v: 3.8, r: 73 },
    { n: "Berkay Yilmaz", p: "LB", a: 20, v: 2.9, r: 71 },
    { n: "Christian G\xFCnter", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "Florent Muslija", p: "LW", a: 27, v: 1.5, r: 68 },
    { n: "Lukas K\xFCbler", p: "RB", a: 33, v: 1.5, r: 68 },
    { n: "Florian M\xFCller", p: "GK", a: 28, v: 0.8, r: 64 }
  ],
  "Frosinone": [
    { n: "Romano Schmid", p: "CAM", a: 25, v: 12, r: 79 },
    { n: "Tomas Bobcek", p: "ST", a: 24, v: 6, r: 76 },
    { n: "Far\xE8s Ghedjemis", p: "RW", a: 23, v: 4.5, r: 74 },
    { n: "Matteo Cichella", p: "CDM", a: 20, v: 4.1, r: 73 },
    { n: "Daniel B\xEErligea", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Patrizio Masini", p: "CM", a: 24, v: 3.8, r: 73 },
    { n: "Antonio Raimondo", p: "ST", a: 21, v: 3, r: 72 },
    { n: "Aleksa Terzic", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Luis Hasa", p: "CM", a: 21, v: 2.3, r: 70 },
    { n: "Florian Grillitsch", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "Giacomo Cal\xF2", p: "CDM", a: 28, v: 2, r: 70 },
    { n: "Alessio Zerbin", p: "RM", a: 26, v: 1.5, r: 68 },
    { n: "Anthony Oyono", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Enzo Tchato", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Lorenzo Palmisani", p: "GK", a: 21, v: 1.5, r: 68 },
    { n: "Sebastiano Desplanches", p: "GK", a: 22, v: 0.8, r: 64 }
  ],
  "Fulham": [
    { n: "Hugo Larsson", p: "CM", a: 21, v: 26.3, r: 84 },
    { n: "Gonzalo Garc\xEDa", p: "ST", a: 21, v: 24, r: 83 },
    { n: "Kevin", p: "LW", a: 22, v: 24, r: 83 },
    { n: "Oscar Bobb", p: "RW", a: 22, v: 24, r: 83 },
    { n: "Calvin Bassey", p: "CB", a: 26, v: 22.5, r: 83 },
    { n: "Alex Iwobi", p: "LW", a: 29, v: 20.3, r: 82 },
    { n: "Antonee Robinson", p: "LB", a: 28, v: 20.3, r: 82 },
    { n: "Joachim Andersen", p: "CB", a: 29, v: 20.3, r: 82 },
    { n: "Rodrigo Muniz", p: "ST", a: 24, v: 20.3, r: 82 },
    { n: "Sander Berge", p: "CDM", a: 27, v: 20.3, r: 82 },
    { n: "Emile Smith Rowe", p: "CAM", a: 25, v: 18, r: 82 },
    { n: "Josh King", p: "CAM", a: 18, v: 16.5, r: 81 },
    { n: "Ryan Sessegnon", p: "LB", a: 25, v: 16.5, r: 81 },
    { n: "Shea Charles", p: "CDM", a: 22, v: 12.2, r: 80 },
    { n: "Kenny Tete", p: "RB", a: 30, v: 9, r: 78 },
    { n: "Timothy Castagne", p: "RB", a: 30, v: 8.3, r: 77 },
    { n: "David Affengruber", p: "CB", a: 24, v: 7.5, r: 77 },
    { n: "Bernd Leno", p: "GK", a: 33, v: 6.8, r: 76 },
    { n: "Jorge Cuenca", p: "CB", a: 26, v: 6.8, r: 76 },
    { n: "C\xE9sar Palacios", p: "CAM", a: 21, v: 4.5, r: 74 },
    { n: "Manuel \xC1ngel", p: "CM", a: 21, v: 3.8, r: 73 },
    { n: "Jonah Kusi-Asare", p: "ST", a: 18, v: 3, r: 72 },
    { n: "Harrison Reed", p: "CM", a: 30, v: 2.3, r: 70 },
    { n: "Benjamin Lecomte", p: "GK", a: 34, v: 0.8, r: 64 }
  ],
  "Galatasaray": [
    { n: "Victor Osimhen", p: "ST", a: 27, v: 60.8, r: 89 },
    { n: "Rafael Le\xE3o", p: "LW", a: 26, v: 52.5, r: 88 },
    { n: "Bar\u0131\u015F Alper Y\u0131lmaz", p: "LW", a: 25, v: 21, r: 83 },
    { n: "Wilfried Singo", p: "CB", a: 25, v: 20.3, r: 82 },
    { n: "Gabriel Sara", p: "CM", a: 26, v: 18, r: 82 },
    { n: "Leroy San\xE9", p: "RW", a: 29, v: 18, r: 82 },
    { n: "Lesley Ugochukwu", p: "CDM", a: 21, v: 17.8, r: 82 },
    { n: "Davinson S\xE1nchez", p: "CB", a: 29, v: 14.3, r: 80 },
    { n: "Yunus Akg\xFCn", p: "RW", a: 25, v: 14.3, r: 80 },
    { n: "El Chadaille Bitshiabu", p: "CB", a: 20, v: 12, r: 79 },
    { n: "U\u011Furcan \xC7ak\u0131r", p: "GK", a: 29, v: 12, r: 79 },
    { n: "Roland Sallai", p: "RB", a: 28, v: 9.8, r: 78 },
    { n: "Lucas Torreira", p: "CDM", a: 30, v: 8.1, r: 77 },
    { n: "Ismail Jakobs", p: "LB", a: 26, v: 6.8, r: 76 },
    { n: "\u0130lkay G\xFCndo\u011Fan", p: "CM", a: 35, v: 5.7, r: 75 },
    { n: "Abd\xFClkerim Bardakc\u0131", p: "CB", a: 31, v: 5.3, r: 75 },
    { n: "Renato Nhaga", p: "CM", a: 18, v: 4.5, r: 74 },
    { n: "Eren Elmal\u0131", p: "LB", a: 25, v: 3.8, r: 73 },
    { n: "Mauro Icardi", p: "ST", a: 32, v: 3.8, r: 73 },
    { n: "Mario Lemina", p: "CDM", a: 32, v: 3.6, r: 73 },
    { n: "Ahmed Kutucu", p: "LW", a: 25, v: 3, r: 72 },
    { n: "Kaz\u0131mcan Karata\u015F", p: "LB", a: 22, v: 1.5, r: 68 }
  ],
  "Gaziantep FK": [
    { n: "Abakar Sylla", p: "CB", a: 23, v: 7.8, r: 77 },
    { n: "Kacper Kozlowski", p: "CAM", a: 22, v: 4.5, r: 74 },
    { n: "Drissa Camara", p: "CM", a: 23, v: 2.3, r: 70 },
    { n: "Deian Sorescu", p: "RB", a: 28, v: 1.5, r: 68 }
  ],
  "Genk": [
    { n: "Hyeon-gyu Oh", p: "ST", a: 24, v: 12, r: 79 },
    { n: "Matte Smets", p: "CB", a: 21, v: 9, r: 78 },
    { n: "Bryan Heynen", p: "CM", a: 28, v: 6.8, r: 76 },
    { n: "Jarne Steuckers", p: "RW", a: 23, v: 6.8, r: 76 },
    { n: "Ibrahima Sory Bangoura", p: "CDM", a: 21, v: 4.9, r: 74 },
    { n: "Daan Heymans", p: "CAM", a: 26, v: 3.8, r: 73 },
    { n: "Noah Adedeji-Sternberg", p: "LW", a: 20, v: 3.8, r: 73 },
    { n: "Christiaan Ravych", p: "CB", a: 23, v: 3.6, r: 73 },
    { n: "Junya Ito", p: "RW", a: 32, v: 3, r: 72 },
    { n: "Jusef Erabi", p: "ST", a: 22, v: 3, r: 72 },
    { n: "Robin Mirisola", p: "ST", a: 19, v: 3, r: 72 },
    { n: "Yaimar Medina", p: "LB", a: 21, v: 3, r: 72 },
    { n: "Joris Kayembe", p: "LB", a: 31, v: 2.3, r: 70 },
    { n: "Tobias Lawal", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "Yira Sor", p: "LW", a: 25, v: 2.3, r: 70 },
    { n: "Nikolas Sattlberger", p: "CDM", a: 21, v: 1.8, r: 69 },
    { n: "Hendrik Van Crombrugge", p: "GK", a: 32, v: 1.5, r: 68 },
    { n: "Ken Nkuba", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Lucca Brughmans", p: "GK", a: 17, v: 0.8, r: 64 }
  ],
  "Genoa": [
    { n: "Morten Frendrup", p: "CDM", a: 24, v: 12.2, r: 80 },
    { n: "Hamed Traor\xE9", p: "LW", a: 25, v: 12, r: 79 },
    { n: "Johan V\xE1squez", p: "CB", a: 27, v: 10.5, r: 79 },
    { n: "Leo \xD8stig\xE5rd", p: "CB", a: 26, v: 8.3, r: 77 },
    { n: "Lorenzo Colombo", p: "ST", a: 23, v: 8.3, r: 77 },
    { n: "Tommaso Baldanzi", p: "CAM", a: 22, v: 7.5, r: 77 },
    { n: "Aar\xF3n Mart\xEDn", p: "LB", a: 28, v: 6, r: 76 },
    { n: "Alessandro Marcandalli", p: "CB", a: 23, v: 6, r: 76 },
    { n: "Djibril Sow", p: "CM", a: 28, v: 6, r: 76 },
    { n: "Amorim", p: "CM", a: 20, v: 5.3, r: 75 },
    { n: "Mario Mitaj", p: "LB", a: 22, v: 4.5, r: 74 },
    { n: "Mikael Egill Ellertsson", p: "CM", a: 23, v: 4.5, r: 74 },
    { n: "Justin Bijlow", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Cody Drameh", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "Maxwel Cornet", p: "LW", a: 29, v: 2.3, r: 70 },
    { n: "Stephan El Shaarawy", p: "LW", a: 33, v: 2, r: 69 },
    { n: "Kingsley Ehizibue", p: "RB", a: 30, v: 1.5, r: 68 },
    { n: "Nicolae Stanciu", p: "CAM", a: 32, v: 1.5, r: 68 },
    { n: "Stefano Sabelli", p: "RB", a: 32, v: 1.5, r: 68 }
  ],
  "Gent": [
    { n: "Mathias Delorge", p: "CM", a: 21, v: 7.5, r: 77 },
    { n: "Atsuki Ito", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Hyllarion Goore", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Leonardo Lopes", p: "CM", a: 27, v: 2.9, r: 71 },
    { n: "Abdelkahar Kadri", p: "CAM", a: 25, v: 2.3, r: 70 },
    { n: "Davy Roef", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "L\xE1szl\xF3 B\xE9nes", p: "CM", a: 28, v: 2.3, r: 70 },
    { n: "Matisse Samoise", p: "RM", a: 24, v: 2.3, r: 70 },
    { n: "Max Dean", p: "ST", a: 21, v: 2.1, r: 70 },
    { n: "Momodou Sonko", p: "LW", a: 20, v: 1.5, r: 68 },
    { n: "Tiago Ara\xFAjo", p: "LB", a: 24, v: 1.5, r: 68 }
  ],
  "Gen\xE7lerbirli\u011Fi": [
    { n: "Rafael Lu\xEDs", p: "CDM", a: 20, v: 4.1, r: 73 },
    { n: "Ricardo Velho", p: "GK", a: 27, v: 2.3, r: 70 },
    { n: "Pedro Pereira", p: "RB", a: 27, v: 1.4, r: 68 }
  ],
  "Getafe": [
    { n: "Mauro Arambarri", p: "CM", a: 30, v: 8.3, r: 77 },
    { n: "Mario Mart\xEDn", p: "CDM", a: 21, v: 8.1, r: 77 },
    { n: "Orel Mangala", p: "CDM", a: 27, v: 7.3, r: 77 },
    { n: "Enes \xDCnal", p: "ST", a: 28, v: 6.8, r: 76 },
    { n: "Andr\xE9s Garc\xEDa", p: "RB", a: 22, v: 6, r: 76 },
    { n: "Borja Mayoral", p: "ST", a: 28, v: 6, r: 76 },
    { n: "Abdel Abqar", p: "CB", a: 26, v: 5.7, r: 75 },
    { n: "Mart\xEDn Satriano", p: "ST", a: 24, v: 4.5, r: 74 },
    { n: "Veljko Birmancevic", p: "LW", a: 27, v: 3.8, r: 73 },
    { n: "Iv\xE1n Az\xF3n", p: "ST", a: 23, v: 3, r: 72 },
    { n: "David Soria", p: "GK", a: 32, v: 2.3, r: 70 },
    { n: "Francho Serrano", p: "CM", a: 24, v: 2.3, r: 70 },
    { n: "Ram\xF3n Terrats", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Juanmi", p: "LW", a: 32, v: 2.1, r: 70 },
    { n: "\xC1lex Sancris", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Jiri Letacek", p: "GK", a: 26, v: 1.5, r: 68 },
    { n: "Johan Mojica", p: "LB", a: 33, v: 1.5, r: 68 },
    { n: "Dakonam Djen\xE9", p: "CB", a: 34, v: 1.1, r: 66 }
  ],
  "Gil Vicente": [
    { n: "Andrew", p: "GK", a: 24, v: 6, r: 76 },
    { n: "Lu\xEDs Esteves", p: "CAM", a: 27, v: 3, r: 72 },
    { n: "Marvin Elimbi", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Santi Garc\xEDa", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Z\xE9 Carlos", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Luc\xE3o", p: "GK", a: 24, v: 0.8, r: 64 },
    { n: "Weverson", p: "LB", a: 25, v: 0.8, r: 64 }
  ],
  "Girona": [
    { n: "Vladyslav Vanat", p: "ST", a: 23, v: 12, r: 79 },
    { n: "Y\xE1ser Asprilla", p: "RW", a: 22, v: 11.3, r: 79 },
    { n: "Bryan Gil", p: "LW", a: 24, v: 9.8, r: 78 },
    { n: "Abel Ruiz", p: "ST", a: 25, v: 4.3, r: 74 },
    { n: "Fran Beltr\xE1n", p: "CM", a: 26, v: 3.8, r: 73 },
    { n: "Donny van de Beek", p: "CM", a: 28, v: 3.6, r: 73 },
    { n: "\xC1lex Moreno", p: "LB", a: 32, v: 3, r: 72 },
    { n: "Carles P\xE9rez", p: "RW", a: 27, v: 2.1, r: 70 },
    { n: "Paulo Gazzaniga", p: "GK", a: 33, v: 1.5, r: 68 },
    { n: "Portu", p: "RW", a: 33, v: 1.5, r: 68 }
  ],
  "Gladbach": [
    { n: "Nicolas K\xFChn", p: "RW", a: 26, v: 9.8, r: 78 },
    { n: "Franck Honorat", p: "RW", a: 29, v: 8.3, r: 77 },
    { n: "Ko Itakura", p: "CB", a: 28, v: 8.3, r: 77 },
    { n: "Tim Kleindienst", p: "ST", a: 30, v: 8.3, r: 77 },
    { n: "Wael Mohya", p: "CAM", a: 17, v: 8.3, r: 77 },
    { n: "Robin Hack", p: "LW", a: 27, v: 7.5, r: 77 },
    { n: "Joe Scally", p: "RB", a: 23, v: 6, r: 76 },
    { n: "Lukas Ullrich", p: "LB", a: 21, v: 6, r: 76 },
    { n: "Hugo Bolin", p: "LW", a: 22, v: 4.5, r: 74 },
    { n: "Jens Castrop", p: "CM", a: 22, v: 4.5, r: 74 },
    { n: "Moritz Nicolas", p: "GK", a: 28, v: 4.5, r: 74 },
    { n: "Isac Lidberg", p: "ST", a: 27, v: 3.8, r: 73 },
    { n: "Kevin Diks", p: "CB", a: 29, v: 3.8, r: 73 },
    { n: "Shuto Machino", p: "ST", a: 26, v: 3.8, r: 73 },
    { n: "David Herold", p: "LB", a: 22, v: 3, r: 72 },
    { n: "Florian Neuhaus", p: "CM", a: 28, v: 3, r: 72 },
    { n: "Enzo Leopold", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Kevin St\xF6ger", p: "CAM", a: 32, v: 1.5, r: 68 }
  ],
  "Go Ahead Eagles": [
    { n: "Jakob Breum", p: "CAM", a: 22, v: 3.8, r: 73 },
    { n: "Jari De Busser", p: "GK", a: 26, v: 2.3, r: 70 },
    { n: "Mathis Suray", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "Dean James", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Mats Deijl", p: "RB", a: 28, v: 1.5, r: 68 }
  ],
  "Gorica": [],
  "Granada": [],
  "Grasshopper": [
    { n: "Justin Hammel", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Noah Persson", p: "LB", a: 22, v: 1.4, r: 68 },
    { n: "Filipe de Carvalho", p: "LM", a: 20, v: 0.8, r: 64 },
    { n: "Samuel Krasniqi", p: "LM", a: 20, v: 0.8, r: 64 },
    { n: "Samuel Marques", p: "RM", a: 20, v: 0.8, r: 64 },
    { n: "Simone Stroscio", p: "LM", a: 22, v: 0.7, r: 64 }
  ],
  "Grazer AK": [
    { n: "Dominik Frieser", p: "RM", a: 32, v: 0.8, r: 64 },
    { n: "Thomas Schiestl", p: "LM", a: 21, v: 0.8, r: 64 }
  ],
  "Grenoble": [],
  "Greuther F\xFCrth": [
    { n: "Florian Hellstern", p: "GK", a: 18, v: 2.3, r: 70 },
    { n: "Aaron Keller", p: "LM", a: 21, v: 1.5, r: 68 },
    { n: "Felix Klaus", p: "RM", a: 33, v: 0.8, r: 64 },
    { n: "Lukas Reich", p: "RB", a: 19, v: 0.8, r: 64 },
    { n: "Denis Pfaffenrot", p: "RM", a: 20, v: 0.7, r: 64 }
  ],
  "Groningen": [
    { n: "Jacob Ondrejka", p: "LW", a: 23, v: 5.3, r: 75 },
    { n: "Dies Janse", p: "CB", a: 19, v: 3.8, r: 73 },
    { n: "Tygo Land", p: "CDM", a: 19, v: 3.2, r: 72 },
    { n: "Etienne Vaessen", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Younes Taha", p: "RW", a: 23, v: 2.3, r: 70 },
    { n: "Hans Hateboer", p: "RB", a: 31, v: 1.5, r: 68 }
  ],
  "Gr\xEAmio": [
    { n: "Gabriel Mec", p: "CAM", a: 17, v: 9.8, r: 78 },
    { n: "Tet\xEA", p: "RW", a: 25, v: 9, r: 78 },
    { n: "Carlos Vin\xEDcius", p: "ST", a: 30, v: 6, r: 76 },
    { n: "Erick Noriega", p: "CDM", a: 24, v: 4.1, r: 73 },
    { n: "Francis Amuzu", p: "LW", a: 26, v: 3.6, r: 73 },
    { n: "Math\xEDas Villasanti", p: "CDM", a: 28, v: 3.2, r: 72 },
    { n: "Arthur Melo", p: "CM", a: 29, v: 3, r: 72 },
    { n: "Franco Cristaldo", p: "CAM", a: 29, v: 3, r: 72 },
    { n: "Marlon", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Miguel Monsalve", p: "CAM", a: 21, v: 3, r: 72 },
    { n: "Wagner Leonardo", p: "CB", a: 26, v: 3, r: 72 },
    { n: "Matheus Nascimento", p: "ST", a: 21, v: 2.9, r: 71 },
    { n: "Andr\xE9 Henrique", p: "ST", a: 24, v: 2.3, r: 70 },
    { n: "Danilo Barbosa", p: "CDM", a: 29, v: 1.6, r: 68 },
    { n: "Caio Paulista", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Cristian Pav\xF3n", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Gabriel Grando", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Weverton", p: "GK", a: 38, v: 1.4, r: 68 }
  ],
  "Guadalajara": [
    { n: "Armando Gonz\xE1lez", p: "ST", a: 22, v: 12, r: 79 },
    { n: "Brian Guti\xE9rrez", p: "CAM", a: 22, v: 6.8, r: 76 },
    { n: "Roberto Alvarado", p: "RW", a: 27, v: 6, r: 76 },
    { n: "Efra\xEDn \xC1lvarez", p: "CAM", a: 23, v: 5.3, r: 75 },
    { n: "Bryan Gonz\xE1lez", p: "LB", a: 22, v: 4.5, r: 74 },
    { n: "Ra\xFAl Rangel", p: "GK", a: 25, v: 4.5, r: 74 },
    { n: "Richard Ledezma", p: "RB", a: 25, v: 4.5, r: 74 },
    { n: "Jos\xE9 Castillo", p: "CB", a: 24, v: 3, r: 72 },
    { n: "Santiago Sandoval", p: "CAM", a: 18, v: 3, r: 72 },
    { n: "Hugo Camberos", p: "RW", a: 18, v: 2.1, r: 70 },
    { n: "Yael Padilla", p: "LW", a: 20, v: 1.5, r: 68 }
  ],
  "Guingamp": [
    { n: "Amine Hemia", p: "CAM", a: 27, v: 1.5, r: 68 }
  ],
  "G\xF6ztepe": [
    { n: "Juan", p: "ST", a: 23, v: 6.8, r: 76 },
    { n: "Junior Olaitan", p: "CAM", a: 23, v: 6, r: 76 },
    { n: "Novatus Miroshi", p: "CDM", a: 23, v: 4.1, r: 73 },
    { n: "Arda Okan Kurtulan", p: "RM", a: 23, v: 3.8, r: 73 },
    { n: "Janderson", p: "ST", a: 26, v: 3.8, r: 73 },
    { n: "Malcom Bokele", p: "CB", a: 25, v: 3.8, r: 73 },
    { n: "Taha Alt\u0131karde\u015F", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Amin Cherni", p: "LM", a: 24, v: 2.3, r: 70 },
    { n: "Mateusz Lis", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Alexis Antunes", p: "CAM", a: 25, v: 2.1, r: 70 },
    { n: "Og\xFCn Bayrak", p: "RM", a: 27, v: 0.8, r: 64 }
  ],
  "Hajduk Split": [
    { n: "Rokas Pukstas", p: "CAM", a: 21, v: 3.8, r: 73 },
    { n: "Marko Livaja", p: "ST", a: 32, v: 3.6, r: 73 },
    { n: "Bruno Durdov", p: "RW", a: 18, v: 2.3, r: 70 },
    { n: "Simun Hrgovic", p: "LB", a: 21, v: 2.3, r: 70 },
    { n: "Marin Soticek", p: "RW", a: 21, v: 2.1, r: 70 },
    { n: "Abdoulie Sanyang", p: "RW", a: 26, v: 1.5, r: 68 },
    { n: "Ivica Ivusic", p: "GK", a: 30, v: 1.5, r: 68 },
    { n: "Michele Sego", p: "LW", a: 25, v: 1.5, r: 68 },
    { n: "Leander Dendoncker", p: "CDM", a: 30, v: 1.4, r: 68 }
  ],
  "Hamburg": [
    { n: "F\xE1bio Vieira", p: "CAM", a: 25, v: 14.3, r: 80 },
    { n: "Zakaria El Ouahdi", p: "RB", a: 24, v: 12, r: 79 },
    { n: "Albert Sambi Lokonga", p: "CM", a: 26, v: 8.3, r: 77 },
    { n: "David M\xF8ller Wolfe", p: "LB", a: 23, v: 8.3, r: 77 },
    { n: "Terem Moffi", p: "ST", a: 26, v: 8.3, r: 77 },
    { n: "Bilal Nadir", p: "CM", a: 22, v: 7.5, r: 77 },
    { n: "Nicolai Remberg", p: "CDM", a: 25, v: 7.3, r: 77 },
    { n: "Sebastiaan Bornauw", p: "CB", a: 26, v: 6.8, r: 76 },
    { n: "Albert Gr\xF8nb\xE6k", p: "CAM", a: 24, v: 3.8, r: 73 },
    { n: "Alexander R\xF8ssing-Lelesiit", p: "LW", a: 18, v: 3.8, r: 73 },
    { n: "Martin Adeline", p: "CAM", a: 22, v: 3.8, r: 73 },
    { n: "Miro Muheim", p: "LB", a: 27, v: 3.8, r: 73 },
    { n: "Patson Daka", p: "ST", a: 27, v: 3.8, r: 73 },
    { n: "Yussuf Poulsen", p: "ST", a: 31, v: 3.6, r: 73 },
    { n: "Kofi Amoako", p: "CDM", a: 20, v: 3.2, r: 72 },
    { n: "Giorgi Gocholeishvili", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "Sander Tangvik", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Immanuel Pherai", p: "CAM", a: 24, v: 1.4, r: 68 },
    { n: "Daniel Heuer Fernandes", p: "GK", a: 33, v: 0.8, r: 64 }
  ],
  "Hannover 96": [
    { n: "Benjamin K\xE4llman", p: "ST", a: 27, v: 3, r: 72 },
    { n: "Daisuke Yokota", p: "RW", a: 25, v: 1.5, r: 68 },
    { n: "Hayate Matsuda", p: "RM", a: 22, v: 1.5, r: 68 },
    { n: "Husseyn Chakroun", p: "LW", a: 21, v: 1.5, r: 68 },
    { n: "Emir Sahiti", p: "RW", a: 27, v: 1.4, r: 68 },
    { n: "Kolja Oudenne", p: "LM", a: 22, v: 0.8, r: 64 }
  ],
  "Hartberg": [
    { n: "Dominik Prokop", p: "LM", a: 26, v: 0.8, r: 64 },
    { n: "J\xFCrgen Heil", p: "RM", a: 28, v: 0.8, r: 64 },
    { n: "Maximilian Fillafer", p: "RM", a: 21, v: 0.8, r: 64 },
    { n: "Paul Bratschko", p: "RM", a: 20, v: 0.8, r: 64 },
    { n: "Tobias Kainz", p: "LM", a: 31, v: 0.8, r: 64 }
  ],
  "Hearts": [
    { n: "Cl\xE1udio Braga", p: "ST", a: 26, v: 4.5, r: 74 },
    { n: "Alexandros Kyziridis", p: "LW", a: 25, v: 3, r: 72 }
  ],
  "Heerenveen": [
    { n: "Mees Hilgers", p: "CB", a: 24, v: 5.7, r: 75 },
    { n: "Jacob Trenskow", p: "RW", a: 25, v: 5.3, r: 75 },
    { n: "Oliver Braude", p: "RB", a: 21, v: 3.8, r: 73 },
    { n: "Marcus Linday", p: "CM", a: 22, v: 3, r: 72 },
    { n: "Ringo Meerveld", p: "CAM", a: 23, v: 3, r: 72 },
    { n: "Dirk Proper", p: "CDM", a: 23, v: 2, r: 70 },
    { n: "Bernt Klaverboer", p: "GK", a: 20, v: 1.5, r: 68 },
    { n: "Luuk Brouwers", p: "CAM", a: 27, v: 1.5, r: 68 },
    { n: "Marko Farji", p: "LW", a: 21, v: 1.5, r: 68 },
    { n: "Vasilios Zagaritis", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Levi Smans", p: "CAM", a: 22, v: 1.4, r: 68 }
  ],
  "Heidenheim": [
    { n: "Alessandro Vogt", p: "ST", a: 20, v: 6, r: 76 },
    { n: "Jan Sch\xF6ppner", p: "CM", a: 26, v: 3, r: 72 },
    { n: "Omar Traor\xE9", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Adrian Beck", p: "CAM", a: 28, v: 1.5, r: 68 },
    { n: "Christian Conteh", p: "RW", a: 26, v: 1.5, r: 68 },
    { n: "Mathias Honsak", p: "LW", a: 29, v: 1.5, r: 68 },
    { n: "Michael Heule", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Sirlord Conteh", p: "RW", a: 29, v: 1.5, r: 68 },
    { n: "Jonas F\xF6hrenbach", p: "LB", a: 29, v: 1.4, r: 68 },
    { n: "Leart Pa\xE7arada", p: "LB", a: 31, v: 1.4, r: 68 }
  ],
  "Hertha BSC": [
    { n: "Tjark Ernst", p: "GK", a: 22, v: 3, r: 72 },
    { n: "Josip Brekalo", p: "LW", a: 27, v: 2.9, r: 71 },
    { n: "Farid Alfa-Ruprecht", p: "RW", a: 19, v: 2.3, r: 70 },
    { n: "Michal Karbownik", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Micha\u0142 Karbownik", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Mads Pedersen", p: "LB", a: 29, v: 1.4, r: 68 }
  ],
  "Hibernian": [
    { n: "Thibault Klidj\xE9", p: "ST", a: 24, v: 2.9, r: 71 },
    { n: "Miguel Chaiwa", p: "CDM", a: 21, v: 2.4, r: 71 },
    { n: "Felix Passlack", p: "RB", a: 27, v: 2.1, r: 70 },
    { n: "Nicky Cadden", p: "LM", a: 29, v: 0.7, r: 64 }
  ],
  "Hoffenheim": [
    { n: "Leon Avdullahu", p: "CDM", a: 21, v: 24.3, r: 83 },
    { n: "Fisnik Asllani", p: "ST", a: 23, v: 24, r: 83 },
    { n: "Nathan De Cat", p: "CM", a: 17, v: 20.3, r: 82 },
    { n: "Albian Hajdari", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Patrick Wimmer", p: "RW", a: 24, v: 12, r: 79 },
    { n: "Tim Lemperle", p: "ST", a: 23, v: 12, r: 79 },
    { n: "Adam Hlozek", p: "ST", a: 23, v: 9.8, r: 78 },
    { n: "Mats Rots", p: "LB", a: 19, v: 8.3, r: 77 },
    { n: "Ozan Kabak", p: "CB", a: 25, v: 8.3, r: 77 },
    { n: "Robin Hranac", p: "CB", a: 25, v: 8.3, r: 77 },
    { n: "Adam Daghim", p: "RW", a: 20, v: 6, r: 76 },
    { n: "Koki Machida", p: "CB", a: 28, v: 6, r: 76 },
    { n: "Max Moerstedt", p: "ST", a: 19, v: 6, r: 76 },
    { n: "Valentin Gendrey", p: "RB", a: 25, v: 6, r: 76 },
    { n: "Bernardo", p: "LB", a: 30, v: 3.8, r: 73 },
    { n: "Robert Skov", p: "LM", a: 27, v: 3.8, r: 73 },
    { n: "David Jur\xE1sek", p: "LB", a: 25, v: 3.6, r: 73 },
    { n: "Arthur Chaves", p: "CB", a: 24, v: 3, r: 72 },
    { n: "Andrej Kramaric", p: "CAM", a: 34, v: 2.3, r: 70 },
    { n: "Bambas\xE9 Cont\xE9", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Oliver Baumann", p: "GK", a: 35, v: 2.3, r: 70 },
    { n: "Vladim\xEDr Coufal", p: "RB", a: 33, v: 2.3, r: 70 },
    { n: "Pavel Kaderabek", p: "RM", a: 33, v: 1.4, r: 68 }
  ],
  "Holstein Kiel": [
    { n: "Phil Harres", p: "ST", a: 23, v: 3.6, r: 73 },
    { n: "John Tolkin", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Kasper Davidsen", p: "CDM", a: 20, v: 2, r: 70 },
    { n: "Taisei Abe", p: "CDM", a: 21, v: 2, r: 70 },
    { n: "Jonas Therkelsen", p: "CAM", a: 22, v: 1.5, r: 68 },
    { n: "Lasse Rosenboom", p: "RB", a: 23, v: 1.4, r: 68 },
    { n: "Jonas Krumrey", p: "GK", a: 22, v: 0.8, r: 64 },
    { n: "Niklas Niehoff", p: "RM", a: 21, v: 0.8, r: 64 },
    { n: "Marvin Schulz", p: "RM", a: 30, v: 0.7, r: 64 }
  ],
  "Houston Dynamo": [
    { n: "Lyle Foster", p: "ST", a: 25, v: 8.3, r: 77 },
    { n: "Mateusz Bogusz", p: "CAM", a: 24, v: 4.5, r: 74 },
    { n: "Jack McGlynn", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Amine Bassi", p: "CAM", a: 28, v: 3.6, r: 73 },
    { n: "Ondrej Lingr", p: "CAM", a: 27, v: 3, r: 72 },
    { n: "Duncan McGuire", p: "ST", a: 24, v: 2.9, r: 71 },
    { n: "Guilherme", p: "LW", a: 30, v: 2.3, r: 70 },
    { n: "Lawrence Ennali", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Duane Holmes", p: "RM", a: 31, v: 0.8, r: 64 }
  ],
  "Hull City": [
    { n: "Christos Mouzakitis", p: "CM", a: 19, v: 20.3, r: 82 },
    { n: "Robinio Vaz", p: "ST", a: 18, v: 14.3, r: 80 },
    { n: "Brooke Norton-Cuffy", p: "RB", a: 21, v: 12.8, r: 80 },
    { n: "Konstantinos Tzolakis", p: "GK", a: 23, v: 12, r: 79 },
    { n: "Mohamed-Ali Cho", p: "RW", a: 21, v: 12, r: 79 },
    { n: "Tim Iroegbunam", p: "CM", a: 22, v: 12, r: 79 },
    { n: "Ilyas Ansah", p: "ST", a: 21, v: 9.8, r: 78 },
    { n: "Joe Gelhardt", p: "ST", a: 23, v: 8.3, r: 77 },
    { n: "Ryan Giles", p: "LB", a: 25, v: 8.3, r: 77 },
    { n: "Sorba Thomas", p: "LW", a: 26, v: 8.3, r: 77 },
    { n: "Hidemasa Morita", p: "CM", a: 30, v: 7.5, r: 77 },
    { n: "Charlie Hughes", p: "CB", a: 22, v: 6.8, r: 76 },
    { n: "Jens Hjert\xF8-Dahl", p: "CM", a: 20, v: 6, r: 76 },
    { n: "Lucas Gourna-Douath", p: "CDM", a: 22, v: 4.9, r: 74 },
    { n: "Nobel Mendy", p: "CB", a: 21, v: 4.5, r: 74 },
    { n: "Joel Ndala", p: "LW", a: 19, v: 3, r: 72 },
    { n: "Matt Targett", p: "LB", a: 30, v: 3, r: 72 },
    { n: "Mohamed Belloumi", p: "RW", a: 23, v: 3, r: 72 },
    { n: "Oli McBurnie", p: "ST", a: 29, v: 3, r: 72 },
    { n: "Elliot Stroud", p: "LM", a: 23, v: 2.3, r: 70 },
    { n: "Abd\xFClkadir \xD6m\xFCr", p: "RM", a: 26, v: 1.5, r: 68 },
    { n: "Jack Butland", p: "GK", a: 32, v: 1.5, r: 68 },
    { n: "Lewie Coyle", p: "RB", a: 30, v: 0.8, r: 64 }
  ],
  "Inter Miami": [
    { n: "Rodrigo De Paul", p: "CM", a: 31, v: 12, r: 79 },
    { n: "Germ\xE1n Berterame", p: "ST", a: 27, v: 9.8, r: 78 },
    { n: "Lionel Messi", p: "RW", a: 39, v: 9.6, r: 78 },
    { n: "Casemiro", p: "CDM", a: 34, v: 4.9, r: 74 },
    { n: "Tadeo Allende", p: "RW", a: 26, v: 3.8, r: 73 },
    { n: "Telasco Segovia", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Baltasar Rodr\xEDguez", p: "CAM", a: 22, v: 3.6, r: 73 },
    { n: "Dayne St. Clair", p: "GK", a: 28, v: 3, r: 72 },
    { n: "Micael", p: "CB", a: 25, v: 3, r: 72 },
    { n: "Sergio Reguil\xF3n", p: "LB", a: 29, v: 3, r: 72 },
    { n: "David Ayala", p: "CDM", a: 23, v: 2, r: 70 },
    { n: "Yannick Bright", p: "CDM", a: 24, v: 1.6, r: 68 },
    { n: "Facundo Mura", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Noah Allen", p: "LB", a: 21, v: 1.5, r: 68 },
    { n: "Marcelo Weigandt", p: "RB", a: 25, v: 1.4, r: 68 },
    { n: "Preston Plambeck", p: "LM", a: 20, v: 0.8, r: 64 }
  ],
  "Inter Milan": [
    { n: "Lautaro Mart\xEDnez", p: "ST", a: 28, v: 69, r: 89 },
    { n: "Alessandro Bastoni", p: "CB", a: 26, v: 57, r: 88 },
    { n: "Federico Dimarco", p: "LB", a: 28, v: 40.5, r: 86 },
    { n: "Marcus Thuram", p: "ST", a: 28, v: 40.5, r: 86 },
    { n: "Nicol\xF2 Barella", p: "CM", a: 28, v: 40.5, r: 86 },
    { n: "Pio Esposito", p: "ST", a: 20, v: 36.8, r: 86 },
    { n: "Yann Bisseck", p: "CB", a: 25, v: 32.3, r: 85 },
    { n: "Ange-Yoan Bonny", p: "ST", a: 22, v: 28.5, r: 84 },
    { n: "Curtis Jones", p: "CM", a: 24, v: 28.5, r: 84 },
    { n: "Aleksandar Stankovi\u0107", p: "CDM", a: 20, v: 25.9, r: 84 },
    { n: "Djed Spence", p: "LB", a: 25, v: 24, r: 83 },
    { n: "Petar Su\u010Di\u0107", p: "CM", a: 22, v: 24, r: 83 },
    { n: "Carlos Augusto", p: "LB", a: 26, v: 21, r: 83 },
    { n: "Luis Henrique", p: "RM", a: 24, v: 18.8, r: 82 },
    { n: "Andy Diouf", p: "CM", a: 22, v: 14.3, r: 80 },
    { n: "Manuel Akanji", p: "CB", a: 30, v: 14.3, r: 80 },
    { n: "Hakan \xC7alhano\u011Flu", p: "CDM", a: 32, v: 13, r: 80 },
    { n: "Benjamin Pavard", p: "CB", a: 29, v: 12, r: 79 },
    { n: "John Stones", p: "CB", a: 31, v: 12, r: 79 },
    { n: "Valent\xEDn Carboni", p: "CAM", a: 20, v: 9.3, r: 78 },
    { n: "Piotr Zielinski", p: "CM", a: 31, v: 8.3, r: 77 },
    { n: "Josep Mart\xEDnez", p: "GK", a: 27, v: 6, r: 76 },
    { n: "Henrikh Mkhitaryan", p: "CM", a: 36, v: 3, r: 72 },
    { n: "Ivan Provedel", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Yann Sommer", p: "GK", a: 37, v: 2.3, r: 70 },
    { n: "Matteo Darmian", p: "RB", a: 36, v: 1.5, r: 68 }
  ],
  "Internacional": [
    { n: "Alexandro Bernabei", p: "LB", a: 25, v: 4.5, r: 74 },
    { n: "Bruno Gomes", p: "RB", a: 24, v: 3.8, r: 73 },
    { n: "Victor Gabriel", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "Anthoni", p: "GK", a: 23, v: 3, r: 72 },
    { n: "Johan Carbonero", p: "LW", a: 26, v: 3, r: 72 },
    { n: "Rafael Borr\xE9", p: "ST", a: 30, v: 3, r: 72 },
    { n: "Antonio Sanabria", p: "ST", a: 29, v: 2.9, r: 71 },
    { n: "Rodrigo Villagra", p: "CDM", a: 24, v: 2.8, r: 71 },
    { n: "Alan Patrick", p: "CAM", a: 34, v: 2.3, r: 70 },
    { n: "Braian Aguirre", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Matheus Bahia", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Thiago Maia", p: "CDM", a: 28, v: 2, r: 70 },
    { n: "Bruno Tabata", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Sergio Rochet", p: "GK", a: 32, v: 1.5, r: 68 },
    { n: "Nathan", p: "RB", a: 24, v: 1.4, r: 68 },
    { n: "Ivan", p: "GK", a: 28, v: 0.8, r: 64 }
  ],
  "Ipswich Town": [
    { n: "Exequiel Palacios", p: "CM", a: 27, v: 24, r: 83 },
    { n: "Abdul Fatawu", p: "RW", a: 21, v: 19.5, r: 82 },
    { n: "Julio Enciso", p: "CAM", a: 21, v: 17.1, r: 81 },
    { n: "Leif Davis", p: "LB", a: 26, v: 16.5, r: 81 },
    { n: "Jack Clarke", p: "LW", a: 25, v: 14.3, r: 80 },
    { n: "Jaden Philogene", p: "LW", a: 23, v: 14.3, r: 80 },
    { n: "Sindre Walle Egeli", p: "RW", a: 19, v: 14.3, r: 80 },
    { n: "Florentino", p: "CDM", a: 26, v: 13, r: 80 },
    { n: "Abdoul Ouattara", p: "RB", a: 20, v: 12, r: 79 },
    { n: "Dara O'Shea", p: "CB", a: 26, v: 12, r: 79 },
    { n: "Anis Mehmeti", p: "CAM", a: 24, v: 11.3, r: 79 },
    { n: "Jacob Greaves", p: "CB", a: 25, v: 11.3, r: 79 },
    { n: "Daizen Maeda", p: "LW", a: 28, v: 10.5, r: 79 },
    { n: "Sa\u0161a Luki\u0107", p: "CM", a: 29, v: 9.8, r: 78 },
    { n: "Zian Flemming", p: "ST", a: 27, v: 9.8, r: 78 },
    { n: "Azor Matusiwa", p: "CDM", a: 27, v: 9.7, r: 78 },
    { n: "Issa Diop", p: "CB", a: 28, v: 8.3, r: 77 },
    { n: "Kasey McAteer", p: "RM", a: 24, v: 8.3, r: 77 },
    { n: "Marcelino N\xFA\xF1ez", p: "CM", a: 25, v: 8.3, r: 77 },
    { n: "Ben Johnson", p: "RB", a: 25, v: 6, r: 76 },
    { n: "Kjell Scherpen", p: "GK", a: 25, v: 6, r: 76 },
    { n: "Chuba Akpom", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Emersonn", p: "ST", a: 21, v: 3.8, r: 73 },
    { n: "Darnell Furlong", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Jack Taylor", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Christian Walton", p: "GK", a: 30, v: 0.8, r: 64 }
  ],
  "Iraklis": [],
  "Istra 1961": [],
  "Juve Stabia": [],
  "Juventus": [
    { n: "Kenan Y\u0131ld\u0131z", p: "LW", a: 20, v: 60.8, r: 89 },
    { n: "Nick Woltemade", p: "ST", a: 23, v: 52.5, r: 88 },
    { n: "Kh\xE9phren Thuram", p: "CM", a: 24, v: 32.3, r: 85 },
    { n: "Bremer", p: "CB", a: 28, v: 28.5, r: 84 },
    { n: "Pape Matar Sarr", p: "CM", a: 23, v: 26.3, r: 84 },
    { n: "Pierre Kalulu", p: "CB", a: 25, v: 26.3, r: 84 },
    { n: "Andrea Cambiaso", p: "LB", a: 25, v: 24, r: 83 },
    { n: "Francisco Concei\xE7\xE3o", p: "RW", a: 23, v: 24, r: 83 },
    { n: "Weston McKennie", p: "CM", a: 27, v: 24, r: 83 },
    { n: "Jhon Lucum\xED", p: "CB", a: 27, v: 20.3, r: 82 },
    { n: "Manuel Locatelli", p: "CDM", a: 28, v: 20.3, r: 82 },
    { n: "Nico Gonz\xE1lez", p: "LW", a: 27, v: 19.5, r: 82 },
    { n: "Guglielmo Vicario", p: "GK", a: 29, v: 18.8, r: 82 },
    { n: "Randal Kolo Muani", p: "ST", a: 27, v: 18, r: 82 },
    { n: "Douglas Luiz", p: "CM", a: 27, v: 16.5, r: 81 },
    { n: "Lloyd Kelly", p: "CB", a: 27, v: 16.5, r: 81 },
    { n: "Federico Gatti", p: "CB", a: 27, v: 12.8, r: 80 },
    { n: "Kerim Alajbegovic", p: "LW", a: 18, v: 12, r: 79 },
    { n: "Edon Zhegrova", p: "RW", a: 26, v: 11.3, r: 79 },
    { n: "Teun Koopmeiners", p: "CDM", a: 28, v: 11.3, r: 79 },
    { n: "Jeff Ekhator", p: "ST", a: 19, v: 10.5, r: 79 },
    { n: "Samuel Iling-Junior", p: "LM", a: 20, v: 10.5, r: 79 },
    { n: "Kamil Grabara", p: "GK", a: 26, v: 9.8, r: 78 },
    { n: "Filip Kosti\u0107", p: "LM", a: 31, v: 7.5, r: 77 },
    { n: "Juan Cabal", p: "LB", a: 24, v: 7.5, r: 77 },
    { n: "J\xE9r\xE9mie Boga", p: "LW", a: 28, v: 6.8, r: 76 },
    { n: "Arkadiusz Milik", p: "ST", a: 32, v: 1.2, r: 67 },
    { n: "Filippo Pagnucco", p: "LM", a: 19, v: 0.7, r: 64 }
  ],
  "Kaiserslautern": [
    { n: "Milos Lukovic", p: "ST", a: 20, v: 3.8, r: 73 },
    { n: "Naatan Skytt\xE4", p: "CAM", a: 23, v: 3.8, r: 73 },
    { n: "Mergim Berisha", p: "ST", a: 27, v: 3.6, r: 73 },
    { n: "Mika Haas", p: "LB", a: 20, v: 2.3, r: 70 },
    { n: "Paul Joly", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Frank Ronstadt", p: "LM", a: 26, v: 0.8, r: 64 },
    { n: "Julian Krahl", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "Kalamata": [],
  "Karlsruhe": [
    { n: "Rafael Pinto Pedrosa", p: "RB", a: 18, v: 3.8, r: 73 },
    { n: "Louey Ben Farhat", p: "CF", a: 19, v: 2.1, r: 70 },
    { n: "Deniz Ofli", p: "LB", a: 18, v: 1.5, r: 68 },
    { n: "Hans Christian Bernat", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "Kas\u0131mpa\u015Fa": [
    { n: "Adrian Benedyczak", p: "ST", a: 25, v: 3.6, r: 73 },
    { n: "\u0130rfan Can Kahveci", p: "RW", a: 30, v: 3, r: 72 },
    { n: "Andri Fannar Baldursson", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Godfried Frimpong", p: "LB", a: 26, v: 1.5, r: 68 },
    { n: "Kerem Demirbay", p: "CM", a: 33, v: 0.8, r: 65 }
  ],
  "Kifisia": [],
  "Kilmarnock": [
    { n: "Calvin Ramsay", p: "RB", a: 22, v: 2.1, r: 70 },
    { n: "Fraser Murray", p: "LM", a: 24, v: 0.8, r: 64 },
    { n: "Gary Mackay-Steven", p: "LM", a: 33, v: 0.8, r: 64 }
  ],
  "Kocaelispor": [
    { n: "Berkan Kutlu", p: "CM", a: 27, v: 2.9, r: 71 },
    { n: "Massadio Ha\xEFdara", p: "LB", a: 33, v: 1.4, r: 68 }
  ],
  "Konyaspor": [
    { n: "Deniz Erta\u015F", p: "GK", a: 20, v: 3, r: 72 },
    { n: "Enis Destan", p: "ST", a: 23, v: 2.9, r: 71 },
    { n: "Jean-Luc Domp\xE9", p: "LW", a: 30, v: 2.9, r: 71 },
    { n: "Arthur Masuaku", p: "LB", a: 32, v: 2.3, r: 70 },
    { n: "Diogo Gon\xE7alves", p: "LW", a: 28, v: 2.3, r: 70 },
    { n: "Enis Bardhi", p: "CAM", a: 30, v: 2.3, r: 70 },
    { n: "Ebrima Colley", p: "LW", a: 25, v: 1.4, r: 68 }
  ],
  "Kortrijk": [
    { n: "Jamie Roche", p: "CDM", a: 24, v: 2.8, r: 71 },
    { n: "Dion De Neve", p: "LM", a: 22, v: 0.8, r: 64 }
  ],
  "K\xF6ln": [
    { n: "Said El Mala", p: "LW", a: 19, v: 28.5, r: 84 },
    { n: "Mikey Moore", p: "LW", a: 18, v: 14.3, r: 80 },
    { n: "Thijs Dallinga", p: "ST", a: 25, v: 9.8, r: 78 },
    { n: "\xCDsak J\xF3hannesson", p: "CM", a: 22, v: 6.8, r: 76 },
    { n: "Ragnar Ache", p: "ST", a: 27, v: 6.8, r: 76 },
    { n: "Rav van den Berg", p: "CB", a: 21, v: 6.8, r: 76 },
    { n: "Jahmai Simpson-Pusey", p: "CB", a: 20, v: 4.5, r: 74 },
    { n: "Sebastian Sebulonsen", p: "RB", a: 25, v: 4.5, r: 74 },
    { n: "Ellyes Skhiri", p: "CDM", a: 30, v: 4.1, r: 73 },
    { n: "Jan Thielmann", p: "RW", a: 23, v: 3.8, r: 73 },
    { n: "Tom Krau\xDF", p: "CDM", a: 24, v: 3.6, r: 73 },
    { n: "Borna Sosa", p: "LB", a: 27, v: 3, r: 72 },
    { n: "Gideon Mensah", p: "LB", a: 27, v: 3, r: 72 },
    { n: "Kristoffer Lund", p: "LB", a: 23, v: 3, r: 72 },
    { n: "Alessio Castro-Montes", p: "RM", a: 28, v: 2.3, r: 70 },
    { n: "Linton Maina", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Marvin Schw\xE4be", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Marius B\xFClter", p: "LW", a: 32, v: 1.5, r: 68 }
  ],
  "LA Galaxy": [
    { n: "Riqui Puig", p: "CM", a: 26, v: 9.8, r: 78 },
    { n: "Joseph Paintsil", p: "LW", a: 27, v: 4.5, r: 74 },
    { n: "Lucas Sanabria", p: "CDM", a: 22, v: 2.8, r: 71 },
    { n: "Marco Reus", p: "CAM", a: 36, v: 2.1, r: 70 },
    { n: "Juli\xE1n Aude", p: "LB", a: 22, v: 1.5, r: 68 }
  ],
  "LAFC": [
    { n: "Heung-min Son", p: "LW", a: 33, v: 13.5, r: 80 },
    { n: "Denis Bouanga", p: "LW", a: 31, v: 6.8, r: 76 },
    { n: "Armindo Sieb", p: "CF", a: 22, v: 2.9, r: 71 },
    { n: "Amin Boudri", p: "CAM", a: 21, v: 2.3, r: 70 },
    { n: "Jacob Shaffelburg", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Sergi Palencia", p: "RB", a: 29, v: 2.3, r: 70 },
    { n: "Timothy Tillman", p: "CM", a: 26, v: 2.3, r: 70 },
    { n: "Artem Smolyakov", p: "LB", a: 22, v: 1.5, r: 68 },
    { n: "Hugo Lloris", p: "GK", a: 39, v: 0.8, r: 65 }
  ],
  "LASK": [
    { n: "Melayro Bogarde", p: "CDM", a: 23, v: 4.1, r: 73 },
    { n: "Sasa Kalajdzic", p: "ST", a: 28, v: 2.9, r: 71 },
    { n: "George Bello", p: "LB", a: 23, v: 1.5, r: 68 },
    { n: "Kasper J\xF8rgensen", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Lukas Jungwirth", p: "GK", a: 21, v: 1.5, r: 68 },
    { n: "Krystof Danek", p: "CAM", a: 22, v: 1.4, r: 68 },
    { n: "Florian Flecker", p: "RM", a: 30, v: 0.8, r: 64 }
  ],
  "La Louvi\xE8re": [
    { n: "Marius Courcoul", p: "CDM", a: 19, v: 2, r: 70 },
    { n: "Marcos Peano", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "Tiago Pereira Cardoso", p: "GK", a: 19, v: 1.5, r: 68 },
    { n: "Jordi Liongola", p: "RM", a: 25, v: 0.8, r: 64 }
  ],
  "Las Palmas": [
    { n: "Giovanni Bonfanti", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Ale Garc\xEDa", p: "RW", a: 22, v: 1.5, r: 68 },
    { n: "Manu Fuster", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Viti Rozada", p: "RB", a: 28, v: 1.5, r: 68 },
    { n: "Marvin Park", p: "RB", a: 25, v: 1.4, r: 68 }
  ],
  "Lausanne-Sport": [
    { n: "\xC9tienne Yout\xE9 Kinkou\xE9", p: "CB", a: 23, v: 5.7, r: 75 },
    { n: "Karim Sow", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Omar Janneh", p: "ST", a: 19, v: 3, r: 72 },
    { n: "Gaoussou Diakit\xE9", p: "ST", a: 20, v: 2.3, r: 70 },
    { n: "Brandon Soppy", p: "RM", a: 23, v: 1.5, r: 68 },
    { n: "Karlo Letica", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Dominik Schwizer", p: "LM", a: 27, v: 0.8, r: 64 }
  ],
  "Laval": [],
  "Lazio": [
    { n: "Davide Frattesi", p: "CM", a: 26, v: 18, r: 82 },
    { n: "Albert Gudmundsson", p: "CF", a: 28, v: 17.8, r: 82 },
    { n: "Kenneth Taylor", p: "CM", a: 23, v: 16.5, r: 81 },
    { n: "Gustav Isaksen", p: "RW", a: 24, v: 13.5, r: 80 },
    { n: "Andrea Pinamonti", p: "ST", a: 26, v: 12, r: 79 },
    { n: "Josip Sutalo", p: "CB", a: 25, v: 12, r: 79 },
    { n: "Danilho Doekhi", p: "CB", a: 27, v: 10.5, r: 79 },
    { n: "Nuno Tavares", p: "LB", a: 25, v: 10.5, r: 79 },
    { n: "Diogo Leite", p: "CB", a: 26, v: 9.8, r: 78 },
    { n: "Mattia Zaccagni", p: "LW", a: 30, v: 9.8, r: 78 },
    { n: "Christos Mandas", p: "GK", a: 24, v: 8.3, r: 77 },
    { n: "Adrian Przyborek", p: "CAM", a: 19, v: 6, r: 76 },
    { n: "Alessio Romagnoli", p: "CB", a: 30, v: 6, r: 76 },
    { n: "Oliver Provstgaard", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Fisayo Dele-Bashiru", p: "CM", a: 24, v: 5.3, r: 75 },
    { n: "Tijjani Noslin", p: "RW", a: 26, v: 5.3, r: 75 },
    { n: "Matteo Cancellieri", p: "RW", a: 23, v: 4.5, r: 74 },
    { n: "Edoardo Motta", p: "GK", a: 20, v: 3, r: 72 },
    { n: "Luca Pellegrini", p: "LB", a: 26, v: 3, r: 72 },
    { n: "Danilo Cataldi", p: "CDM", a: 31, v: 2.8, r: 71 },
    { n: "Adam Marusic", p: "RB", a: 33, v: 2.3, r: 70 },
    { n: "Alfonso Pedraza", p: "LB", a: 29, v: 2.3, r: 70 },
    { n: "Elseid Hysaj", p: "RB", a: 31, v: 1.5, r: 68 },
    { n: "Manuel Lazzari", p: "RB", a: 32, v: 1.5, r: 68 }
  ],
  "Le Havre": [
    { n: "Rassoul Ndiaye", p: "CM", a: 24, v: 6, r: 76 },
    { n: "Rayan Fofana", p: "ST", a: 19, v: 6, r: 76 },
    { n: "Junior Mwanga", p: "CDM", a: 22, v: 4.9, r: 74 },
    { n: "Amir Richardson", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Yassine Kechta", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Daler Kuzyaev", p: "CM", a: 32, v: 3.6, r: 73 },
    { n: "Stephan Zagadou", p: "CB", a: 17, v: 3, r: 72 },
    { n: "Simon Ebonog", p: "CM", a: 21, v: 2.3, r: 70 },
    { n: "Yanis Zouaoui", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Arnaud Bodart", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "Enzo Koffi", p: "LB", a: 19, v: 1.5, r: 68 },
    { n: "Fod\xE9 Doucour\xE9", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Sofiane Boufal", p: "CAM", a: 32, v: 1.5, r: 68 },
    { n: "Timoth\xE9e Pemb\xE9l\xE9", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "Le Mans": [
    { n: "Lucas Calodat", p: "LB", a: 23, v: 1.5, r: 68 }
  ],
  "Lecce": [
    { n: "Francesco Camarda", p: "ST", a: 17, v: 12, r: 79 },
    { n: "Tiago Gabriel", p: "CB", a: 21, v: 12, r: 79 },
    { n: "Ivan Ili\u0107", p: "CM", a: 24, v: 8.3, r: 77 },
    { n: "Jo\xEBl Monteiro", p: "LM", a: 24, v: 6, r: 76 },
    { n: "Medon Berisha", p: "CM", a: 22, v: 4.5, r: 74 },
    { n: "Jamil Siebert", p: "CB", a: 23, v: 3.8, r: 73 },
    { n: "Nikola Stulic", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "Willem Geubbels", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "Antonino Gallo", p: "LB", a: 25, v: 3, r: 72 },
    { n: "Omri Gandelman", p: "CAM", a: 25, v: 3, r: 72 },
    { n: "Santiago Pierotti", p: "RW", a: 24, v: 3, r: 72 },
    { n: "Wladimiro Falcone", p: "GK", a: 30, v: 3, r: 72 },
    { n: "Oumar Ngom", p: "CDM", a: 21, v: 2.4, r: 71 },
    { n: "Filip Marchwinski", p: "CAM", a: 23, v: 2.3, r: 70 },
    { n: "Lameck Banda", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "Danilo Veiga", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Tete Morente", p: "LW", a: 29, v: 1.5, r: 68 }
  ],
  "Leeds United": [
    { n: "Ethan Ampadu", p: "CDM", a: 25, v: 24.3, r: 83 },
    { n: "Anton Stach", p: "CDM", a: 27, v: 22.7, r: 83 },
    { n: "Harry Wilson", p: "RW", a: 28, v: 20.3, r: 82 },
    { n: "James Trafford", p: "GK", a: 23, v: 20.3, r: 82 },
    { n: "Jean-Matt\xE9o Bahoya", p: "LW", a: 20, v: 20.3, r: 82 },
    { n: "Dominic Calvert-Lewin", p: "ST", a: 28, v: 18, r: 82 },
    { n: "Gabriel Gudmundsson", p: "LB", a: 26, v: 16.5, r: 81 },
    { n: "Tarik Muharemovi\u0107", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Brenden Aaronson", p: "CAM", a: 25, v: 14.3, r: 80 },
    { n: "Jaka Bijol", p: "CB", a: 26, v: 14.3, r: 80 },
    { n: "Noah Okafor", p: "LW", a: 25, v: 14.3, r: 80 },
    { n: "Sean Longstaff", p: "CM", a: 28, v: 12.8, r: 80 },
    { n: "Joe Rodon", p: "CB", a: 28, v: 12, r: 79 },
    { n: "Daniel James", p: "RW", a: 28, v: 9.8, r: 78 },
    { n: "James Justin", p: "RB", a: 27, v: 9.8, r: 78 },
    { n: "Jayden Bogle", p: "RB", a: 25, v: 9.8, r: 78 },
    { n: "Ilia Gruev", p: "CDM", a: 25, v: 9.7, r: 78 },
    { n: "Ao Tanaka", p: "CM", a: 27, v: 8.3, r: 77 },
    { n: "Lukas Nmecha", p: "ST", a: 27, v: 8.3, r: 77 },
    { n: "Melvin Bard", p: "LB", a: 25, v: 8.3, r: 77 },
    { n: "Nico Elvedi", p: "CB", a: 29, v: 6.8, r: 76 },
    { n: "Michael Zetterer", p: "GK", a: 30, v: 3.8, r: 73 }
  ],
  "Legan\xE9s": [
    { n: "\xC1lvaro Morata", p: "ST", a: 33, v: 6.8, r: 76 },
    { n: "Zico Buurmeester", p: "CM", a: 23, v: 2.9, r: 71 },
    { n: "Enric Franquesa", p: "LB", a: 28, v: 1.4, r: 68 }
  ],
  "Lens": [
    { n: "Robin Risser", p: "GK", a: 21, v: 20.3, r: 82 },
    { n: "Samson Baidoo", p: "CB", a: 21, v: 20.3, r: 82 },
    { n: "Jean-Clair Todibo", p: "CB", a: 26, v: 18.8, r: 82 },
    { n: "Franjo Ivanovi\u0107", p: "ST", a: 22, v: 14.3, r: 80 },
    { n: "Odsonne \xC9douard", p: "ST", a: 27, v: 9.8, r: 78 },
    { n: "Isma\xEBlo Ganiou", p: "CB", a: 20, v: 8.3, r: 77 },
    { n: "Yassine Titraoui", p: "CM", a: 22, v: 6, r: 76 },
    { n: "Amadou Haidara", p: "CM", a: 27, v: 4.5, r: 74 },
    { n: "Matthieu Udol", p: "LB", a: 29, v: 4.5, r: 74 },
    { n: "Andrija Bulatovic", p: "CM", a: 19, v: 3.8, r: 73 },
    { n: "Florian Thauvin", p: "RW", a: 32, v: 3.8, r: 73 },
    { n: "Saud Abdulhamid", p: "RB", a: 26, v: 3.8, r: 73 },
    { n: "Abdallah Sima", p: "LW", a: 24, v: 3, r: 72 },
    { n: "Micha\xEBl Cuisance", p: "CM", a: 26, v: 3, r: 72 },
    { n: "Michal Skoras", p: "LW", a: 25, v: 3, r: 72 },
    { n: "Nidal Celik", p: "CB", a: 19, v: 3, r: 72 },
    { n: "Jhoanner Ch\xE1vez", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Ruben Aguilar", p: "RB", a: 32, v: 2.3, r: 70 },
    { n: "Thorgan Hazard", p: "CAM", a: 32, v: 2.3, r: 70 }
  ],
  "Levadiakos": [
    { n: "Adrian \u0218ut", p: "CDM", a: 26, v: 2.8, r: 71 }
  ],
  "Levante": [
    { n: "Karl Etta Eyong", p: "ST", a: 22, v: 14.3, r: 80 },
    { n: "Carlos \xC1lvarez", p: "CAM", a: 22, v: 12, r: 79 },
    { n: "Petar Ratkov", p: "ST", a: 22, v: 8.3, r: 77 },
    { n: "Axel Tape", p: "CB", a: 18, v: 6.8, r: 76 },
    { n: "Hugo Sotelo", p: "CM", a: 22, v: 6, r: 76 },
    { n: "Iv\xE1n Romero", p: "ST", a: 24, v: 6, r: 76 },
    { n: "Enzo Bardeli", p: "CM", a: 24, v: 4.5, r: 74 },
    { n: "Manu S\xE1nchez", p: "LB", a: 25, v: 4.5, r: 74 },
    { n: "Thiago Fern\xE1ndez", p: "LW", a: 21, v: 3.8, r: 73 },
    { n: "Alan Matturro", p: "CB", a: 21, v: 3, r: 72 },
    { n: "Jon Ander Olasagasti", p: "CM", a: 25, v: 2.9, r: 71 },
    { n: "Jeremy Toljan", p: "RB", a: 31, v: 1.5, r: 68 },
    { n: "Mathew Ryan", p: "GK", a: 33, v: 1.5, r: 68 },
    { n: "Pablo Campos", p: "GK", a: 23, v: 1.5, r: 68 }
  ],
  "Le\xF3n": [
    { n: "D\xEDber Cambindo", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Fernando Beltr\xE1n", p: "CM", a: 27, v: 3.6, r: 73 },
    { n: "Jordan Garc\xEDa", p: "GK", a: 20, v: 2.3, r: 70 },
    { n: "Juan Dom\xEDnguez", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "\xD3scar Garc\xEDa", p: "GK", a: 22, v: 2.3, r: 70 },
    { n: "Rodrigo Echeverr\xEDa", p: "CDM", a: 30, v: 1.6, r: 68 },
    { n: "Ismael D\xEDaz", p: "LW", a: 28, v: 1.5, r: 68 },
    { n: "Iv\xE1n Moreno", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Jordi Cortizo", p: "RW", a: 29, v: 1.5, r: 68 },
    { n: "Nicol\xE1s Vallejo", p: "RW", a: 21, v: 1.5, r: 68 },
    { n: "Salvador Reyes", p: "LB", a: 27, v: 1.5, r: 68 }
  ],
  "Lille": [
    { n: "Dilane Bakwa", p: "RW", a: 23, v: 22.5, r: 83 },
    { n: "H\xE1kon Arnar Haraldsson", p: "CAM", a: 22, v: 18, r: 82 },
    { n: "Nathan Ngoy", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Alexsandro", p: "CB", a: 26, v: 14.3, r: 80 },
    { n: "Hamza Igamane", p: "ST", a: 23, v: 14.3, r: 80 },
    { n: "Ayase Ueda", p: "ST", a: 27, v: 12, r: 79 },
    { n: "Tiago Santos", p: "RB", a: 23, v: 9.8, r: 78 },
    { n: "Berke \xD6zer", p: "GK", a: 25, v: 8.3, r: 77 },
    { n: "Osame Sahraoui", p: "LW", a: 24, v: 8.3, r: 77 },
    { n: "Ethan Mbapp\xE9", p: "RW", a: 19, v: 7.5, r: 77 },
    { n: "Romain Perraud", p: "LB", a: 28, v: 6, r: 76 },
    { n: "Ga\xEBtan Perrin", p: "RW", a: 29, v: 4.5, r: 74 },
    { n: "Soriba Diaoune", p: "LW", a: 18, v: 3.8, r: 73 },
    { n: "Ba\u015Far \xD6nal", p: "LM", a: 21, v: 3, r: 72 },
    { n: "Benjamin Andr\xE9", p: "CDM", a: 35, v: 2.4, r: 71 },
    { n: "Calvin Verdonk", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Loun Srdanovic", p: "RB", a: 19, v: 0.8, r: 64 }
  ],
  "Lincoln City": [
    { n: "Dom Jefferies", p: "RM", a: 23, v: 0.8, r: 64 },
    { n: "Dylan Duffy", p: "LM", a: 21, v: 0.8, r: 64 }
  ],
  "Liverpool": [
    { n: "Florian Wirtz", p: "CAM", a: 22, v: 89.3, r: 91 },
    { n: "Alexander Isak", p: "ST", a: 26, v: 81, r: 90 },
    { n: "Dominik Szoboszlai", p: "CAM", a: 25, v: 81, r: 90 },
    { n: "Hugo Ekitik\xE9", p: "ST", a: 23, v: 72.8, r: 90 },
    { n: "Ryan Gravenberch", p: "CDM", a: 24, v: 64.8, r: 89 },
    { n: "Alexis Mac Allister", p: "CM", a: 27, v: 64.5, r: 89 },
    { n: "Bradley Barcola", p: "LW", a: 23, v: 57, r: 88 },
    { n: "Cody Gakpo", p: "LW", a: 26, v: 52.5, r: 88 },
    { n: "J\xE9r\xE9my Jacquet", p: "CB", a: 20, v: 44.3, r: 87 },
    { n: "Milos Kerkez", p: "LB", a: 22, v: 32.3, r: 85 },
    { n: "Jeremie Frimpong", p: "RB", a: 25, v: 28.5, r: 84 },
    { n: "Conor Bradley", p: "RB", a: 22, v: 24, r: 83 },
    { n: "Giorgi Mamardashvili", p: "GK", a: 25, v: 22.5, r: 83 },
    { n: "Giovanni Leoni", p: "CB", a: 19, v: 20.3, r: 82 },
    { n: "Rio Ngumoha", p: "LW", a: 17, v: 16.5, r: 81 },
    { n: "Ronald Araujo", p: "CB", a: 26, v: 16.5, r: 81 },
    { n: "V\xEDctor Mu\xF1oz", p: "LW", a: 22, v: 16.5, r: 81 },
    { n: "Virgil van Dijk", p: "CB", a: 34, v: 14.3, r: 80 },
    { n: "Alisson", p: "GK", a: 33, v: 13.5, r: 80 },
    { n: "Federico Chiesa", p: "RW", a: 28, v: 12, r: 79 },
    { n: "Joe Gomez", p: "CB", a: 28, v: 12, r: 79 },
    { n: "Konstantinos Tsimikas", p: "LB", a: 29, v: 6.8, r: 76 },
    { n: "Trey Nyoni", p: "CM", a: 18, v: 4.5, r: 74 },
    { n: "Wataru Endo", p: "CDM", a: 32, v: 3.2, r: 72 },
    { n: "Freddie Woodman", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Lewis Koumas", p: "LW", a: 20, v: 2.3, r: 70 }
  ],
  "Lokomotiva Zagreb": [],
  "Lommel": [],
  "Lorient": [
    { n: "Arthur Avom", p: "CM", a: 21, v: 12, r: 79 },
    { n: "Ars\xE8ne Kouassi", p: "LB", a: 21, v: 8.3, r: 77 },
    { n: "Pablo Pagis", p: "LW", a: 23, v: 8.3, r: 77 },
    { n: "Bamo Me\xEFt\xE9", p: "CB", a: 24, v: 6, r: 76 },
    { n: "Montassar Talbi", p: "CB", a: 27, v: 6, r: 76 },
    { n: "Isaak Tour\xE9", p: "CB", a: 22, v: 5.7, r: 75 },
    { n: "Bamba Dieng", p: "ST", a: 25, v: 4.5, r: 74 },
    { n: "Darlin Yongwa", p: "LB", a: 25, v: 4.5, r: 74 },
    { n: "Jean-Victor Makengo", p: "CAM", a: 27, v: 4.5, r: 74 },
    { n: "Th\xE9o Le Bris", p: "RM", a: 23, v: 3.8, r: 73 },
    { n: "Mohamed Bamba", p: "ST", a: 24, v: 3.6, r: 73 },
    { n: "Sambou Soumano", p: "ST", a: 24, v: 3, r: 72 },
    { n: "Dermane Karim", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Yvon Mvogo", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Igor Silva", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Joel Mvuka", p: "RM", a: 23, v: 1.5, r: 68 },
    { n: "Panos Katseris", p: "RM", a: 24, v: 1.5, r: 68 },
    { n: "G\xE9d\xE9on Kalulu", p: "RB", a: 28, v: 1.4, r: 68 }
  ],
  "Lugano": [
    { n: "Mattia Zanotti", p: "RB", a: 22, v: 8.3, r: 77 },
    { n: "Martim Marques", p: "LB", a: 21, v: 5.7, r: 75 },
    { n: "Ignacio Aliseda", p: "LW", a: 25, v: 2.9, r: 71 },
    { n: "Yanis Cimignani", p: "LM", a: 21, v: 2.3, r: 70 },
    { n: "Uran Bislimi", p: "CM", a: 26, v: 2.1, r: 70 },
    { n: "Amir Saipi", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Ezgjan Alioski", p: "LB", a: 33, v: 1.4, r: 68 }
  ],
  "Luzern": [
    { n: "Lucas Silva", p: "CAM", a: 19, v: 2.3, r: 70 },
    { n: "Matteo Di Giusto", p: "CAM", a: 25, v: 2.3, r: 70 },
    { n: "Pascal Loretz", p: "GK", a: 22, v: 2.3, r: 70 },
    { n: "Lars Villiger", p: "ST", a: 22, v: 2.1, r: 70 },
    { n: "Oscar Kabwit", p: "RW", a: 20, v: 1.5, r: 68 },
    { n: "Pius Dorn", p: "RM", a: 29, v: 0.8, r: 64 }
  ],
  "Lyngby": [
    { n: "S\xE6var Atli Magn\xFAsson", p: "RW", a: 25, v: 1.4, r: 68 },
    { n: "Zidan Sertdemir", p: "CAM", a: 20, v: 1.4, r: 68 }
  ],
  "Lyon": [
    { n: "Lo\xEFs Openda", p: "ST", a: 25, v: 26.3, r: 84 },
    { n: "Tyler Morton", p: "CDM", a: 23, v: 24.3, r: 83 },
    { n: "Pavel Sulc", p: "CAM", a: 25, v: 16.5, r: 81 },
    { n: "Moussa Niakhat\xE9", p: "CB", a: 29, v: 14.3, r: 80 },
    { n: "Mads Bidstrup", p: "CM", a: 24, v: 12, r: 79 },
    { n: "Noah Nartey", p: "CAM", a: 20, v: 12, r: 79 },
    { n: "Corentin Tolisso", p: "CM", a: 31, v: 9.8, r: 78 },
    { n: "Ernest Nuamah", p: "RW", a: 22, v: 9.8, r: 78 },
    { n: "Abner", p: "LB", a: 25, v: 8.3, r: 77 },
    { n: "Khalis Merah", p: "CM", a: 18, v: 8.3, r: 77 },
    { n: "R\xE9mi Himbert", p: "LW", a: 17, v: 8.3, r: 77 },
    { n: "Zachary Athekame", p: "RB", a: 21, v: 8.3, r: 77 },
    { n: "Tanner Tessmann", p: "CDM", a: 24, v: 8.1, r: 77 },
    { n: "Keito Nakamura", p: "LW", a: 25, v: 7.5, r: 77 },
    { n: "Dominik Greif", p: "GK", a: 28, v: 6.8, r: 76 },
    { n: "Julien Duranville", p: "LW", a: 19, v: 6, r: 76 },
    { n: "Ruben Kluivert", p: "CB", a: 24, v: 4.5, r: 74 },
    { n: "Nicol\xE1s Tagliafico", p: "LB", a: 33, v: 3.8, r: 73 },
    { n: "Jordan Veretout", p: "CM", a: 32, v: 3.6, r: 73 },
    { n: "Ka\xEFl Boudache", p: "RW", a: 19, v: 3, r: 72 },
    { n: "R\xE9my Descamps", p: "GK", a: 29, v: 1.5, r: 68 }
  ],
  "Magdeburg": [],
  "Mainz": [
    { n: "Kaishu Sano", p: "CDM", a: 25, v: 40.5, r: 86 },
    { n: "Nadiem Amiri", p: "CM", a: 29, v: 13.5, r: 80 },
    { n: "Paul Nebel", p: "CAM", a: 23, v: 12, r: 79 },
    { n: "Kacper Potulski", p: "CB", a: 18, v: 9.8, r: 78 },
    { n: "Anthony Caci", p: "RB", a: 28, v: 6.8, r: 76 },
    { n: "Benedict Hollerbach", p: "ST", a: 24, v: 6.8, r: 76 },
    { n: "Eric Martel", p: "CDM", a: 23, v: 6.5, r: 76 },
    { n: "Stefan Posch", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Phillip Tietz", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Ransford K\xF6nigsd\xF6rffer", p: "ST", a: 24, v: 3, r: 72 },
    { n: "Sheraldo Becker", p: "LW", a: 30, v: 2.9, r: 71 },
    { n: "Robin Zentner", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Silas", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Jae-sung Lee", p: "CAM", a: 33, v: 1.5, r: 68 },
    { n: "Phillipp Mwene", p: "LB", a: 31, v: 1.5, r: 68 }
  ],
  "Mallorca": [
    { n: "Zito Luvumbo", p: "RW", a: 23, v: 4.3, r: 74 },
    { n: "Martin Valjent", p: "CB", a: 30, v: 3.8, r: 73 },
    { n: "Pablo Torre", p: "CAM", a: 22, v: 3.8, r: 73 },
    { n: "Adam Buksa", p: "ST", a: 29, v: 3, r: 72 },
    { n: "Sergi Darder", p: "CM", a: 32, v: 3, r: 72 },
    { n: "Lucas Bergstr\xF6m", p: "GK", a: 23, v: 1.5, r: 68 },
    { n: "Toni Lato", p: "LB", a: 28, v: 1.5, r: 68 },
    { n: "Alberto Moreno", p: "LB", a: 33, v: 1.4, r: 68 }
  ],
  "Manchester City": [
    { n: "Erling Haaland", p: "ST", a: 25, v: 162, r: 94 },
    { n: "Enzo Fern\xE1ndez", p: "CM", a: 24, v: 72.8, r: 90 },
    { n: "Phil Foden", p: "CAM", a: 25, v: 64.5, r: 89 },
    { n: "Antoine Semenyo", p: "RW", a: 25, v: 60.8, r: 89 },
    { n: "Josko Gvardiol", p: "CB", a: 23, v: 57, r: 88 },
    { n: "J\xE9r\xE9my Doku", p: "LW", a: 23, v: 52.5, r: 88 },
    { n: "Marc Gu\xE9hi", p: "CB", a: 25, v: 52.5, r: 88 },
    { n: "Rayan Cherki", p: "CAM", a: 22, v: 52.5, r: 88 },
    { n: "Elliot Anderson", p: "CM", a: 23, v: 48.8, r: 87 },
    { n: "R\xFAben Dias", p: "CB", a: 28, v: 48.8, r: 87 },
    { n: "Ayyoub Bouaddi", p: "CM", a: 18, v: 40.5, r: 86 },
    { n: "Iliman Ndiaye", p: "RW", a: 25, v: 40.5, r: 86 },
    { n: "Nico O'Reilly", p: "LB", a: 20, v: 40.5, r: 86 },
    { n: "Gianluigi Donnarumma", p: "GK", a: 26, v: 36.8, r: 86 },
    { n: "Matheus Nunes", p: "RB", a: 27, v: 36.8, r: 86 },
    { n: "Rayan A\xEFt-Nouri", p: "LB", a: 24, v: 32.3, r: 85 },
    { n: "Abdukodir Khusanov", p: "CB", a: 21, v: 28.5, r: 84 },
    { n: "Rico Lewis", p: "RB", a: 21, v: 26.3, r: 84 },
    { n: "Vitor Reis", p: "CB", a: 19, v: 24, r: 83 },
    { n: "Mateo Kovacic", p: "CM", a: 31, v: 9.8, r: 78 },
    { n: "Allan", p: "RW", a: 21, v: 7.8, r: 77 },
    { n: "Ger\xF3nimo Rulli", p: "GK", a: 33, v: 6.8, r: 76 }
  ],
  "Manchester United": [
    { n: "Bryan Mbeumo", p: "RW", a: 26, v: 64.5, r: 89 },
    { n: "Matheus Cunha", p: "ST", a: 26, v: 57, r: 88 },
    { n: "Benjamin Sesko", p: "ST", a: 22, v: 52.5, r: 88 },
    { n: "Carlos Baleba", p: "CDM", a: 21, v: 44.6, r: 87 },
    { n: "Amad Diallo", p: "RW", a: 23, v: 40.5, r: 86 },
    { n: "Kobbie Mainoo", p: "CM", a: 20, v: 40.5, r: 86 },
    { n: "Leny Yoro", p: "CB", a: 20, v: 40.5, r: 86 },
    { n: "Andrey Santos", p: "CM", a: 21, v: 36.8, r: 86 },
    { n: "Bruno Fernandes", p: "CAM", a: 31, v: 32.3, r: 85 },
    { n: "Lisandro Mart\xEDnez", p: "CB", a: 27, v: 32.3, r: 85 },
    { n: "Marcus Rashford", p: "LW", a: 28, v: 32.3, r: 85 },
    { n: "Matthijs de Ligt", p: "CB", a: 26, v: 32.3, r: 85 },
    { n: "Patrick Dorgu", p: "LB", a: 21, v: 28.5, r: 84 },
    { n: "Youri Tielemans", p: "CM", a: 28, v: 28.5, r: 84 },
    { n: "Diogo Dalot", p: "RB", a: 26, v: 24, r: 83 },
    { n: "Mason Mount", p: "CAM", a: 26, v: 24, r: 83 },
    { n: "Senne Lammens", p: "GK", a: 23, v: 24, r: 83 },
    { n: "Manuel Ugarte", p: "CDM", a: 24, v: 20.3, r: 82 },
    { n: "Joshua Zirkzee", p: "ST", a: 24, v: 18, r: 82 },
    { n: "Ayden Heaven", p: "CB", a: 19, v: 16.5, r: 81 },
    { n: "Noussair Mazraoui", p: "RB", a: 28, v: 16.5, r: 81 },
    { n: "Harry Maguire", p: "CB", a: 32, v: 8.3, r: 77 },
    { n: "Luke Shaw", p: "LB", a: 30, v: 8.3, r: 77 },
    { n: "Tyrell Malacia", p: "LB", a: 26, v: 3.8, r: 73 },
    { n: "Chido Obi", p: "ST", a: 18, v: 3.6, r: 73 },
    { n: "Harry Amass", p: "LB", a: 18, v: 3.6, r: 73 },
    { n: "Diego Le\xF3n", p: "LB", a: 18, v: 3, r: 72 }
  ],
  "Mantova": [
    { n: "Vanja Vlahovi\u0107", p: "ST", a: 21, v: 3.8, r: 73 },
    { n: "Davide Bragantini", p: "RW", a: 22, v: 1.5, r: 68 }
  ],
  "Marseille": [
    { n: "Igor Paix\xE3o", p: "LW", a: 25, v: 28.5, r: 84 },
    { n: "Amine Gouiri", p: "ST", a: 25, v: 22.5, r: 83 },
    { n: "Nayef Aguerd", p: "CB", a: 29, v: 16.5, r: 81 },
    { n: "Timothy Weah", p: "RM", a: 25, v: 16.5, r: 81 },
    { n: "Pierre-Emile H\xF8jbjerg", p: "CDM", a: 31, v: 12.2, r: 80 },
    { n: "Angel Gomes", p: "CAM", a: 25, v: 9.8, r: 78 },
    { n: "CJ Egan-Riley", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Emerson", p: "LB", a: 31, v: 8.3, r: 77 },
    { n: "Himad Abdelli", p: "CAM", a: 26, v: 6, r: 76 },
    { n: "Tochukwu Nnadi", p: "CDM", a: 22, v: 3.6, r: 73 },
    { n: "Geoffrey Kondogbia", p: "CDM", a: 33, v: 2.4, r: 70 },
    { n: "Jeffrey de Lange", p: "GK", a: 27, v: 2.3, r: 70 }
  ],
  "Mar\xEDtimo": [],
  "Mechelen": [
    { n: "Moncef Zekri", p: "LB", a: 17, v: 3, r: 72 },
    { n: "Gora Diouf", p: "CB", a: 22, v: 2.9, r: 71 },
    { n: "Fredrik Hammar", p: "CDM", a: 24, v: 2.4, r: 71 },
    { n: "Mathis Servais", p: "CAM", a: 21, v: 2.3, r: 70 },
    { n: "Th\xE9rence Koudou", p: "RB", a: 21, v: 2.3, r: 70 },
    { n: "Leo Hjelde", p: "LB", a: 22, v: 1.5, r: 68 },
    { n: "Nacho Miras", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Ortwin De Wolf", p: "GK", a: 28, v: 1.4, r: 68 }
  ],
  "Metz": [
    { n: "Believe Munongo", p: "CM", a: 16, v: 8.3, r: 77 },
    { n: "Habib Diallo", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Alpha Tour\xE9", p: "CDM", a: 19, v: 3.2, r: 72 },
    { n: "Jonathan Fischer", p: "GK", a: 24, v: 2.3, r: 70 },
    { n: "Koffi Kouao", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Nathan Mbala", p: "ST", a: 17, v: 2.3, r: 70 }
  ],
  "Middlesbrough": [
    { n: "Morgan Whittaker", p: "RW", a: 24, v: 12.8, r: 80 },
    { n: "Sverre Nypan", p: "CM", a: 19, v: 12, r: 79 },
    { n: "Tommy Conway", p: "ST", a: 23, v: 8.3, r: 77 },
    { n: "Aidan Morris", p: "CM", a: 24, v: 7.5, r: 77 },
    { n: "David Strelec", p: "ST", a: 24, v: 6, r: 76 },
    { n: "Sol Brynn", p: "GK", a: 25, v: 6, r: 76 },
    { n: "Jeremy Sarmiento", p: "LW", a: 23, v: 5.7, r: 75 },
    { n: "Adilson Malanda", p: "CB", a: 24, v: 4.5, r: 74 },
    { n: "Alfie Jones", p: "CB", a: 28, v: 4.5, r: 74 },
    { n: "Amario Cozier-Duberry", p: "RW", a: 20, v: 3.8, r: 73 },
    { n: "Ashley Phillips", p: "CB", a: 20, v: 3.8, r: 73 },
    { n: "Callum Brittain", p: "RB", a: 27, v: 3.8, r: 73 },
    { n: "Radek V\xEDtek", p: "GK", a: 22, v: 3.8, r: 73 },
    { n: "Will Lankshear", p: "ST", a: 20, v: 3.8, r: 73 },
    { n: "Sontje Hansen", p: "RW", a: 23, v: 2.9, r: 71 },
    { n: "Delano Burgzorg", p: "LW", a: 27, v: 2.3, r: 70 },
    { n: "Micah Hamilton", p: "LW", a: 22, v: 2.3, r: 70 },
    { n: "Riley McGree", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Connor Barron", p: "CDM", a: 23, v: 2, r: 70 }
  ],
  "Millwall": [
    { n: "Romain Esse", p: "RW", a: 20, v: 8.3, r: 77 },
    { n: "Mihailo Ivanovi\u0107", p: "ST", a: 21, v: 6, r: 76 },
    { n: "Thierno Ballo", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Josh Coburn", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Tristan Crama", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "Will Smallbone", p: "CM", a: 25, v: 3, r: 72 },
    { n: "Camiel Neghli", p: "RW", a: 24, v: 2.3, r: 70 },
    { n: "Luke Cundle", p: "CM", a: 23, v: 2.3, r: 70 },
    { n: "Casper De Norre", p: "CDM", a: 28, v: 1.6, r: 68 },
    { n: "Danny McNamara", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Zak Sturge", p: "LB", a: 21, v: 1.5, r: 68 }
  ],
  "Minnesota United": [
    { n: "Kelvin Yeboah", p: "ST", a: 25, v: 4.5, r: 74 },
    { n: "Joaqu\xEDn Pereyra", p: "CM", a: 27, v: 3.8, r: 73 },
    { n: "Bongokuhle Hlongwane", p: "RW", a: 25, v: 2.9, r: 71 },
    { n: "Tom\xE1s Chancalay", p: "LW", a: 27, v: 2.3, r: 70 },
    { n: "Anthony Markanich Jr.", p: "LB", a: 26, v: 1.5, r: 68 },
    { n: "Dominik Fitz", p: "CAM", a: 26, v: 1.5, r: 68 },
    { n: "James Rodr\xEDguez", p: "CAM", a: 34, v: 1.5, r: 68 },
    { n: "Julian Gressel", p: "RM", a: 32, v: 1.5, r: 68 },
    { n: "AZ Jackson", p: "CAM", a: 24, v: 1.4, r: 68 },
    { n: "Drake Callender", p: "GK", a: 28, v: 0.8, r: 64 }
  ],
  "Mirassol": [
    { n: "Antonio Galeano", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Negueba", p: "RW", a: 26, v: 2.3, r: 70 },
    { n: "Neto Moura", p: "CDM", a: 29, v: 1.6, r: 68 },
    { n: "Felipe Jonatan", p: "LB", a: 27, v: 1.5, r: 68 }
  ],
  "Modena": [
    { n: "Francesco Zampano", p: "RM", a: 32, v: 0.8, r: 64 },
    { n: "Paulo Azzi", p: "LM", a: 29, v: 0.8, r: 64 }
  ],
  "Monaco": [
    { n: "Lamine Camara", p: "CM", a: 22, v: 28.5, r: 84 },
    { n: "Folarin Balogun", p: "ST", a: 24, v: 24, r: 83 },
    { n: "Denis Zakaria", p: "CDM", a: 29, v: 20.3, r: 82 },
    { n: "Matthis Abline", p: "ST", a: 22, v: 16.5, r: 81 },
    { n: "Vanderson", p: "RB", a: 24, v: 16.5, r: 81 },
    { n: "Aleksandr Golovin", p: "CAM", a: 29, v: 14.3, r: 80 },
    { n: "Mika Biereth", p: "ST", a: 22, v: 14.3, r: 80 },
    { n: "Ansu Fati", p: "LW", a: 23, v: 12, r: 79 },
    { n: "Christian Mawissa", p: "CB", a: 20, v: 12, r: 79 },
    { n: "Jordan Teze", p: "RB", a: 26, v: 12, r: 79 },
    { n: "Mamadou Coulibaly", p: "CM", a: 21, v: 12, r: 79 },
    { n: "Takumi Minamino", p: "LW", a: 30, v: 9.8, r: 78 },
    { n: "Mathys Detourbet", p: "LW", a: 18, v: 8.3, r: 77 },
    { n: "Mohammed Salisu", p: "CB", a: 26, v: 8.3, r: 77 },
    { n: "Wout Faes", p: "CB", a: 27, v: 8.3, r: 77 },
    { n: "Kr\xE9pin Diatta", p: "RM", a: 26, v: 4.5, r: 74 },
    { n: "Eric Dier", p: "CB", a: 31, v: 3.8, r: 73 },
    { n: "Stanis Idumbo", p: "CAM", a: 20, v: 3.8, r: 73 },
    { n: "Nazinho", p: "LB", a: 22, v: 3.6, r: 73 },
    { n: "Philipp K\xF6hn", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Sadibou San\xE9", p: "CB", a: 21, v: 3, r: 72 },
    { n: "Paul Pogba", p: "CM", a: 32, v: 2.3, r: 70 },
    { n: "Lukas Hradecky", p: "GK", a: 36, v: 1.5, r: 68 }
  ],
  "Monterrey": [
    { n: "Luca Orellano", p: "RW", a: 25, v: 6.8, r: 76 },
    { n: "Anthony Martial", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Iker Fimbres", p: "CAM", a: 20, v: 3.8, r: 73 },
    { n: "V\xEDctor Guzm\xE1n", p: "CB", a: 23, v: 3.8, r: 73 },
    { n: "Lucas Ocampos", p: "LW", a: 31, v: 3, r: 72 },
    { n: "\xD3liver Torres", p: "CM", a: 31, v: 3, r: 72 },
    { n: "Fidel Ambr\xEDz", p: "CDM", a: 22, v: 2.8, r: 71 },
    { n: "Alonso Aceves", p: "LB", a: 24, v: 2.3, r: 70 },
    { n: "Gerardo Arteaga", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Ricardo Ch\xE1vez", p: "RB", a: 31, v: 2.3, r: 70 },
    { n: "Jorge Rodr\xEDguez", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "\xC9rick Aguirre", p: "RB", a: 28, v: 1.5, r: 68 },
    { n: "Jes\xFAs Corona", p: "RW", a: 32, v: 1.5, r: 68 },
    { n: "Santiago Mele", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Esteban Andrada", p: "GK", a: 34, v: 1.4, r: 68 }
  ],
  "Montpellier": [
    { n: "Becir Omeragic", p: "CB", a: 23, v: 3.6, r: 73 },
    { n: "Khalil Fayad", p: "CM", a: 21, v: 2.1, r: 70 },
    { n: "T\xE9ji Savanier", p: "CAM", a: 34, v: 2.1, r: 70 },
    { n: "Nicolas Pays", p: "RW", a: 22, v: 1.5, r: 68 },
    { n: "Falaye Sacko", p: "RB", a: 30, v: 1.4, r: 68 },
    { n: "Issiaga Sylla", p: "LB", a: 32, v: 1.4, r: 68 }
  ],
  "Monza": [
    { n: "Jan Ziolkowski", p: "CB", a: 20, v: 9.8, r: 78 },
    { n: "Cyril Ngonge", p: "RW", a: 25, v: 6.8, r: 76 },
    { n: "Jay Robinson", p: "LW", a: 18, v: 6.8, r: 76 },
    { n: "Ebenezer Akinsanmiro", p: "CM", a: 21, v: 5.3, r: 75 },
    { n: "Idrissa Tour\xE9", p: "RM", a: 27, v: 4.5, r: 74 },
    { n: "Michael Folorunsho", p: "CM", a: 27, v: 4.5, r: 74 },
    { n: "Kacper Urba\u0144ski", p: "CAM", a: 21, v: 4.3, r: 74 },
    { n: "Andrea Colpani", p: "CAM", a: 26, v: 3.8, r: 73 },
    { n: "Matteo Pessina", p: "CM", a: 28, v: 3.8, r: 73 },
    { n: "Saba Goglichidze", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "Tom\xE1s Palacios", p: "CB", a: 22, v: 3.6, r: 73 },
    { n: "Leonardo Colombo", p: "CDM", a: 20, v: 3.2, r: 72 },
    { n: "Patrick Cutrone", p: "ST", a: 27, v: 3, r: 72 },
    { n: "Dany Mota", p: "ST", a: 27, v: 2.9, r: 71 },
    { n: "Ricardo Mangas", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Samuele Birindelli", p: "RB", a: 26, v: 2.3, r: 70 },
    { n: "Demba Thiam", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "Noel T\xF6rnqvist", p: "GK", a: 23, v: 1.5, r: 68 },
    { n: "Omari Forson", p: "RW", a: 21, v: 1.4, r: 68 },
    { n: "Patrick Ciurria", p: "RM", a: 30, v: 0.8, r: 64 },
    { n: "Keita Bald\xE9", p: "LW", a: 31, v: 0.7, r: 63 }
  ],
  "Moreirense": [
    { n: "Alan", p: "CAM", a: 25, v: 3, r: 72 },
    { n: "Diogo Travassos", p: "RB", a: 21, v: 3, r: 72 },
    { n: "Mateja Stjepanovi\u0107", p: "CDM", a: 21, v: 2.4, r: 71 },
    { n: "Dinis Pinto", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Fabiano", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Kiko", p: "LB", a: 23, v: 1.5, r: 68 }
  ],
  "Motherwell": [
    { n: "Tawanda Maswanhise", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Emmanuel Longelo", p: "LB", a: 25, v: 0.8, r: 64 },
    { n: "Sam Nicholson", p: "LM", a: 28, v: 0.8, r: 64 },
    { n: "Marvin Kaleta", p: "RM", a: 21, v: 0.7, r: 64 }
  ],
  "M\xE1laga": [
    { n: "Adam Aznou", p: "LB", a: 19, v: 6, r: 76 },
    { n: "Jens Cajuste", p: "CDM", a: 26, v: 5.7, r: 75 },
    { n: "Chupe", p: "ST", a: 21, v: 4.5, r: 74 },
    { n: "David Larrubia", p: "RW", a: 23, v: 3, r: 72 },
    { n: "Jos\xE9 Salinas", p: "LB", a: 25, v: 2.3, r: 70 }
  ],
  "NEC Nijmegen": [
    { n: "Kodai Sano", p: "CM", a: 22, v: 9.8, r: 78 },
    { n: "Darko Nejasmic", p: "CDM", a: 26, v: 4.1, r: 73 },
    { n: "Ahmetcan Kaplan", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Sami Ouaissa", p: "RM", a: 21, v: 3.8, r: 73 },
    { n: "Almugera Kabar", p: "LB", a: 19, v: 2.3, r: 70 },
    { n: "Gonzalo Crettaz", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "No\xE9 Lebreton", p: "CAM", a: 21, v: 1.5, r: 68 }
  ],
  "NEOM SC": [
    { n: "Nathan Z\xE9z\xE9", p: "CB", a: 20, v: 14.3, r: 80 },
    { n: "Marcin Bulka", p: "GK", a: 26, v: 13.5, r: 80 },
    { n: "Malang Sarr", p: "CB", a: 26, v: 12, r: 79 },
    { n: "Luciano Rodr\xEDguez", p: "ST", a: 22, v: 8.3, r: 77 },
    { n: "Sa\xEFd Benrahma", p: "LW", a: 30, v: 7.5, r: 77 },
    { n: "Amadou Kon\xE9", p: "CDM", a: 20, v: 5.7, r: 75 },
    { n: "Abdoulaye Doucour\xE9", p: "CAM", a: 33, v: 4.5, r: 74 },
    { n: "Alexandre Lacazette", p: "ST", a: 34, v: 3.8, r: 73 },
    { n: "Lu\xEDs Maximiano", p: "GK", a: 26, v: 3, r: 72 }
  ],
  "Nacional": [
    { n: "Gabriel Veron", p: "RW", a: 23, v: 2.3, r: 70 },
    { n: "Kaique Pereira", p: "GK", a: 22, v: 0.8, r: 64 }
  ],
  "Nancy": [
    { n: "Thierno Bald\xE9", p: "RB", a: 23, v: 1.4, r: 68 }
  ],
  "Nantes": [
    { n: "Tylel Tati", p: "CB", a: 17, v: 20.3, r: 82 },
    { n: "Louis Leroux", p: "CAM", a: 19, v: 9.8, r: 78 },
    { n: "Herba Guirassy", p: "LW", a: 19, v: 6.8, r: 76 },
    { n: "Johann Lepenant", p: "CDM", a: 23, v: 4.9, r: 74 },
    { n: "Dehmaine Tabibou", p: "CM", a: 20, v: 3, r: 72 },
    { n: "Mostafa Mohamed", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Kelvin Amian", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Nicolas Cozza", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Fr\xE9d\xE9ric Guilbert", p: "RB", a: 31, v: 2.1, r: 70 },
    { n: "Deiver Machado", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "Antoine Joujou", p: "LW", a: 22, v: 1.4, r: 68 },
    { n: "Fabien Centonze", p: "RB", a: 29, v: 1.4, r: 68 },
    { n: "Anthony Lopes", p: "GK", a: 35, v: 0.7, r: 64 }
  ],
  "Napoli": [
    { n: "Rasmus H\xF8jlund", p: "ST", a: 22, v: 40.5, r: 86 },
    { n: "Scott McTominay", p: "CM", a: 29, v: 36.8, r: 86 },
    { n: "Alessandro Buongiorno", p: "CB", a: 26, v: 28.5, r: 84 },
    { n: "David Neres", p: "RW", a: 28, v: 22.5, r: 83 },
    { n: "Lorenzo Lucca", p: "ST", a: 25, v: 20.3, r: 82 },
    { n: "Noa Lang", p: "LW", a: 26, v: 20.3, r: 82 },
    { n: "Sam Beukema", p: "CB", a: 27, v: 20.3, r: 82 },
    { n: "Frank Anguissa", p: "CM", a: 30, v: 16.5, r: 81 },
    { n: "Vanja Milinkovi\u0107-Savi\u0107", p: "GK", a: 28, v: 16.5, r: 81 },
    { n: "Billy Gilmour", p: "CDM", a: 24, v: 16.2, r: 81 },
    { n: "Beno\xEEt Badiashile", p: "CB", a: 24, v: 14.3, r: 80 },
    { n: "Antonio Vergara", p: "CAM", a: 22, v: 12, r: 79 },
    { n: "Math\xEDas Olivera", p: "LB", a: 28, v: 12, r: 79 },
    { n: "Alex Meret", p: "GK", a: 28, v: 11.3, r: 79 },
    { n: "Alisson Santos", p: "LW", a: 23, v: 10.5, r: 79 },
    { n: "Amir Rrahmani", p: "CB", a: 31, v: 9.8, r: 78 },
    { n: "Giovane", p: "ST", a: 22, v: 9.8, r: 78 },
    { n: "Giovanni Di Lorenzo", p: "RB", a: 32, v: 8.3, r: 77 },
    { n: "Kevin De Bruyne", p: "CAM", a: 34, v: 8.3, r: 77 },
    { n: "Stanislav Lobotka", p: "CDM", a: 31, v: 8.1, r: 77 },
    { n: "Matteo Politano", p: "RW", a: 32, v: 7.8, r: 77 },
    { n: "Luca Marianucci", p: "CB", a: 21, v: 6, r: 76 },
    { n: "Leonardo Spinazzola", p: "LB", a: 32, v: 3, r: 72 },
    { n: "Costantino Favasuli", p: "LB", a: 21, v: 2.3, r: 70 }
  ],
  "Nashville SC": [
    { n: "Sam Surridge", p: "ST", a: 27, v: 6.8, r: 76 },
    { n: "Hany Mukhtar", p: "CAM", a: 30, v: 4.5, r: 74 },
    { n: "Cristian Espinoza", p: "RW", a: 30, v: 3.8, r: 73 },
    { n: "Patrick Yazbek", p: "CM", a: 23, v: 3, r: 72 },
    { n: "Edvard Tagseth", p: "CM", a: 24, v: 2.3, r: 70 },
    { n: "Elias Saad", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Alex Muyl", p: "RW", a: 30, v: 1.5, r: 68 }
  ],
  "Necaxa": [
    { n: "Juli\xE1n Carranza", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Agust\xEDn Almendra", p: "CM", a: 25, v: 3, r: 72 },
    { n: "Javier Ruiz", p: "CAM", a: 21, v: 3, r: 72 },
    { n: "Emilio Lara", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Ezequiel Unsain", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Pedro Pedraza", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Danny Leyva", p: "CDM", a: 22, v: 1.6, r: 68 },
    { n: "Cristian Calder\xF3n", p: "LB", a: 28, v: 1.5, r: 68 },
    { n: "Franco Rossano", p: "LB", a: 20, v: 1.5, r: 68 },
    { n: "Lorenzo Faravelli", p: "CAM", a: 32, v: 1.4, r: 68 }
  ],
  "New England Revolution": [
    { n: "Jack Harrison", p: "LW", a: 29, v: 6.8, r: 76 },
    { n: "Dor Turgeman", p: "ST", a: 22, v: 3.8, r: 73 },
    { n: "Luca Langoni", p: "RW", a: 23, v: 3, r: 72 },
    { n: "Alhassan Yusuf", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Ilay Feingold", p: "RB", a: 21, v: 2.3, r: 70 },
    { n: "Matt Turner", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Peyton Miller", p: "LB", a: 18, v: 2.3, r: 70 },
    { n: "Carles Gil", p: "CAM", a: 33, v: 1.5, r: 68 },
    { n: "Griffin Yow", p: "RW", a: 23, v: 1.5, r: 68 },
    { n: "Emmanuel Boateng", p: "LM", a: 29, v: 0.8, r: 64 }
  ],
  "New York City FC": [
    { n: "Talles Magno", p: "LW", a: 23, v: 6.4, r: 76 },
    { n: "Nicol\xE1s Fern\xE1ndez Mercau", p: "ST", a: 25, v: 6, r: 76 },
    { n: "Alonso Mart\xEDnez", p: "ST", a: 27, v: 4.5, r: 74 },
    { n: "Hannes Wolf", p: "RW", a: 26, v: 3.8, r: 73 },
    { n: "Juli\xE1n Fern\xE1ndez", p: "RW", a: 21, v: 3.6, r: 73 },
    { n: "Agust\xEDn Ojeda", p: "LW", a: 21, v: 3, r: 72 },
    { n: "Aiden O'Neill", p: "CDM", a: 27, v: 2.4, r: 71 },
    { n: "Keaton Parks", p: "CDM", a: 28, v: 2.4, r: 71 },
    { n: "Tayvon Gray", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Andr\xE9s Perea", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Kai Trewin", p: "CDM", a: 24, v: 1.5, r: 68 },
    { n: "Matt Freese", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "Mitja Ilenic", p: "RM", a: 21, v: 1.4, r: 68 },
    { n: "Kevin O'Toole", p: "LB", a: 27, v: 0.8, r: 64 }
  ],
  "New York Red Bulls": [
    { n: "Jorge Ruvalcaba", p: "LW", a: 24, v: 3.8, r: 73 },
    { n: "Felipe Carballo", p: "CM", a: 29, v: 3.6, r: 73 },
    { n: "Cade Cowell", p: "LW", a: 22, v: 3, r: 72 },
    { n: "Dylan Nealis", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Emil Forsberg", p: "LW", a: 34, v: 1.5, r: 68 },
    { n: "Jahkeele Marshall-Rutty", p: "RB", a: 21, v: 1.5, r: 68 },
    { n: "Dennis Gjengaar", p: "RW", a: 21, v: 1.4, r: 68 },
    { n: "Marcelo Morales", p: "LB", a: 22, v: 1.4, r: 68 },
    { n: "Joyeux Masanka Bungi", p: "LM", a: 18, v: 0.8, r: 64 },
    { n: "Matthew Dos Santos", p: "LB", a: 17, v: 0.8, r: 64 },
    { n: "Omar Valencia", p: "LB", a: 21, v: 0.8, r: 64 },
    { n: "Ethan Horvath", p: "GK", a: 30, v: 0.7, r: 64 }
  ],
  "Newcastle": [
    { n: "Malick Thiaw", p: "CB", a: 24, v: 36.8, r: 86 },
    { n: "Anthony Elanga", p: "RW", a: 23, v: 32.3, r: 85 },
    { n: "Tino Livramento", p: "RB", a: 23, v: 32.3, r: 85 },
    { n: "Bazoumana Tour\xE9", p: "LW", a: 19, v: 28.5, r: 84 },
    { n: "Jacob Ramsey", p: "CM", a: 24, v: 28.5, r: 84 },
    { n: "Lewis Hall", p: "LB", a: 21, v: 28.5, r: 84 },
    { n: "Sven Botman", p: "CB", a: 25, v: 28.5, r: 84 },
    { n: "Harvey Barnes", p: "LW", a: 28, v: 26.3, r: 84 },
    { n: "Joelinton", p: "CM", a: 29, v: 24, r: 83 },
    { n: "Matias Fernandez-Pardo", p: "ST", a: 20, v: 24, r: 83 },
    { n: "Yoane Wissa", p: "ST", a: 29, v: 24, r: 83 },
    { n: "Lewis Miley", p: "CM", a: 19, v: 20.3, r: 82 },
    { n: "Aladji Bamba", p: "CDM", a: 19, v: 14.6, r: 81 },
    { n: "Joe Willock", p: "CM", a: 26, v: 12.8, r: 80 },
    { n: "Amar Dedi\u0107", p: "RB", a: 23, v: 12, r: 79 },
    { n: "Jacob Murphy", p: "RW", a: 30, v: 12, r: 79 },
    { n: "Lukas Hornicek", p: "GK", a: 23, v: 12, r: 79 },
    { n: "William Osula", p: "ST", a: 22, v: 12, r: 79 },
    { n: "Nick Pope", p: "GK", a: 33, v: 6, r: 76 },
    { n: "Fabian Sch\xE4r", p: "CB", a: 34, v: 4.5, r: 74 },
    { n: "Sean Steur", p: "CM", a: 17, v: 4.5, r: 74 },
    { n: "Dan Burn", p: "CB", a: 33, v: 3.8, r: 73 },
    { n: "Ewen Jaouen", p: "GK", a: 20, v: 3, r: 72 },
    { n: "Alex Murphy", p: "LB", a: 21, v: 1.5, r: 68 }
  ],
  "Nice": [
    { n: "Mohamed Amoura", p: "ST", a: 25, v: 21.8, r: 83 },
    { n: "Elye Wahi", p: "ST", a: 22, v: 9.8, r: 78 },
    { n: "Hicham Boudaoui", p: "CM", a: 26, v: 9.8, r: 78 },
    { n: "Sofiane Diop", p: "LW", a: 25, v: 9.8, r: 78 },
    { n: "Mo\xEFse Bombito", p: "CB", a: 25, v: 6.8, r: 76 },
    { n: "Youssouf Ndayishimiye", p: "CB", a: 27, v: 6.8, r: 76 },
    { n: "Tom Louchet", p: "RM", a: 22, v: 6, r: 76 },
    { n: "Yehvann Diouf", p: "GK", a: 26, v: 6, r: 76 },
    { n: "Alidu Seidu", p: "CB", a: 25, v: 4.5, r: 74 },
    { n: "Antoine Mendy", p: "CB", a: 21, v: 4.5, r: 74 },
    { n: "Isak Jansson", p: "LW", a: 23, v: 4.3, r: 74 },
    { n: "Gauthier Hein", p: "RW", a: 29, v: 3.8, r: 73 },
    { n: "Jonathan Clauss", p: "RB", a: 33, v: 3.8, r: 73 },
    { n: "Salis Abdul Samed", p: "CDM", a: 25, v: 3.2, r: 72 },
    { n: "Morgan Sanson", p: "CM", a: 31, v: 3, r: 72 },
    { n: "Nathan Ngoumou", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Niels Nkounkou", p: "LB", a: 25, v: 3, r: 72 },
    { n: "Ali Abdi", p: "LB", a: 32, v: 2.3, r: 70 },
    { n: "Tanguy Ndomb\xE9l\xE9", p: "CM", a: 29, v: 2.3, r: 70 },
    { n: "Axel Witsel", p: "CDM", a: 37, v: 1, r: 65 }
  ],
  "Norwich City": [
    { n: "Josh Sargent", p: "ST", a: 25, v: 14.3, r: 80 },
    { n: "Mathias Kvistgaarden", p: "ST", a: 23, v: 6.8, r: 76 },
    { n: "Ante Crnac", p: "ST", a: 22, v: 4.5, r: 74 },
    { n: "Jovon Makama", p: "ST", a: 21, v: 4.5, r: 74 },
    { n: "Mat\u011Bj Jur\xE1sek", p: "RW", a: 22, v: 4.5, r: 74 },
    { n: "Amankwah Forson", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Jos\xE9 C\xF3rdoba", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "Oscar Schwartau", p: "CAM", a: 19, v: 3.8, r: 73 },
    { n: "Papa Amadou Diallo", p: "LW", a: 21, v: 3.8, r: 73 },
    { n: "Mirko Topic", p: "CDM", a: 24, v: 3.2, r: 72 },
    { n: "Ali Ahmed", p: "LM", a: 25, v: 3, r: 72 },
    { n: "Mohamed Tour\xE9", p: "ST", a: 21, v: 3, r: 72 },
    { n: "Jacob Wright", p: "CDM", a: 20, v: 2.4, r: 71 },
    { n: "Anis Ben Slimane", p: "CM", a: 24, v: 2.3, r: 70 },
    { n: "Jack Stacey", p: "RB", a: 29, v: 2.3, r: 70 },
    { n: "Pelle Mattsson", p: "CM", a: 24, v: 2.3, r: 70 },
    { n: "Vladan Kovacevic", p: "GK", a: 27, v: 2.3, r: 70 },
    { n: "Sam Field", p: "CDM", a: 27, v: 2, r: 70 },
    { n: "Ben Chrisene", p: "LB", a: 21, v: 1.5, r: 68 },
    { n: "Kellen Fisher", p: "RB", a: 21, v: 1.5, r: 68 }
  ],
  "Nottingham Forest": [
    { n: "Morgan Gibbs-White", p: "CAM", a: 25, v: 48.8, r: 87 },
    { n: "Murillo", p: "CB", a: 23, v: 40.5, r: 86 },
    { n: "Ousmane Diomande", p: "CB", a: 22, v: 36.8, r: 86 },
    { n: "Dan Ndoye", p: "RW", a: 25, v: 28.5, r: 84 },
    { n: "Liam Delap", p: "ST", a: 22, v: 26.3, r: 84 },
    { n: "Callum Hudson-Odoi", p: "LW", a: 25, v: 24, r: 83 },
    { n: "Nikola Milenkovi\u0107", p: "CB", a: 28, v: 24, r: 83 },
    { n: "Daniel Mu\xF1oz", p: "RB", a: 29, v: 21.8, r: 83 },
    { n: "Arnaud Kalimuendo", p: "ST", a: 23, v: 20.3, r: 82 },
    { n: "Neco Williams", p: "LB", a: 24, v: 20.3, r: 82 },
    { n: "Igor Jesus", p: "ST", a: 24, v: 18, r: 82 },
    { n: "James McAtee", p: "CAM", a: 23, v: 16.5, r: 81 },
    { n: "Ola Aina", p: "RB", a: 29, v: 16.5, r: 81 },
    { n: "Ibrahim Sangar\xE9", p: "CDM", a: 28, v: 16.2, r: 81 },
    { n: "Nicol\xF2 Savona", p: "RB", a: 22, v: 14.3, r: 80 },
    { n: "Nicol\xE1s Dom\xEDnguez", p: "CM", a: 27, v: 12.8, r: 80 },
    { n: "Jair Cunha", p: "CB", a: 20, v: 9.8, r: 78 },
    { n: "Xaver Schlager", p: "CM", a: 28, v: 8.3, r: 77 },
    { n: "Cuiabano", p: "LB", a: 22, v: 6.8, r: 76 },
    { n: "Ryan Yates", p: "CM", a: 28, v: 6.8, r: 76 },
    { n: "John Victor", p: "GK", a: 29, v: 6, r: 76 },
    { n: "Luca Netz", p: "LB", a: 22, v: 5.7, r: 75 },
    { n: "Chris Wood", p: "ST", a: 34, v: 4.5, r: 74 },
    { n: "Stefan Ortega", p: "GK", a: 33, v: 3.8, r: 73 },
    { n: "Matz Sels", p: "GK", a: 33, v: 3, r: 72 }
  ],
  "N\xFCrnberg": [
    { n: "Mikayil Faye", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "Adam Markhiev", p: "CDM", a: 23, v: 3.2, r: 72 },
    { n: "Rafael Lubach", p: "CM", a: 20, v: 3, r: 72 },
    { n: "William B\xF8ving", p: "ST", a: 22, v: 3, r: 72 },
    { n: "Julian Justvan", p: "CAM", a: 27, v: 1.5, r: 68 },
    { n: "Tim Janisch", p: "RB", a: 20, v: 1.4, r: 68 },
    { n: "Jan Reichert", p: "GK", a: 24, v: 0.8, r: 64 },
    { n: "Justin von der Hitz", p: "RM", a: 19, v: 0.8, r: 64 }
  ],
  "OB": [
    { n: "Theo Sander", p: "GK", a: 20, v: 0.8, r: 64 }
  ],
  "OFI": [
    { n: "Taxiarchis Fountas", p: "CF", a: 30, v: 2.1, r: 70 },
    { n: "Daniel Naumov", p: "GK", a: 27, v: 0.7, r: 64 }
  ],
  "OH Leuven": [
    { n: "Tobe Leysen", p: "GK", a: 23, v: 3, r: 72 },
    { n: "Lukasz Lakomy", p: "CDM", a: 24, v: 1.6, r: 68 },
    { n: "Takahiro Akimoto", p: "LB", a: 27, v: 1.5, r: 68 }
  ],
  "Olympiacos": [
    { n: "Leon Bailey", p: "RW", a: 28, v: 12.8, r: 80 },
    { n: "Santiago Hezze", p: "CDM", a: 24, v: 11.3, r: 79 },
    { n: "Jota Silva", p: "LW", a: 26, v: 9.8, r: 78 },
    { n: "Lorenzo Pirola", p: "CB", a: 23, v: 7.5, r: 77 },
    { n: "David Carmo", p: "CB", a: 26, v: 6.8, r: 76 },
    { n: "Francisco Ortega", p: "LB", a: 26, v: 6, r: 76 },
    { n: "Panagiotis Retsos", p: "CB", a: 27, v: 4.5, r: 74 },
    { n: "Ayoub El Kaabi", p: "ST", a: 32, v: 3.8, r: 73 },
    { n: "Chiquinho", p: "CAM", a: 30, v: 3.8, r: 73 },
    { n: "Daniel Podence", p: "LW", a: 30, v: 3.8, r: 73 },
    { n: "Mehdi Taremi", p: "ST", a: 33, v: 3.6, r: 73 },
    { n: "Diogo Nascimento", p: "CM", a: 23, v: 3, r: 72 },
    { n: "Yusuf Yaz\u0131c\u0131", p: "CAM", a: 28, v: 3, r: 72 },
    { n: "Lorenzo Scipioni", p: "CDM", a: 21, v: 2.8, r: 71 },
    { n: "Bruno Onyemaechi", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Gelson Martins", p: "RW", a: 30, v: 2.3, r: 70 },
    { n: "Manolis Saliakas", p: "RB", a: 29, v: 2.3, r: 70 },
    { n: "Athanasios Koutsogoulas", p: "RM", a: 21, v: 0.8, r: 64 }
  ],
  "Orlando City": [
    { n: "Antoine Griezmann", p: "CF", a: 34, v: 13.5, r: 80 },
    { n: "Mart\xEDn Ojeda", p: "CAM", a: 27, v: 6.8, r: 76 },
    { n: "Marco Pa\u0161ali\u0107", p: "RW", a: 25, v: 5.3, r: 75 },
    { n: "Eduard Atuesta", p: "CM", a: 28, v: 3, r: 72 },
    { n: "Tiago", p: "LW", a: 20, v: 3, r: 72 },
    { n: "Braian Ojeda", p: "CDM", a: 25, v: 2.8, r: 71 },
    { n: "Iv\xE1n Angulo", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Adri\xE1n Mar\xEDn", p: "LB", a: 28, v: 1.5, r: 68 },
    { n: "Griffin Dorsey", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Maxime Cr\xE9peau", p: "GK", a: 31, v: 1.5, r: 68 }
  ],
  "Osasuna": [
    { n: "Enzo Boyomo", p: "CB", a: 24, v: 16.5, r: 81 },
    { n: "Aimar Oroz", p: "CAM", a: 24, v: 7.5, r: 77 },
    { n: "Romain Del Castillo", p: "RW", a: 29, v: 6.4, r: 76 },
    { n: "Jon Moncayola", p: "CM", a: 27, v: 6, r: 76 },
    { n: "Ra\xFAl Moro", p: "LW", a: 23, v: 3.8, r: 73 },
    { n: "Ante Budimir", p: "ST", a: 34, v: 3.6, r: 73 },
    { n: "Abel Bretones", p: "LB", a: 25, v: 3, r: 72 },
    { n: "Jonathan Dubasin", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Sergio Herrera", p: "GK", a: 32, v: 2.3, r: 70 },
    { n: "Valentin Rosier", p: "RB", a: 29, v: 2.3, r: 70 },
    { n: "Lucas Torr\xF3", p: "CDM", a: 31, v: 2, r: 70 },
    { n: "Iker Mu\xF1oz", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Rub\xE9n Garc\xEDa", p: "RW", a: 32, v: 1.5, r: 68 },
    { n: "Kike Barja", p: "RW", a: 28, v: 1.4, r: 68 },
    { n: "Moi G\xF3mez", p: "CAM", a: 31, v: 1.4, r: 68 }
  ],
  "Osijek": [
    { n: "Anton Matkovic", p: "ST", a: 19, v: 2.3, r: 70 },
    { n: "Nail Omerovic", p: "LW", a: 23, v: 2.3, r: 70 }
  ],
  "Osnabr\xFCck": [],
  "PAOK": [
    { n: "Christos Zafeiris", p: "CM", a: 22, v: 9, r: 78 },
    { n: "Andrija Zivkovic", p: "RW", a: 29, v: 6.8, r: 76 },
    { n: "Georgios Giakoumakis", p: "ST", a: 31, v: 6, r: 76 },
    { n: "Fedor Chalov", p: "ST", a: 27, v: 5.7, r: 75 },
    { n: "Kristijan Jakic", p: "CDM", a: 28, v: 4.9, r: 74 },
    { n: "Kiril Despodov", p: "RW", a: 29, v: 4.5, r: 74 },
    { n: "Mady Camara", p: "CM", a: 28, v: 4.5, r: 74 },
    { n: "Alessandro Bianco", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Greg Taylor", p: "LB", a: 28, v: 3.8, r: 73 },
    { n: "Jonjoe Kenny", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "Luka Ivanu\u0161ec", p: "CAM", a: 27, v: 2.3, r: 70 },
    { n: "Baptiste Santamaria", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "Abdul Rahman Baba", p: "LB", a: 31, v: 1.5, r: 68 },
    { n: "Jorge S\xE1nchez", p: "RB", a: 28, v: 1.5, r: 68 }
  ],
  "PEC Zwolle": [
    { n: "Filip Krastev", p: "CAM", a: 24, v: 2.9, r: 71 },
    { n: "Jan B\xFCrger", p: "RB", a: 18, v: 2.3, r: 70 },
    { n: "Jasper Schendelaar", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Shola Shoretire", p: "LW", a: 21, v: 1.5, r: 68 },
    { n: "Tristan Gooijer", p: "RB", a: 21, v: 1.5, r: 68 },
    { n: "Dylan Mbayo", p: "RW", a: 24, v: 1.4, r: 68 },
    { n: "Lennart Czyborra", p: "LM", a: 24, v: 0.8, r: 64 }
  ],
  "PSG": [
    { n: "Vitinha", p: "CDM", a: 25, v: 113.4, r: 92 },
    { n: "Jo\xE3o Neves", p: "CM", a: 21, v: 89.3, r: 91 },
    { n: "Ousmane Demb\xE9l\xE9", p: "ST", a: 28, v: 81, r: 90 },
    { n: "D\xE9sir\xE9 Dou\xE9", p: "RW", a: 20, v: 72.8, r: 90 },
    { n: "Khvicha Kvaratskhelia", p: "LW", a: 24, v: 72.8, r: 90 },
    { n: "Achraf Hakimi", p: "RB", a: 27, v: 64.5, r: 89 },
    { n: "Nuno Mendes", p: "LB", a: 23, v: 60.8, r: 89 },
    { n: "Willian Pacho", p: "CB", a: 24, v: 57, r: 88 },
    { n: "Warren Za\xEFre-Emery", p: "CM", a: 19, v: 48.8, r: 87 },
    { n: "Ferran Torres", p: "ST", a: 25, v: 40.5, r: 86 },
    { n: "Maghnes Akliouche", p: "RW", a: 23, v: 40.5, r: 86 },
    { n: "Ilya Zabarnyi", p: "CB", a: 23, v: 36.8, r: 86 },
    { n: "Fabi\xE1n Ruiz", p: "CM", a: 29, v: 32.3, r: 85 },
    { n: "Senny Mayulu", p: "CM", a: 19, v: 32.3, r: 85 },
    { n: "Lucas Chevalier", p: "GK", a: 24, v: 24, r: 83 },
    { n: "Marquinhos", p: "CB", a: 31, v: 24, r: 83 },
    { n: "Mika Godts", p: "LW", a: 20, v: 20.3, r: 82 },
    { n: "Matvey Safonov", p: "GK", a: 26, v: 18, r: 82 },
    { n: "Lucas Beraldo", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Lucas Hern\xE1ndez", p: "LB", a: 29, v: 16.5, r: 81 },
    { n: "Dro Fern\xE1ndez", p: "CAM", a: 17, v: 8.3, r: 77 },
    { n: "Lucas Digne", p: "LB", a: 32, v: 6.8, r: 76 },
    { n: "Quentin Ndjantou", p: "LW", a: 18, v: 6, r: 76 },
    { n: "Yoram Zague", p: "RB", a: 19, v: 2.1, r: 70 }
  ],
  "PSV": [
    { n: "Ricardo Pepi", p: "ST", a: 22, v: 20.3, r: 82 },
    { n: "Lutsharel Geertruida", p: "RB", a: 25, v: 16.5, r: 81 },
    { n: "Paul Wanner", p: "CAM", a: 20, v: 14.3, r: 80 },
    { n: "Sergi\xF1o Dest", p: "RB", a: 25, v: 14.3, r: 80 },
    { n: "Mauro J\xFAnior", p: "LB", a: 26, v: 13.5, r: 80 },
    { n: "Yarek Gasiorowski", p: "CB", a: 20, v: 12.8, r: 80 },
    { n: "Guus Til", p: "CAM", a: 28, v: 12, r: 79 },
    { n: "Ryan Flamingo", p: "CB", a: 23, v: 11.3, r: 79 },
    { n: "Dennis Man", p: "RW", a: 27, v: 10.5, r: 79 },
    { n: "Ruben van Bommel", p: "LW", a: 21, v: 9.8, r: 78 },
    { n: "Matej Kovar", p: "GK", a: 25, v: 6, r: 76 },
    { n: "Esmir Bajraktarevic", p: "RW", a: 20, v: 3.8, r: 73 },
    { n: "Kiliann Sildillia", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "Myron Boadu", p: "ST", a: 24, v: 3.8, r: 73 },
    { n: "Alassane Pl\xE9a", p: "ST", a: 32, v: 3.6, r: 73 },
    { n: "Rick Karsdorp", p: "RB", a: 30, v: 2.9, r: 71 },
    { n: "Sam Lammers", p: "ST", a: 28, v: 2.9, r: 71 },
    { n: "Nick Olij", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Ivan Peri\u0161i\u0107", p: "LW", a: 37, v: 1, r: 65 }
  ],
  "Pachuca": [
    { n: "Oussama Idrissi", p: "LW", a: 29, v: 5.7, r: 75 },
    { n: "Al\xE1n Bautista", p: "CAM", a: 23, v: 3, r: 72 },
    { n: "Carlos Moreno", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Alan Mozo", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "Brian Garc\xEDa", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Carlos S\xE1nchez", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Sebasti\xE1n Santos", p: "RB", a: 22, v: 1.4, r: 68 },
    { n: "\xC1ngel Estrada", p: "LM", a: 20, v: 0.8, r: 64 }
  ],
  "Paderborn": [
    { n: "Santiago Casta\xF1eda", p: "CDM", a: 21, v: 4.1, r: 73 },
    { n: "Marvin Pieringer", p: "ST", a: 26, v: 3, r: 72 },
    { n: "Rayan Philippe", p: "RW", a: 25, v: 3, r: 72 },
    { n: "Deniz Zeitler", p: "LW", a: 19, v: 2.3, r: 70 },
    { n: "Gabriel Vidovic", p: "LW", a: 22, v: 2.3, r: 70 },
    { n: "Laurin Ulrich", p: "CAM", a: 20, v: 2.3, r: 70 },
    { n: "Laurin Curda", p: "RM", a: 24, v: 1.5, r: 68 },
    { n: "Nahuel Noll", p: "GK", a: 22, v: 1.5, r: 68 },
    { n: "Oliver Batista Meier", p: "CAM", a: 24, v: 1.5, r: 68 },
    { n: "Raphael Obermair", p: "LM", a: 27, v: 1.5, r: 68 },
    { n: "Anton B\xE4uerle", p: "LM", a: 18, v: 0.8, r: 64 },
    { n: "Marco Pledl", p: "LM", a: 23, v: 0.8, r: 64 }
  ],
  "Padova": [
    { n: "Marco Pompetti", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Matteo Cocchi", p: "LB", a: 18, v: 1.5, r: 68 },
    { n: "Gianluca Caprari", p: "CF", a: 32, v: 1.4, r: 68 },
    { n: "Alessandro Capelli", p: "RM", a: 28, v: 0.8, r: 64 }
  ],
  "Palermo": [
    { n: "Filippo Ranocchia", p: "CM", a: 24, v: 3, r: 72 },
    { n: "Joel Pohjanpalo", p: "ST", a: 31, v: 3, r: 72 },
    { n: "Niccol\xF2 Pierozzi", p: "RB", a: 24, v: 3, r: 72 },
    { n: "Dennis Johnsen", p: "LW", a: 27, v: 2.3, r: 70 },
    { n: "Mattia Perin", p: "GK", a: 33, v: 1.5, r: 68 },
    { n: "Tommaso Augello", p: "LB", a: 31, v: 1.4, r: 68 },
    { n: "Emmanuel Gyasi", p: "RM", a: 31, v: 0.8, r: 64 }
  ],
  "Palmeiras": [
    { n: "Vitor Roque", p: "ST", a: 20, v: 30.8, r: 85 },
    { n: "Jos\xE9 Manuel L\xF3pez", p: "ST", a: 25, v: 18, r: 82 },
    { n: "Paulinho", p: "CF", a: 25, v: 12.1, r: 80 },
    { n: "Andreas Pereira", p: "CM", a: 30, v: 12, r: 79 },
    { n: "Jhon Arias", p: "RW", a: 28, v: 12, r: 79 },
    { n: "Mauricio", p: "CAM", a: 24, v: 11.3, r: 79 },
    { n: "Joaqu\xEDn Piquerez", p: "LB", a: 27, v: 9.8, r: 78 },
    { n: "Ram\xF3n Sosa", p: "CF", a: 26, v: 9.3, r: 78 },
    { n: "Agust\xEDn Giay", p: "RB", a: 21, v: 8.3, r: 77 },
    { n: "Raphael Veiga", p: "CAM", a: 30, v: 6, r: 76 },
    { n: "Marlon Freitas", p: "CDM", a: 30, v: 4.9, r: 74 },
    { n: "Khellven", p: "RB", a: 24, v: 4.5, r: 74 },
    { n: "Bruno Fuchs", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Carlos Miguel", p: "GK", a: 27, v: 3.8, r: 73 },
    { n: "Luighi", p: "ST", a: 19, v: 3.8, r: 73 },
    { n: "Murilo", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Gustavo G\xF3mez", p: "CB", a: 32, v: 3.6, r: 73 },
    { n: "Jeft\xE9", p: "LB", a: 22, v: 3, r: 72 },
    { n: "Lucas Evangelista", p: "CM", a: 30, v: 3, r: 72 },
    { n: "Luis Benedetti", p: "CB", a: 19, v: 3, r: 72 },
    { n: "Felipe Anderson", p: "LW", a: 32, v: 1.5, r: 68 }
  ],
  "Panathinaikos": [
    { n: "Anass Salah-Eddine", p: "LB", a: 23, v: 9.8, r: 78 },
    { n: "Anass Zaroury", p: "LW", a: 25, v: 6.8, r: 76 },
    { n: "Facundo Pellistri", p: "RW", a: 24, v: 6.4, r: 76 },
    { n: "Santino Andino", p: "LM", a: 20, v: 4.5, r: 74 },
    { n: "Pedro Chirivella", p: "CDM", a: 28, v: 4.1, r: 73 },
    { n: "Adam Gnezda Cerin", p: "CM", a: 26, v: 3.8, r: 73 },
    { n: "Davide Calabria", p: "RB", a: 29, v: 3.8, r: 73 },
    { n: "Karol \u015Awiderski", p: "ST", a: 28, v: 3.8, r: 73 },
    { n: "Nemanja Maksimovic", p: "CM", a: 30, v: 3.6, r: 73 },
    { n: "Stefan de Vrij", p: "CB", a: 33, v: 3.6, r: 73 },
    { n: "\xC9tienne Camara", p: "CDM", a: 22, v: 3.2, r: 72 },
    { n: "Anastasios Bakasetas", p: "CAM", a: 32, v: 3, r: 72 },
    { n: "Cyriel Dessers", p: "ST", a: 31, v: 3, r: 72 },
    { n: "Vicente Taborda", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Alban Lafont", p: "GK", a: 26, v: 2.3, r: 70 },
    { n: "Bart\u0142omiej Dr\u0105gowski", p: "GK", a: 28, v: 2.1, r: 70 },
    { n: "Georgios Kyriakopoulos", p: "LB", a: 29, v: 1.5, r: 68 },
    { n: "Javi Hern\xE1ndez", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Lucas Chaves", p: "GK", a: 30, v: 0.7, r: 64 }
  ],
  "Panetolikos": [
    { n: "Alexandru M\u0103\u021Ban", p: "CAM", a: 26, v: 1.5, r: 68 }
  ],
  "Paris FC": [
    { n: "Diego Coppola", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Nhoa Sangui", p: "LB", a: 19, v: 7.5, r: 77 },
    { n: "Moses Simon", p: "LW", a: 30, v: 6, r: 76 },
    { n: "Moustapha Mbow", p: "CB", a: 25, v: 4.5, r: 74 },
    { n: "Obed Nkambadio", p: "GK", a: 22, v: 4.5, r: 74 },
    { n: "Maxime Lopez", p: "CDM", a: 28, v: 4.1, r: 73 },
    { n: "Pierre Lees-Melou", p: "CDM", a: 32, v: 3.6, r: 73 },
    { n: "Jean-Philippe Krasso", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Jonathan Ikon\xE9", p: "RW", a: 27, v: 3, r: 72 },
    { n: "Luca Koleosho", p: "RW", a: 21, v: 3, r: 72 },
    { n: "Hamari Traor\xE9", p: "RB", a: 33, v: 1.5, r: 68 },
    { n: "Kevin Trapp", p: "GK", a: 35, v: 1.5, r: 68 },
    { n: "Mathieu Cafaro", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Thibault De Smet", p: "LB", a: 27, v: 1.5, r: 68 }
  ],
  "Parma": [
    { n: "Mandela Keita", p: "CDM", a: 23, v: 16.2, r: 81 },
    { n: "Adri\xE1n Bernab\xE9", p: "CM", a: 24, v: 12, r: 79 },
    { n: "El Bilal Tour\xE9", p: "LW", a: 24, v: 12, r: 79 },
    { n: "Giovanni Fabbian", p: "CAM", a: 22, v: 8.3, r: 77 },
    { n: "Sascha Britschgi", p: "RB", a: 19, v: 8.3, r: 77 },
    { n: "Gabriel Strefezza", p: "RW", a: 28, v: 6, r: 76 },
    { n: "Mariano Troilo", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Matija Frigan", p: "ST", a: 22, v: 6, r: 76 },
    { n: "Abdoulaye Ndiaye", p: "CB", a: 23, v: 5.3, r: 75 },
    { n: "Christian Ord\xF3\xF1ez", p: "CM", a: 21, v: 5.3, r: 75 },
    { n: "Hans Nicolussi Caviglia", p: "CDM", a: 25, v: 4.9, r: 74 },
    { n: "Diego Carlos", p: "CB", a: 32, v: 4.5, r: 74 },
    { n: "Enrico Delprato", p: "RB", a: 26, v: 4.5, r: 74 },
    { n: "Benja Cremaschi", p: "CM", a: 20, v: 3.8, r: 73 },
    { n: "Vincent Sierro", p: "CM", a: 30, v: 3, r: 72 },
    { n: "Emanuele Valeri", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Edoardo Corvi", p: "GK", a: 24, v: 1.5, r: 68 },
    { n: "Giovanni Daffara", p: "GK", a: 21, v: 1.5, r: 68 }
  ],
  "Pau": [],
  "Philadelphia Union": [
    { n: "Cavan Sullivan", p: "CAM", a: 16, v: 3.8, r: 73 },
    { n: "Quinn Sullivan", p: "CM", a: 21, v: 3.8, r: 73 },
    { n: "Ezekiel Alladoh", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Danley Jean Jacques", p: "CDM", a: 25, v: 2.4, r: 71 },
    { n: "Indiana Vassilev", p: "RW", a: 24, v: 2.1, r: 70 },
    { n: "Frankie Westfield", p: "RB", a: 20, v: 1.5, r: 68 },
    { n: "Nathan Harriel", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Philippe Ndinga", p: "LB", a: 20, v: 0.8, r: 64 }
  ],
  "Pisa": [
    { n: "Felipe Loyola", p: "CM", a: 25, v: 6.8, r: 76 },
    { n: "Simone Canestrelli", p: "CB", a: 25, v: 4.5, r: 74 },
    { n: "\u0130sak Vural", p: "CM", a: 19, v: 3.8, r: 73 },
    { n: "Matteo Tramoni", p: "CAM", a: 25, v: 3.8, r: 73 },
    { n: "Samuele Angori", p: "LM", a: 22, v: 3.8, r: 73 },
    { n: "Gabriele Piccinini", p: "CM", a: 24, v: 3, r: 72 },
    { n: "Rosen Bozhinov", p: "CB", a: 20, v: 3, r: 72 },
    { n: "Emanuele Rao", p: "LW", a: 19, v: 2.3, r: 70 },
    { n: "Giuseppe Leone", p: "CDM", a: 24, v: 1.6, r: 68 },
    { n: "Mehdi L\xE9ris", p: "RW", a: 27, v: 1.5, r: 68 },
    { n: "Tom\xE1s Esteves", p: "RM", a: 23, v: 1.5, r: 68 },
    { n: "Simone Scuffet", p: "GK", a: 29, v: 1.4, r: 68 }
  ],
  "Portland Timbers": [
    { n: "David Da Costa", p: "CAM", a: 24, v: 4.5, r: 74 },
    { n: "Alexander Aravena", p: "LW", a: 23, v: 4.3, r: 74 },
    { n: "Kristoffer Velde", p: "LW", a: 26, v: 3.8, r: 73 },
    { n: "Cole Bassett", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Kevin Kelsy", p: "ST", a: 21, v: 3, r: 72 },
    { n: "Jos\xE9 Caicedo", p: "CDM", a: 23, v: 2.8, r: 71 },
    { n: "Juan Mosquera", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Brandon Bye", p: "RB", a: 30, v: 1.5, r: 68 },
    { n: "Jimer Fory", p: "LB", a: 23, v: 1.5, r: 68 },
    { n: "Omir Fernandez", p: "RW", a: 26, v: 1.4, r: 68 },
    { n: "James Pantemis", p: "GK", a: 28, v: 0.8, r: 64 }
  ],
  "Porto": [
    { n: "Samu Aghehowa", p: "ST", a: 21, v: 36.8, r: 86 },
    { n: "Diogo Costa", p: "GK", a: 26, v: 32.3, r: 85 },
    { n: "Alan Varela", p: "CDM", a: 24, v: 25.9, r: 84 },
    { n: "Victor Froholdt", p: "CM", a: 19, v: 24, r: 83 },
    { n: "Jakub Kiwior", p: "CB", a: 25, v: 21.8, r: 83 },
    { n: "Gabri Veiga", p: "CAM", a: 23, v: 20.3, r: 82 },
    { n: "Borja Sainz", p: "LW", a: 24, v: 18, r: 82 },
    { n: "Oskar Pietuszewski", p: "LW", a: 17, v: 16.5, r: 81 },
    { n: "Pep\xEA", p: "RW", a: 28, v: 16.5, r: 81 },
    { n: "Santiago Gimenez", p: "ST", a: 24, v: 16.5, r: 81 },
    { n: "William Gomes", p: "RW", a: 19, v: 16.5, r: 81 },
    { n: "Alberto Costa", p: "RB", a: 22, v: 12, r: 79 },
    { n: "Nehu\xE9n P\xE9rez", p: "CB", a: 25, v: 10.5, r: 79 },
    { n: "Francisco Moura", p: "LB", a: 26, v: 9.8, r: 78 },
    { n: "Martim Fernandes", p: "RB", a: 19, v: 9.8, r: 78 },
    { n: "Souza", p: "LB", a: 19, v: 9.8, r: 78 },
    { n: "Jan Bednarek", p: "CB", a: 29, v: 9, r: 78 },
    { n: "Seko Fofana", p: "CM", a: 30, v: 6.8, r: 76 },
    { n: "Pablo Rosario", p: "CDM", a: 28, v: 6.5, r: 76 },
    { n: "Stephen Eustaquio", p: "CM", a: 29, v: 6, r: 76 },
    { n: "Deniz G\xFCl", p: "ST", a: 21, v: 4.5, r: 74 },
    { n: "Dominik Prpi\u0107", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "Vasco Sousa", p: "CM", a: 22, v: 2.9, r: 71 },
    { n: "Zaidu Sanusi", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Cl\xE1udio Ramos", p: "GK", a: 34, v: 0.7, r: 64 }
  ],
  "Portsmouth": [
    { n: "Abu Kamara", p: "RW", a: 22, v: 2.9, r: 71 },
    { n: "John Swift", p: "CAM", a: 30, v: 2.1, r: 70 },
    { n: "Jayden Meghoma", p: "LB", a: 19, v: 1.5, r: 68 },
    { n: "Josh Murphy", p: "LW", a: 30, v: 1.5, r: 68 },
    { n: "Nicolas Schmid", p: "GK", a: 28, v: 1.5, r: 68 },
    { n: "Terry Devlin", p: "RB", a: 22, v: 1.5, r: 68 }
  ],
  "Preston North End": [
    { n: "Caleb Wiley", p: "LB", a: 21, v: 6.8, r: 76 },
    { n: "Alfie Devine", p: "CAM", a: 21, v: 4.5, r: 74 },
    { n: "Jordan Storey", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Thierry Small", p: "LB", a: 21, v: 3.8, r: 73 },
    { n: "Callum Lang", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Daniel Iversen", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Mads Fr\xF8kj\xE6r", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Andrew Moran", p: "CAM", a: 22, v: 1.5, r: 68 },
    { n: "Jamal Lewis", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Robbie Brady", p: "LM", a: 31, v: 0.8, r: 64 }
  ],
  "Puebla": [
    { n: "Edgar Guerra", p: "RW", a: 24, v: 1.5, r: 68 },
    { n: "Facundo Waller", p: "LM", a: 26, v: 0.8, r: 64 }
  ],
  "Pumas UNAM": [
    { n: "Jord\xE1n Carrillo", p: "LW", a: 24, v: 6.8, r: 76 },
    { n: "Pedro Vite", p: "CAM", a: 23, v: 4.5, r: 74 },
    { n: "Nathan Silva", p: "CB", a: 28, v: 4.3, r: 74 },
    { n: "Adalberto Carrasquilla", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Robert Morales", p: "ST", a: 26, v: 3, r: 72 },
    { n: "\xC1lvaro Angulo", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Pablo Bennevendo", p: "RB", a: 25, v: 2.1, r: 70 },
    { n: "Alan Medina", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Pablo Monroy", p: "RB", a: 23, v: 1.4, r: 68 }
  ],
  "QPR": [
    { n: "Dennis Cirkin", p: "LB", a: 23, v: 6.8, r: 76 },
    { n: "Ilias Chair", p: "CAM", a: 28, v: 4.5, r: 74 },
    { n: "Jimmy Dunne", p: "RB", a: 28, v: 3.8, r: 73 },
    { n: "Nicolas Madsen", p: "CM", a: 25, v: 3.8, r: 73 },
    { n: "Richard Kone", p: "ST", a: 22, v: 3.8, r: 73 },
    { n: "Ronnie Edwards", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Rumarn Burrell", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Glen Kamara", p: "CM", a: 30, v: 3.6, r: 73 },
    { n: "Esquerdinha", p: "LB", a: 19, v: 3, r: 72 },
    { n: "Koki Saito", p: "LW", a: 24, v: 2.3, r: 70 },
    { n: "Kenneth Paal", p: "LB", a: 28, v: 2.1, r: 70 },
    { n: "Jonathan Varane", p: "CDM", a: 24, v: 2, r: 70 },
    { n: "Harvey Vale", p: "RM", a: 22, v: 1.5, r: 68 },
    { n: "Karamoko Demb\xE9l\xE9", p: "CAM", a: 22, v: 1.5, r: 68 },
    { n: "Paul Nardi", p: "GK", a: 31, v: 1.5, r: 68 },
    { n: "Rhys Norrington-Davies", p: "LB", a: 26, v: 1.5, r: 68 }
  ],
  "Quer\xE9taro": [
    { n: "Santiago Homenchenko", p: "CDM", a: 22, v: 3.6, r: 73 },
    { n: "Francisco Venegas", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Lucas Rodr\xEDguez", p: "CAM", a: 28, v: 1.5, r: 68 },
    { n: "Jean Unjanque", p: "RM", a: 20, v: 0.8, r: 64 }
  ],
  "RB Leipzig": [
    { n: "Castello Lukeba", p: "CB", a: 23, v: 36.8, r: 86 },
    { n: "Johan Bakayoko", p: "RW", a: 22, v: 27.1, r: 84 },
    { n: "Antonio Nusa", p: "LW", a: 20, v: 26.3, r: 84 },
    { n: "Christoph Baumgartner", p: "CAM", a: 26, v: 24, r: 83 },
    { n: "R\xF4mulo", p: "ST", a: 23, v: 24, r: 83 },
    { n: "Assan Ou\xE9draogo", p: "CM", a: 19, v: 22.5, r: 83 },
    { n: "Brajan Gruda", p: "CAM", a: 21, v: 22.5, r: 83 },
    { n: "Christopher Nkunku", p: "ST", a: 28, v: 22.5, r: 83 },
    { n: "Maxime Est\xE8ve", p: "CB", a: 23, v: 20.3, r: 82 },
    { n: "Nicolas Seiwald", p: "CDM", a: 24, v: 20.3, r: 82 },
    { n: "David Raum", p: "LB", a: 27, v: 18, r: 82 },
    { n: "Neil El Aynaoui", p: "CM", a: 24, v: 16.5, r: 81 },
    { n: "Rocco Reitz", p: "CM", a: 23, v: 16.5, r: 81 },
    { n: "Ezechiel Banzuzi", p: "CM", a: 20, v: 14.3, r: 80 },
    { n: "Abdoul Kon\xE9", p: "CB", a: 20, v: 12, r: 79 },
    { n: "Andrija Maksimovic", p: "CAM", a: 18, v: 9.8, r: 78 },
    { n: "Marc Guiu", p: "ST", a: 19, v: 9.8, r: 78 },
    { n: "Ridle Baku", p: "RB", a: 27, v: 9.8, r: 78 },
    { n: "Benjamin Henrichs", p: "RB", a: 28, v: 7.5, r: 77 },
    { n: "Maarten Vandevoordt", p: "GK", a: 23, v: 6.8, r: 76 },
    { n: "Lukas Klostermann", p: "CB", a: 29, v: 6.4, r: 76 },
    { n: "Willi Orb\xE1n", p: "CB", a: 33, v: 4.5, r: 74 },
    { n: "Tidiam Gomis", p: "LW", a: 19, v: 3.8, r: 73 },
    { n: "Adri Mehmeti", p: "CM", a: 16, v: 2.3, r: 70 },
    { n: "Max Finkgr\xE4fe", p: "LB", a: 21, v: 2.3, r: 70 },
    { n: "Christopher Lenz", p: "LM", a: 29, v: 1.5, r: 68 }
  ],
  "RB Salzburg": [
    { n: "Karim Konat\xE9", p: "ST", a: 21, v: 9.8, r: 78 },
    { n: "Edmund Baidoo", p: "ST", a: 19, v: 6.8, r: 76 },
    { n: "Maurits Kj\xE6rgaard", p: "CM", a: 22, v: 6.8, r: 76 },
    { n: "Souma\xEFla Diabat\xE9", p: "CDM", a: 21, v: 6.5, r: 76 },
    { n: "Yorbe Vertessen", p: "ST", a: 24, v: 4.5, r: 74 },
    { n: "Clement Bischoff", p: "LW", a: 20, v: 3.8, r: 73 },
    { n: "Jesper Lindstr\xF8m", p: "RW", a: 25, v: 3.8, r: 73 },
    { n: "Moussa Yeo", p: "RW", a: 21, v: 3.8, r: 73 },
    { n: "Sota Kitano", p: "RM", a: 21, v: 3.8, r: 73 },
    { n: "Damir Redzic", p: "RW", a: 22, v: 3, r: 72 },
    { n: "Umut Tohumcu", p: "CM", a: 21, v: 3, r: 72 },
    { n: "Frans Kr\xE4tzig", p: "LB", a: 22, v: 2.3, r: 70 },
    { n: "Nikolas Veratschnig", p: "RM", a: 22, v: 1.5, r: 68 },
    { n: "Tim Trummer", p: "RB", a: 20, v: 1.5, r: 68 },
    { n: "Christian Fr\xFCchtl", p: "GK", a: 25, v: 0.8, r: 64 }
  ],
  "Racing Santander": [
    { n: "Julen Agirrezabala", p: "GK", a: 25, v: 12, r: 79 },
    { n: "Jeanu\xEBl Belocian", p: "CB", a: 20, v: 9.8, r: 78 },
    { n: "Yassir Zabiri", p: "ST", a: 20, v: 7.5, r: 77 },
    { n: "I\xF1igo Vicente", p: "LW", a: 27, v: 4.5, r: 74 },
    { n: "Iv\xE1n Mart\xEDn", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Matteo Prati", p: "CDM", a: 22, v: 4.5, r: 74 },
    { n: "Gustavo Puerta", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Sergio Canales", p: "CAM", a: 34, v: 3.8, r: 73 },
    { n: "Andr\xE9s Mart\xEDn", p: "RW", a: 26, v: 3.6, r: 73 },
    { n: "Jokin Ezkieta", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Maguette Gueye", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Simon Eriksson", p: "GK", a: 19, v: 1.5, r: 68 }
  ],
  "Randers FC": [
    { n: "Simen Bolkan Nordli", p: "LW", a: 26, v: 2.9, r: 71 },
    { n: "Nikolas Dyhr", p: "LB", a: 24, v: 1.5, r: 68 }
  ],
  "Rangers": [
    { n: "Nicolas Raskin", p: "CDM", a: 24, v: 13.8, r: 80 },
    { n: "Badredine Bouanani", p: "RW", a: 21, v: 9.8, r: 78 },
    { n: "Emmanuel Fernandez", p: "CB", a: 24, v: 7.5, r: 77 },
    { n: "Youssef Chermiti", p: "ST", a: 21, v: 7.5, r: 77 },
    { n: "Djeidi Gassama", p: "LW", a: 22, v: 6, r: 76 },
    { n: "Mohamed Diomand\xE9", p: "CM", a: 24, v: 6, r: 76 },
    { n: "Dan Neil", p: "CM", a: 24, v: 4.5, r: 74 },
    { n: "Kosta Nedeljkovic", p: "RB", a: 20, v: 4.5, r: 74 },
    { n: "Tochi Chukwuani", p: "CDM", a: 22, v: 4.1, r: 73 },
    { n: "Ben Godfrey", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Tuur Rommens", p: "LB", a: 22, v: 3.8, r: 73 },
    { n: "Derek Cornelius", p: "CB", a: 28, v: 3.6, r: 73 },
    { n: "Ivor Pandur", p: "GK", a: 25, v: 3, r: 72 },
    { n: "Oliver Antman", p: "RW", a: 24, v: 3, r: 72 },
    { n: "Dujon Sterling", p: "RB", a: 26, v: 2.3, r: 70 },
    { n: "Nedim Bajrami", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Thelo Aasgaard", p: "CAM", a: 23, v: 2.3, r: 70 },
    { n: "Findlay Curtis", p: "LW", a: 19, v: 1.5, r: 68 }
  ],
  "Rapid Wien": [
    { n: "Nikolaus Wurmbrand", p: "RW", a: 19, v: 3.6, r: 73 },
    { n: "Serge-Philippe Raux-Yao", p: "CB", a: 26, v: 3.6, r: 73 },
    { n: "Romeo Amane", p: "CM", a: 22, v: 3, r: 72 },
    { n: "Matthias Seidl", p: "CM", a: 24, v: 2.9, r: 71 },
    { n: "Petter Nosa Dahl", p: "LW", a: 22, v: 2.3, r: 70 },
    { n: "Tobias Gulliksen", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Bendeg\xFAz Bolla", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Jannes Horn", p: "LB", a: 28, v: 1.4, r: 68 },
    { n: "Jonas Auer", p: "LB", a: 25, v: 1.4, r: 68 },
    { n: "Yusuf Demir", p: "RW", a: 22, v: 1.4, r: 68 },
    { n: "Louis Schaub", p: "RM", a: 31, v: 0.8, r: 64 },
    { n: "Niklas Hedl", p: "GK", a: 24, v: 0.8, r: 64 }
  ],
  "Rayo Vallecano": [
    { n: "Andrei Ra\u021Biu", p: "RB", a: 27, v: 14.3, r: 80 },
    { n: "Jorge de Frutos", p: "RW", a: 28, v: 9.8, r: 78 },
    { n: "Mujaid Sadick", p: "CB", a: 25, v: 6.8, r: 76 },
    { n: "Marash Kumbulla", p: "CB", a: 25, v: 5.7, r: 75 },
    { n: "Augusto Batalla", p: "GK", a: 29, v: 4.5, r: 74 },
    { n: "Luiz Felipe", p: "CB", a: 28, v: 4.3, r: 74 },
    { n: "Abdul Mumin", p: "CB", a: 27, v: 3.6, r: 73 },
    { n: "Isi Palaz\xF3n", p: "CF", a: 31, v: 2.9, r: 71 },
    { n: "Adri\xE0 Pedrosa", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Emil Audero", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Fran P\xE9rez", p: "RW", a: 23, v: 2.3, r: 70 },
    { n: "Pedro D\xEDaz", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Giorgi Tsitaishvili", p: "LW", a: 25, v: 2.1, r: 70 },
    { n: "\xC1lvaro Garc\xEDa", p: "LW", a: 33, v: 1.5, r: 68 },
    { n: "Carlos Mart\xEDn", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Dani C\xE1rdenas", p: "GK", a: 28, v: 1.5, r: 68 }
  ],
  "Real Betis": [
    { n: "Antony", p: "RW", a: 25, v: 32.3, r: 85 },
    { n: "Abde Ezzalzouli", p: "LW", a: 24, v: 24, r: 83 },
    { n: "Natan", p: "CB", a: 24, v: 20.3, r: 82 },
    { n: "Troy Parrott", p: "ST", a: 23, v: 18, r: 82 },
    { n: "Sergi Altimira", p: "CM", a: 24, v: 16.5, r: 81 },
    { n: "Cucho Hern\xE1ndez", p: "ST", a: 26, v: 14.3, r: 80 },
    { n: "Fran Garc\xEDa", p: "LB", a: 26, v: 9.8, r: 78 },
    { n: "Valent\xEDn G\xF3mez", p: "CB", a: 22, v: 9.8, r: 78 },
    { n: "\xC1lvaro Fidalgo", p: "CM", a: 28, v: 8.3, r: 77 },
    { n: "Giovani Lo Celso", p: "CAM", a: 29, v: 8.3, r: 77 },
    { n: "Nelson Deossa", p: "CM", a: 25, v: 7.5, r: 77 },
    { n: "Dani Ceballos", p: "CM", a: 29, v: 6.8, r: 76 },
    { n: "Pablo Fornals", p: "CM", a: 29, v: 6.8, r: 76 },
    { n: "Pablo Garc\xEDa", p: "RW", a: 19, v: 6.8, r: 76 },
    { n: "Facundo Bernal", p: "CDM", a: 22, v: 4.9, r: 74 },
    { n: "\xC1lvaro Valles", p: "GK", a: 28, v: 4.5, r: 74 },
    { n: "Rodrigo Riquelme", p: "LW", a: 25, v: 4.5, r: 74 },
    { n: "Diego Llorente", p: "CB", a: 32, v: 4.3, r: 74 },
    { n: "Junior Firpo", p: "LB", a: 29, v: 3.8, r: 73 },
    { n: "Marc Roca", p: "CDM", a: 29, v: 3.2, r: 72 },
    { n: "Aitor Ruibal", p: "RW", a: 29, v: 3, r: 72 },
    { n: "\xC1ngel Ortiz", p: "RB", a: 21, v: 3, r: 72 },
    { n: "Diego Conde", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Isco", p: "CAM", a: 33, v: 3, r: 72 },
    { n: "H\xE9ctor Beller\xEDn", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Pau L\xF3pez", p: "GK", a: 31, v: 2.3, r: 70 },
    { n: "Fran Vieites", p: "GK", a: 26, v: 1.4, r: 68 },
    { n: "Iker Losada", p: "CF", a: 24, v: 1.4, r: 68 },
    { n: "Youssouf Sabaly", p: "RB", a: 32, v: 1.4, r: 68 }
  ],
  "Real Madrid": [
    { n: "Kylian Mbapp\xE9", p: "ST", a: 27, v: 162, r: 94 },
    { n: "Vinicius Junior", p: "LW", a: 25, v: 121.5, r: 92 },
    { n: "Jude Bellingham", p: "CAM", a: 22, v: 113.3, r: 92 },
    { n: "Federico Valverde", p: "CM", a: 27, v: 97.5, r: 91 },
    { n: "Arda G\xFCler", p: "CAM", a: 20, v: 72.8, r: 90 },
    { n: "Aur\xE9lien Tchouam\xE9ni", p: "CDM", a: 26, v: 60.8, r: 89 },
    { n: "Yan Diomande", p: "LW", a: 19, v: 60.8, r: 89 },
    { n: "Dean Huijsen", p: "CB", a: 20, v: 52.5, r: 88 },
    { n: "Trent Alexander-Arnold", p: "RB", a: 27, v: 52.5, r: 88 },
    { n: "\xC1lvaro Carreras", p: "LB", a: 22, v: 48.8, r: 87 },
    { n: "Eduardo Camavinga", p: "CM", a: 23, v: 40.5, r: 86 },
    { n: "Ibrahima Konat\xE9", p: "CB", a: 26, v: 40.5, r: 86 },
    { n: "Marc Cucurella", p: "LB", a: 27, v: 40.5, r: 86 },
    { n: "Rodrygo", p: "RW", a: 24, v: 40.5, r: 86 },
    { n: "Brahim D\xEDaz", p: "RW", a: 26, v: 28.5, r: 84 },
    { n: "Endrick", p: "ST", a: 19, v: 28.5, r: 84 },
    { n: "Bernardo Silva", p: "CAM", a: 31, v: 21.8, r: 83 },
    { n: "Denzel Dumfries", p: "RB", a: 29, v: 20.3, r: 82 },
    { n: "\xC9der Milit\xE3o", p: "CB", a: 27, v: 20.3, r: 82 },
    { n: "Ra\xFAl Asencio", p: "CB", a: 22, v: 20.3, r: 82 },
    { n: "Thiago Pitarch", p: "CM", a: 18, v: 16.5, r: 81 },
    { n: "Thibaut Courtois", p: "GK", a: 33, v: 14.3, r: 80 },
    { n: "Andriy Lunin", p: "GK", a: 26, v: 12, r: 79 },
    { n: "Antonio R\xFCdiger", p: "CB", a: 32, v: 7.5, r: 77 },
    { n: "Jorge Cestero", p: "CM", a: 19, v: 6, r: 76 },
    { n: "Daniel Carvajal", p: "RB", a: 33, v: 4.5, r: 74 },
    { n: "Ferland Mendy", p: "LB", a: 30, v: 4.5, r: 74 },
    { n: "David Jim\xE9nez", p: "RB", a: 21, v: 3.8, r: 73 },
    { n: "Diego Aguado", p: "CB", a: 18, v: 3.8, r: 73 },
    { n: "Daniel Y\xE1\xF1ez", p: "RW", a: 18, v: 2.3, r: 70 }
  ],
  "Real Oviedo": [
    { n: "Ilyas Chaira", p: "LW", a: 24, v: 3, r: 72 },
    { n: "Aar\xF3n Escandell", p: "GK", a: 30, v: 2.3, r: 70 },
    { n: "Nacho Vidal", p: "RB", a: 30, v: 1.5, r: 68 }
  ],
  "Real Salt Lake": [
    { n: "Diego Luna", p: "LM", a: 22, v: 6.8, r: 76 },
    { n: "Morgan Guilavogui", p: "RW", a: 27, v: 3.8, r: 73 },
    { n: "Lukas Engel", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Dominik Marczuk", p: "RW", a: 22, v: 1.4, r: 68 }
  ],
  "Real Sociedad": [
    { n: "Takefusa Kubo", p: "RW", a: 24, v: 24, r: 83 },
    { n: "Mamadou Sarr", p: "CB", a: 20, v: 20.3, r: 82 },
    { n: "Mikel Oyarzabal", p: "ST", a: 28, v: 20.3, r: 82 },
    { n: "Jon Mart\xEDn", p: "CB", a: 19, v: 16.5, r: 81 },
    { n: "Ander Barrenetxea", p: "LW", a: 24, v: 14.3, r: 80 },
    { n: "Jon Aramburu", p: "RB", a: 23, v: 12, r: 79 },
    { n: "Sergio G\xF3mez", p: "LB", a: 25, v: 12, r: 79 },
    { n: "\xC1lex Remiro", p: "GK", a: 30, v: 11.3, r: 79 },
    { n: "H\xE9ctor Fort", p: "RB", a: 19, v: 9.8, r: 78 },
    { n: "Orri \xD3skarsson", p: "ST", a: 21, v: 9.8, r: 78 },
    { n: "Arsen Zakharyan", p: "CAM", a: 22, v: 8.3, r: 77 },
    { n: "Be\xF1at Turrientes", p: "CM", a: 23, v: 8.3, r: 77 },
    { n: "Luka Sucic", p: "CM", a: 23, v: 8.3, r: 77 },
    { n: "Igor Zubeldia", p: "CB", a: 28, v: 7.5, r: 77 },
    { n: "Yangel Herrera", p: "CM", a: 27, v: 7.5, r: 77 },
    { n: "Carlos Soler", p: "CM", a: 28, v: 6.8, r: 76 },
    { n: "Pablo Mar\xEDn", p: "CAM", a: 22, v: 6.8, r: 76 },
    { n: "Gon\xE7alo Guedes", p: "LW", a: 29, v: 4.5, r: 74 },
    { n: "Aihen Mu\xF1oz", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Gorka Carrera", p: "ST", a: 20, v: 2.3, r: 70 },
    { n: "Dani D\xEDaz", p: "RW", a: 19, v: 1.5, r: 68 },
    { n: "\xC1lvaro Odriozola", p: "RB", a: 30, v: 0.7, r: 63 }
  ],
  "Red Bull Bragantino": [
    { n: "Jhon Jhon", p: "CAM", a: 23, v: 8.6, r: 78 },
    { n: "Isidro Pitta", p: "ST", a: 26, v: 6, r: 76 },
    { n: "Rodriguinho", p: "CAM", a: 21, v: 4.5, r: 74 },
    { n: "Juninho Capixaba", p: "LB", a: 28, v: 4.3, r: 74 },
    { n: "Cleiton", p: "GK", a: 28, v: 3.8, r: 73 },
    { n: "Ignacio Sosa", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Eric Ramires", p: "CM", a: 25, v: 3, r: 72 },
    { n: "Gustavo Neves", p: "CM", a: 21, v: 3, r: 72 },
    { n: "Guzm\xE1n Rodr\xEDguez", p: "CB", a: 25, v: 3, r: 72 },
    { n: "Henry Mosquera", p: "LW", a: 24, v: 3, r: 72 },
    { n: "Vanderlan", p: "LB", a: 23, v: 3, r: 72 },
    { n: "Vinicinho", p: "LW", a: 21, v: 3, r: 72 },
    { n: "Agust\xEDn Sant'Anna", p: "RB", a: 28, v: 2.3, r: 70 },
    { n: "Jos\xE9 Andr\xE9s Hurtado", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "Jos\xE9 Herrera", p: "RW", a: 22, v: 2.3, r: 70 }
  ],
  "Red Star FC": [
    { n: "Th\xE9o Magnin", p: "RB", a: 22, v: 1.4, r: 68 }
  ],
  "Reims": [
    { n: "Joseph Okumu", p: "CB", a: 28, v: 5.7, r: 75 },
    { n: "Sergio Akieme", p: "LB", a: 28, v: 3.8, r: 73 },
    { n: "Mory Gbane", p: "CDM", a: 25, v: 3.2, r: 72 },
    { n: "Teddy Teuma", p: "CM", a: 32, v: 2.9, r: 71 },
    { n: "Yaya Fofana", p: "CM", a: 21, v: 2.9, r: 71 },
    { n: "Hafiz Umar Ibrahim", p: "ST", a: 20, v: 2.3, r: 70 },
    { n: "Mohamed Daramy", p: "LW", a: 23, v: 2.3, r: 70 },
    { n: "Hiroki Sekine", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "Remo": [
    { n: "Leonel Picco", p: "CDM", a: 27, v: 2.4, r: 71 },
    { n: "Jo\xE3o Lucas", p: "RB", a: 27, v: 1.5, r: 68 }
  ],
  "Rennes": [
    { n: "Charlie Cresswell", p: "CB", a: 23, v: 20.3, r: 82 },
    { n: "Est\xE9ban Lepaul", p: "ST", a: 25, v: 16.5, r: 81 },
    { n: "Eliezer Mayenda", p: "ST", a: 20, v: 14.3, r: 80 },
    { n: "Djaoui Ciss\xE9", p: "CM", a: 21, v: 12, r: 79 },
    { n: "Anthony Rouault", p: "CB", a: 24, v: 9.8, r: 78 },
    { n: "Quentin Merlin", p: "LB", a: 23, v: 9.8, r: 78 },
    { n: "Sebastian Szymanski", p: "CAM", a: 26, v: 9.8, r: 78 },
    { n: "Abdelhamid Ait Boudlal", p: "CB", a: 19, v: 8.3, r: 77 },
    { n: "Ludovic Blas", p: "RM", a: 28, v: 8.3, r: 77 },
    { n: "Mahdi Camara", p: "CM", a: 27, v: 8.3, r: 77 },
    { n: "Valentin Rongier", p: "CM", a: 31, v: 7.5, r: 77 },
    { n: "Brice Samba", p: "GK", a: 31, v: 6.8, r: 76 },
    { n: "Mousa Tamari", p: "RW", a: 28, v: 6.8, r: 76 },
    { n: "Boulaye Dia", p: "ST", a: 29, v: 6, r: 76 },
    { n: "Issa Soumar\xE9", p: "LW", a: 25, v: 6, r: 76 },
    { n: "Przemyslaw Frankowski", p: "RB", a: 30, v: 6, r: 76 },
    { n: "Mahamadou Nagida", p: "LB", a: 20, v: 4.5, r: 74 },
    { n: "Christopher Wooh", p: "CB", a: 24, v: 4.3, r: 74 },
    { n: "Adrien Thomasson", p: "CM", a: 32, v: 3.8, r: 73 },
    { n: "Arnaud Nordin", p: "RW", a: 27, v: 3, r: 72 },
    { n: "Bryan Reynolds", p: "RB", a: 24, v: 3, r: 72 },
    { n: "El\xEDas Legendre Qui\xF1\xF3nez", p: "RW", a: 17, v: 1.5, r: 68 }
  ],
  "Ried": [
    { n: "Ante Bajic", p: "RM", a: 30, v: 0.8, r: 64 },
    { n: "Fabian Rossdorfer", p: "LM", a: 18, v: 0.8, r: 64 },
    { n: "Philipp Pomer", p: "LM", a: 26, v: 0.8, r: 64 }
  ],
  "Rijeka": [
    { n: "Toni Fruk", p: "CAM", a: 24, v: 7.5, r: 77 },
    { n: "Niko Jankovic", p: "CAM", a: 24, v: 5, r: 75 },
    { n: "Samuele Vignato", p: "CAM", a: 21, v: 2.3, r: 70 },
    { n: "Tiago Dantas", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Ante Orec", p: "RB", a: 24, v: 1.5, r: 68 },
    { n: "Martin Zlomislic", p: "GK", a: 27, v: 1.5, r: 68 }
  ],
  "Rio Ave": [
    { n: "Clayton", p: "ST", a: 26, v: 6, r: 76 },
    { n: "Andr\xE9 Luiz", p: "RW", a: 23, v: 4.5, r: 74 },
    { n: "Andreas Ntoi", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Cezary Miszta", p: "GK", a: 24, v: 2.3, r: 70 },
    { n: "Marios Vrousai", p: "RB", a: 27, v: 2.3, r: 70 },
    { n: "Diogo Bezerra", p: "RW", a: 23, v: 1.5, r: 68 },
    { n: "Leonardo Buta", p: "LB", a: 23, v: 1.5, r: 68 },
    { n: "Omar Richards", p: "LB", a: 27, v: 1.5, r: 68 },
    { n: "Rafael Lobato", p: "RW", a: 19, v: 1.4, r: 68 }
  ],
  "Rizespor": [
    { n: "Yahia Fofana", p: "GK", a: 25, v: 3.8, r: 73 },
    { n: "Can Bozdogan", p: "CM", a: 24, v: 2.9, r: 71 },
    { n: "Qazim Laci", p: "CM", a: 29, v: 2.3, r: 70 },
    { n: "Taha \u015Eahin", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Valentin Mih\u0103il\u0103", p: "LW", a: 25, v: 2.3, r: 70 },
    { n: "Dal Varesanovic", p: "CAM", a: 24, v: 2.1, r: 70 },
    { n: "Mithat Pala", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Ivo Grbic", p: "GK", a: 29, v: 1.4, r: 68 }
  ],
  "Rodez": [],
  "Roma": [
    { n: "Manu Kon\xE9", p: "CM", a: 24, v: 40.5, r: 86 },
    { n: "Wesley", p: "RB", a: 22, v: 32.3, r: 85 },
    { n: "Rodrigo Mora", p: "CAM", a: 18, v: 30.8, r: 85 },
    { n: "Donyell Malen", p: "ST", a: 26, v: 28.5, r: 84 },
    { n: "Evan Ndicka", p: "CB", a: 26, v: 28.5, r: 84 },
    { n: "Mat\xEDas Soul\xE9", p: "RW", a: 22, v: 28.5, r: 84 },
    { n: "Mile Svilar", p: "GK", a: 26, v: 28.5, r: 84 },
    { n: "Santiago Castro", p: "ST", a: 21, v: 28.5, r: 84 },
    { n: "Konstantinos Koulierakis", p: "CB", a: 22, v: 20.3, r: 82 },
    { n: "Niccol\xF2 Pisilli", p: "CM", a: 21, v: 16.5, r: 81 },
    { n: "Leonardo Balerdi", p: "CB", a: 26, v: 14.3, r: 80 },
    { n: "Daniele Ghilardi", p: "CB", a: 22, v: 12, r: 79 },
    { n: "Gianluca Mancini", p: "CB", a: 29, v: 12, r: 79 },
    { n: "Nahuel Molina", p: "RB", a: 27, v: 12, r: 79 },
    { n: "Zeki \xC7elik", p: "RB", a: 28, v: 9.8, r: 78 },
    { n: "Lorenzo Pellegrini", p: "CAM", a: 29, v: 7.5, r: 77 },
    { n: "Devyne Rensch", p: "RB", a: 22, v: 6.8, r: 76 },
    { n: "Paulo Dybala", p: "CF", a: 32, v: 6.4, r: 76 },
    { n: "Mario Hermoso", p: "CB", a: 30, v: 6, r: 76 },
    { n: "Bryan Cristante", p: "CDM", a: 30, v: 5.7, r: 75 },
    { n: "Lorenzo Venturino", p: "RW", a: 19, v: 3.8, r: 73 },
    { n: "Marten de Roon", p: "CDM", a: 34, v: 2.6, r: 71 }
  ],
  "Rude\u0161": [],
  "Sabadell": [],
  "Saint-\xC9tienne": [
    { n: "Zuriko Davitashvili", p: "LW", a: 24, v: 8.3, r: 77 },
    { n: "Augustine Boakye", p: "CAM", a: 25, v: 4.5, r: 74 },
    { n: "Djylian N'Guessan", p: "ST", a: 17, v: 3.8, r: 73 },
    { n: "K\xE9vin Pedro", p: "RB", a: 19, v: 3, r: 72 },
    { n: "Gautier Larsonneur", p: "GK", a: 28, v: 2.3, r: 70 },
    { n: "Igor Miladinovic", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Irvin Cardona", p: "RW", a: 28, v: 2.3, r: 70 },
    { n: "Yvann Ma\xE7on", p: "RB", a: 27, v: 1.4, r: 68 },
    { n: "Ben Old", p: "LB", a: 23, v: 0.8, r: 64 }
  ],
  "Sampdoria": [
    { n: "Antoine Makoumbou", p: "CDM", a: 27, v: 3.2, r: 72 },
    { n: "Salvatore Esposito", p: "CDM", a: 25, v: 2.4, r: 71 },
    { n: "Lorenzo Insigne", p: "LW", a: 34, v: 1.4, r: 68 },
    { n: "Yann Karamoh", p: "LW", a: 27, v: 1.4, r: 68 }
  ],
  "Samsunspor": [
    { n: "Carlo Holse", p: "CAM", a: 26, v: 6, r: 76 },
    { n: "Cherif Ndiaye", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Marius Mouandilmadji", p: "ST", a: 27, v: 3.8, r: 73 },
    { n: "Afonso Sousa", p: "CAM", a: 25, v: 3, r: 72 },
    { n: "Mohamed Bayo", p: "ST", a: 27, v: 3, r: 72 },
    { n: "Joe Mendes", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Logi T\xF3masson", p: "LB", a: 25, v: 2.3, r: 70 },
    { n: "Olivier Ntcham", p: "CM", a: 29, v: 2.3, r: 70 },
    { n: "Elliot Watt", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "\u0130rfan Can E\u011Fribayat", p: "GK", a: 27, v: 1.5, r: 68 },
    { n: "Okan Kocuk", p: "GK", a: 30, v: 1.5, r: 68 },
    { n: "Kadeem Harris", p: "LM", a: 30, v: 0.7, r: 64 }
  ],
  "San Diego FC": [
    { n: "Anders Dreyer", p: "RW", a: 27, v: 12, r: 79 },
    { n: "Hirving Lozano", p: "LW", a: 30, v: 3.8, r: 73 },
    { n: "Onni Valakari", p: "CAM", a: 26, v: 3.8, r: 73 },
    { n: "Marcus Ingvartsen", p: "ST", a: 29, v: 3.6, r: 73 },
    { n: "Luca Bombino", p: "LB", a: 19, v: 2.3, r: 70 },
    { n: "CJ dos Santos", p: "GK", a: 25, v: 0.8, r: 64 },
    { n: "David Vazquez", p: "RM", a: 19, v: 0.8, r: 64 },
    { n: "Jasper L\xF6ffelsend", p: "RM", a: 28, v: 0.7, r: 64 }
  ],
  "San Jose Earthquakes": [
    { n: "Timo Werner", p: "ST", a: 29, v: 7.8, r: 77 },
    { n: "Cristian Arango", p: "ST", a: 30, v: 5.7, r: 75 },
    { n: "Hern\xE1n L\xF3pez Mu\xF1oz", p: "CAM", a: 25, v: 3.6, r: 73 },
    { n: "DeJuan Jones", p: "LB", a: 28, v: 2.3, r: 70 },
    { n: "Angus Gunn", p: "GK", a: 29, v: 1.5, r: 68 }
  ],
  "Santa Clara": [
    { n: "MT", p: "CB", a: 24, v: 3.8, r: 73 },
    { n: "Gabriel Batista", p: "GK", a: 27, v: 3, r: 72 },
    { n: "Gabriel Silva", p: "LW", a: 23, v: 3, r: 72 },
    { n: "Pedro Ferreira", p: "CDM", a: 27, v: 2.4, r: 71 },
    { n: "Vin\xEDcius Lopes", p: "RW", a: 26, v: 2.3, r: 70 },
    { n: "Lucas Soares", p: "RB", a: 27, v: 1.5, r: 68 }
  ],
  "Santos": [
    { n: "Gabriel Braz\xE3o", p: "GK", a: 25, v: 9.8, r: 78 },
    { n: "Neymar", p: "CAM", a: 33, v: 8.3, r: 77 },
    { n: "Luca Meirelles", p: "ST", a: 18, v: 7.8, r: 77 },
    { n: "\xC1lvaro Barreal", p: "LW", a: 25, v: 6, r: 76 },
    { n: "Benjam\xEDn Rollheiser", p: "RW", a: 25, v: 6, r: 76 },
    { n: "Gabriel Menino", p: "CM", a: 25, v: 6, r: 76 },
    { n: "Gabriel Bontempo", p: "CM", a: 20, v: 4.5, r: 74 },
    { n: "Miguelito", p: "CAM", a: 21, v: 3.8, r: 73 },
    { n: "Robinho Junior", p: "RW", a: 18, v: 3.8, r: 73 },
    { n: "Rony", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Gabriel Barbosa", p: "ST", a: 29, v: 3, r: 72 },
    { n: "Vinicius Lira", p: "LB", a: 18, v: 3, r: 72 },
    { n: "JP Chermont", p: "RB", a: 19, v: 2.1, r: 70 },
    { n: "Leonardo Godoy", p: "RB", a: 30, v: 2.1, r: 70 },
    { n: "Lima", p: "CAM", a: 29, v: 2.1, r: 70 },
    { n: "Igor Vin\xEDcius", p: "RB", a: 28, v: 1.5, r: 68 },
    { n: "Mayke", p: "RB", a: 33, v: 1.5, r: 68 }
  ],
  "Santos Laguna": [
    { n: "Ezequiel Bullaude", p: "CAM", a: 25, v: 3, r: 72 },
    { n: "Carlos Acevedo", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Aldo L\xF3pez", p: "CDM", a: 25, v: 2, r: 70 },
    { n: "Ramiro Sordo", p: "RW", a: 25, v: 1.5, r: 68 }
  ],
  "Sassuolo": [
    { n: "Isma\xEBl Kon\xE9", p: "CM", a: 23, v: 16.5, r: 81 },
    { n: "Armand Laurient\xE9", p: "LW", a: 27, v: 14.3, r: 80 },
    { n: "Cristian Volpato", p: "CAM", a: 22, v: 8.3, r: 77 },
    { n: "Jay Idzes", p: "CB", a: 25, v: 8.3, r: 77 },
    { n: "Kristian Thorstvedt", p: "CM", a: 26, v: 8.3, r: 77 },
    { n: "Darryl Bakola", p: "CAM", a: 18, v: 6.8, r: 76 },
    { n: "Vasilije Ad\u017Ei\u0107", p: "CAM", a: 19, v: 6.8, r: 76 },
    { n: "Luca Lipani", p: "CDM", a: 20, v: 6.1, r: 76 },
    { n: "Arijanet Muri\u0107", p: "GK", a: 27, v: 6, r: 76 },
    { n: "Domenico Berardi", p: "RW", a: 31, v: 6, r: 76 },
    { n: "Duje Caleta-Car", p: "CB", a: 29, v: 5.7, r: 75 },
    { n: "Kieron Bowie", p: "ST", a: 23, v: 4.5, r: 74 },
    { n: "Fedde Leysen", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Josh Doig", p: "LB", a: 23, v: 3.8, r: 73 },
    { n: "Sebastian Walukiewicz", p: "RB", a: 25, v: 3.8, r: 73 },
    { n: "Ignace Van der Brempt", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Nicholas Pierini", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Stefano Turati", p: "GK", a: 24, v: 2.3, r: 70 },
    { n: "Ulisses Garcia", p: "LB", a: 29, v: 2.3, r: 70 },
    { n: "Edoardo Pieragnolo", p: "LB", a: 22, v: 1.5, r: 68 },
    { n: "Woyo Coulibaly", p: "RB", a: 26, v: 1.5, r: 68 },
    { n: "Nemanja Mati\u0107", p: "CDM", a: 38, v: 1.3, r: 67 }
  ],
  "Schalke 04": [
    { n: "Hee-chan Hwang", p: "ST", a: 29, v: 6.8, r: 76 },
    { n: "Maximilian W\xF6ber", p: "CB", a: 27, v: 6.4, r: 76 },
    { n: "Junior Dina Ebimbe", p: "RM", a: 25, v: 4.5, r: 74 },
    { n: "Moussa Sylla", p: "ST", a: 26, v: 3.8, r: 73 },
    { n: "Robin Gosens", p: "LB", a: 31, v: 3.8, r: 73 },
    { n: "Junior Adamu", p: "ST", a: 24, v: 3, r: 72 },
    { n: "Mertcan Ayhan", p: "CB", a: 19, v: 3, r: 72 },
    { n: "Soufiane El-Faouzi", p: "CM", a: 23, v: 3, r: 72 },
    { n: "Vitalie Becker", p: "LB", a: 20, v: 2.3, r: 70 },
    { n: "Ron Schallenberg", p: "CDM", a: 27, v: 1.6, r: 68 },
    { n: "Satoshi Tanaka", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Kenan Karaman", p: "CAM", a: 31, v: 1.5, r: 68 },
    { n: "Edin Dzeko", p: "ST", a: 40, v: 0.8, r: 65 },
    { n: "Finn Porath", p: "RM", a: 28, v: 0.8, r: 64 },
    { n: "Tobias Mohr", p: "LM", a: 28, v: 0.8, r: 64 },
    { n: "Yannick Tonye", p: "RM", a: 21, v: 0.7, r: 64 }
  ],
  "Seattle Sounders": [
    { n: "\xC1lex Rold\xE1n", p: "RB", a: 29, v: 3, r: 72 },
    { n: "Cristian Rold\xE1n", p: "CM", a: 30, v: 3, r: 72 },
    { n: "Jes\xFAs Ferreira", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Nouhou", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Jordan Morris", p: "ST", a: 31, v: 2.9, r: 71 },
    { n: "Albert Rusn\xE1k", p: "CAM", a: 31, v: 2.3, r: 70 },
    { n: "Hassani Dotson", p: "CM", a: 28, v: 2.3, r: 70 },
    { n: "Paul Arriola", p: "RW", a: 30, v: 2.3, r: 70 },
    { n: "Paul Rothrock", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Ryan Kent", p: "LW", a: 29, v: 2.1, r: 70 },
    { n: "Georgi Minoungou", p: "RW", a: 23, v: 1.5, r: 68 }
  ],
  "Servette": [
    { n: "David Datro Fofana", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Timoth\xE9 Cognat", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Lilian Njoh", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Ablie Jallow", p: "RM", a: 27, v: 0.8, r: 64 },
    { n: "Malek Ishuayed", p: "LM", a: 18, v: 0.8, r: 64 },
    { n: "Miroslav Stevanovic", p: "RM", a: 35, v: 0.8, r: 64 }
  ],
  "Sevilla": [
    { n: "Youssouf Fofana", p: "CDM", a: 26, v: 18.6, r: 82 },
    { n: "Lucien Agoum\xE9", p: "CDM", a: 23, v: 12.2, r: 80 },
    { n: "Lucas Stassin", p: "ST", a: 21, v: 12, r: 79 },
    { n: "Jos\xE9 \xC1ngel Carmona", p: "RB", a: 23, v: 9.8, r: 78 },
    { n: "Rub\xE9n Vargas", p: "LW", a: 27, v: 9.8, r: 78 },
    { n: "F\xE9lix Correia", p: "LW", a: 24, v: 8.3, r: 77 },
    { n: "Arouna Sangante", p: "CB", a: 23, v: 6.8, r: 76 },
    { n: "Kike Salas", p: "CB", a: 23, v: 6.8, r: 76 },
    { n: "Gabriel Suazo", p: "LB", a: 28, v: 6, r: 76 },
    { n: "Giorgi Kochorashvili", p: "CM", a: 26, v: 3.8, r: 73 },
    { n: "Isaac Romero", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Juan Iglesias", p: "RB", a: 27, v: 3.8, r: 73 },
    { n: "Chidera Ejuke", p: "LW", a: 27, v: 3, r: 72 },
    { n: "Neal Maupay", p: "ST", a: 29, v: 3, r: 72 },
    { n: "Odysseas Vlachodimos", p: "GK", a: 31, v: 3, r: 72 },
    { n: "Peque Fern\xE1ndez", p: "CF", a: 23, v: 2.9, r: 71 },
    { n: "Fran Gonz\xE1lez", p: "GK", a: 20, v: 2.3, r: 70 },
    { n: "Julio D\xEDaz", p: "LB", a: 20, v: 1.5, r: 68 }
  ],
  "Sheffield United": [
    { n: "Liam Kitching", p: "CB", a: 26, v: 9.8, r: 78 },
    { n: "Sydie Peck", p: "CM", a: 21, v: 9.8, r: 78 },
    { n: "Harrison Burrows", p: "LB", a: 23, v: 8.3, r: 77 },
    { n: "Michael Cooper", p: "GK", a: 26, v: 8.3, r: 77 },
    { n: "Tyrese Campbell", p: "ST", a: 26, v: 7.5, r: 77 },
    { n: "Tom Cannon", p: "ST", a: 23, v: 6.8, r: 76 },
    { n: "Mark McGuinness", p: "CB", a: 24, v: 6, r: 76 },
    { n: "Andre Brooks", p: "CM", a: 22, v: 3.8, r: 73 },
    { n: "Callum O'Hare", p: "CAM", a: 27, v: 3.8, r: 73 },
    { n: "Chiedozie Ogbene", p: "RW", a: 28, v: 3.8, r: 73 },
    { n: "Femi Seriki", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "Japhet Tanganga", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Tahith Chong", p: "CAM", a: 26, v: 3.8, r: 73 },
    { n: "Romelle Donovan", p: "RW", a: 19, v: 3, r: 72 },
    { n: "Tom Davies", p: "CM", a: 27, v: 2.3, r: 70 },
    { n: "Kalvin Phillips", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "Matt Doherty", p: "RB", a: 33, v: 1.5, r: 68 },
    { n: "Sam McCallum", p: "LB", a: 25, v: 1.5, r: 68 },
    { n: "Jamie Shackleton", p: "RB", a: 26, v: 0.8, r: 64 }
  ],
  "Silkeborg IF": [
    { n: "Callum McCowatt", p: "CAM", a: 26, v: 1.5, r: 68 }
  ],
  "Sint-Truiden": [
    { n: "Kota Takai", p: "CB", a: 21, v: 3.8, r: 73 },
    { n: "Leo Kokubo", p: "GK", a: 24, v: 3.8, r: 73 },
    { n: "Ryotaro Ito", p: "CAM", a: 27, v: 3.8, r: 73 },
    { n: "Robert-Jan Vanwesemael", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Taiga Hata", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Arbnor Muja", p: "RW", a: 27, v: 1.5, r: 68 },
    { n: "Nathana\xEBl Mbuku", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Ryoya Ogawa", p: "LB", a: 29, v: 1.4, r: 68 }
  ],
  "Sion": [
    { n: "Ilyas Chouaref", p: "LW", a: 25, v: 2.9, r: 71 },
    { n: "Anton Miranchuk", p: "CAM", a: 30, v: 2.1, r: 70 },
    { n: "Th\xE9o Berdayes", p: "RW", a: 23, v: 1.5, r: 68 },
    { n: "Anthony Racioppi", p: "GK", a: 27, v: 0.8, r: 64 },
    { n: "Donat Rrudhani", p: "RM", a: 26, v: 0.8, r: 64 },
    { n: "Timothy Fayulu", p: "GK", a: 26, v: 0.7, r: 64 }
  ],
  "Slaven Belupo": [
    { n: "Adriano Jagusic", p: "CAM", a: 20, v: 3.8, r: 73 },
    { n: "Luka Lucic", p: "LM", a: 30, v: 0.7, r: 64 }
  ],
  "Sochaux": [],
  "Southampton": [
    { n: "Finn Azaz", p: "CAM", a: 25, v: 14.3, r: 80 },
    { n: "Aaron Ramsdale", p: "GK", a: 27, v: 9.8, r: 78 },
    { n: "Caspar Jander", p: "CM", a: 22, v: 9.8, r: 78 },
    { n: "L\xE9o Scienza", p: "CAM", a: 27, v: 8.3, r: 77 },
    { n: "Flynn Downes", p: "CDM", a: 26, v: 8.1, r: 77 },
    { n: "Gavin Bazunu", p: "GK", a: 23, v: 7.5, r: 77 },
    { n: "Cameron Archer", p: "ST", a: 24, v: 6.8, r: 76 },
    { n: "Tom Fellows", p: "RM", a: 22, v: 6.8, r: 76 },
    { n: "Elias Jelert", p: "RB", a: 22, v: 6, r: 76 },
    { n: "James Ward-Prowse", p: "CM", a: 31, v: 4.5, r: 74 },
    { n: "Keven Schlotterbeck", p: "CB", a: 28, v: 4.5, r: 74 },
    { n: "Nathan Wood", p: "CB", a: 23, v: 4.5, r: 74 },
    { n: "Joe Aribo", p: "CM", a: 29, v: 4.3, r: 74 },
    { n: "Mads Roerslev", p: "RB", a: 26, v: 3.8, r: 73 },
    { n: "Samuel Edozie", p: "LW", a: 22, v: 3.8, r: 73 },
    { n: "Cyle Larin", p: "ST", a: 30, v: 3, r: 72 },
    { n: "Joshua Quarshie", p: "CB", a: 21, v: 3, r: 72 },
    { n: "Lewis Dobbin", p: "LW", a: 22, v: 3, r: 72 },
    { n: "Ross Stewart", p: "ST", a: 29, v: 2.9, r: 71 },
    { n: "Ryan Manning", p: "LB", a: 29, v: 2.3, r: 70 },
    { n: "Welington", p: "LB", a: 24, v: 2.3, r: 70 },
    { n: "Daniel Peretz", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Kuryu Matsuki", p: "CAM", a: 22, v: 1.5, r: 68 },
    { n: "Ryan Fraser", p: "LW", a: 31, v: 1.4, r: 68 }
  ],
  "Sparta Rotterdam": [
    { n: "Marvin Young", p: "CB", a: 20, v: 3.8, r: 73 },
    { n: "Tobias Lauritsen", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Jo\xEBl Drommel", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Casper Terho", p: "RW", a: 22, v: 1.5, r: 68 },
    { n: "Lushendry Martes", p: "RB", a: 17, v: 1.5, r: 68 },
    { n: "Shunsuke Mito", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Mitchell van Bergen", p: "RW", a: 26, v: 1.4, r: 68 }
  ],
  "Sporting CP": [
    { n: "Gon\xE7alo In\xE1cio", p: "CB", a: 24, v: 32.3, r: 85 },
    { n: "Zeno Debast", p: "CB", a: 22, v: 24, r: 83 },
    { n: "Luis Su\xE1rez", p: "ST", a: 28, v: 22.5, r: 83 },
    { n: "Maxi Ara\xFAjo", p: "LB", a: 25, v: 20.3, r: 82 },
    { n: "Geny Catamo", p: "RW", a: 24, v: 16.5, r: 81 },
    { n: "Fotis Ioannidis", p: "ST", a: 25, v: 14.3, r: 80 },
    { n: "Lu\xEDs Guilherme", p: "RW", a: 19, v: 13.5, r: 80 },
    { n: "Eduardo Quaresma", p: "CB", a: 23, v: 12, r: 79 },
    { n: "Jo\xE3o Sim\xF5es", p: "CM", a: 18, v: 12, r: 79 },
    { n: "Iv\xE1n Fresneda", p: "RB", a: 21, v: 9.8, r: 78 },
    { n: "Georgios Vagiannidis", p: "RB", a: 24, v: 9, r: 78 },
    { n: "Issa Doumbia", p: "CM", a: 22, v: 6.8, r: 76 },
    { n: "Rui Silva", p: "GK", a: 31, v: 6, r: 76 },
    { n: "Nuno Santos", p: "LB", a: 30, v: 3.8, r: 73 },
    { n: "Matheus Reis", p: "LB", a: 30, v: 2.3, r: 70 },
    { n: "Salvador Blopa", p: "RB", a: 18, v: 2.3, r: 70 },
    { n: "Jesse Derry", p: "LW", a: 18, v: 1.5, r: 68 }
  ],
  "Sporting Gij\xF3n": [
    { n: "C\xE9sar Gelabert", p: "CAM", a: 25, v: 2.3, r: 70 },
    { n: "Gaspar Campos", p: "LW", a: 25, v: 1.5, r: 68 },
    { n: "Guille Rosas", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Rub\xE9n Y\xE1\xF1ez", p: "GK", a: 32, v: 0.7, r: 64 }
  ],
  "Sporting Kansas City": [
    { n: "Dejan Jovelji\u0107", p: "ST", a: 26, v: 5.3, r: 75 },
    { n: "Manu Garc\xEDa", p: "CAM", a: 27, v: 3, r: 72 },
    { n: "Shapi Suleymanov", p: "RW", a: 26, v: 2.3, r: 70 },
    { n: "Jake Davis", p: "RB", a: 23, v: 1.5, r: 68 }
  ],
  "St Johnstone": [
    { n: "Franciszek Franczak", p: "RM", a: 18, v: 0.8, r: 64 },
    { n: "Stephen Duke-McKenna", p: "RM", a: 25, v: 0.7, r: 64 }
  ],
  "St Mirren": [],
  "St. Gallen": [
    { n: "Cyrill May", p: "CB", a: 18, v: 3.8, r: 73 },
    { n: "Christian Witzig", p: "LM", a: 22, v: 3, r: 72 },
    { n: "Carlo Boukhalfa", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Corsin Konietzke", p: "CAM", a: 19, v: 1.5, r: 68 },
    { n: "Lawrence Ati Zigi", p: "GK", a: 29, v: 1.5, r: 68 },
    { n: "Jason Parente", p: "LM", a: 17, v: 0.8, r: 64 },
    { n: "Lukas G\xF6rtler", p: "RM", a: 31, v: 0.8, r: 64 }
  ],
  "St. Louis City": [
    { n: "Damion Downs", p: "ST", a: 21, v: 4.5, r: 74 },
    { n: "Marcel Hartel", p: "CM", a: 29, v: 3.8, r: 73 },
    { n: "Eduard L\xF6wen", p: "CM", a: 28, v: 3, r: 72 },
    { n: "Chris Durkin", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Daniel Edelman", p: "CDM", a: 22, v: 1.6, r: 68 },
    { n: "Conrad Wallem", p: "RM", a: 25, v: 1.5, r: 68 },
    { n: "Tomas Totland", p: "RB", a: 26, v: 1.4, r: 68 },
    { n: "MyKhi Joyner", p: "LM", a: 19, v: 0.8, r: 64 },
    { n: "Roman B\xFCrki", p: "GK", a: 35, v: 0.8, r: 64 }
  ],
  "St. Pauli": [
    { n: "Joel Chima Fujita", p: "CM", a: 23, v: 8.3, r: 77 },
    { n: "Eric Smith", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Nikola Vasilj", p: "GK", a: 30, v: 3.8, r: 73 },
    { n: "Arkadiusz Pyrka", p: "RB", a: 23, v: 3, r: 72 },
    { n: "Mathias Pereira Lage", p: "LW", a: 29, v: 3, r: 72 },
    { n: "Martijn Kaars", p: "ST", a: 26, v: 2.9, r: 71 },
    { n: "Danel Sinani", p: "CAM", a: 28, v: 2.3, r: 70 },
    { n: "Louis Oppie", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Youssoupha Niang", p: "RW", a: 19, v: 1.5, r: 68 },
    { n: "Connor Metcalfe", p: "CM", a: 26, v: 1.2, r: 67 }
  ],
  "Standard Li\xE8ge": [
    { n: "Matthieu Epolo", p: "GK", a: 20, v: 3.8, r: 73 },
    { n: "Marlon Fossey", p: "RB", a: 27, v: 3, r: 72 },
    { n: "Andi Zeqiri", p: "ST", a: 26, v: 2.9, r: 71 },
    { n: "Ryan Fosso", p: "CDM", a: 23, v: 1.6, r: 68 },
    { n: "Gustav Mortensen", p: "LB", a: 21, v: 1.5, r: 68 },
    { n: "Henry Lawrence", p: "RB", a: 24, v: 1.5, r: 68 }
  ],
  "Stoke City": [
    { n: "Justin Devenny", p: "CAM", a: 22, v: 9.8, r: 78 },
    { n: "Viktor Johansson", p: "GK", a: 27, v: 9.8, r: 78 },
    { n: "George Hirst", p: "ST", a: 26, v: 6.8, r: 76 },
    { n: "Divin Mubama", p: "ST", a: 21, v: 4.5, r: 74 },
    { n: "Jesurun Rak-Sakyi", p: "RW", a: 23, v: 4.5, r: 74 },
    { n: "Ben Wilmot", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Million Manhoef", p: "RW", a: 23, v: 3.8, r: 73 },
    { n: "Djibril Soumar\xE9", p: "CDM", a: 22, v: 3.2, r: 72 },
    { n: "R\xF3bert Bo\u017Een\xEDk", p: "ST", a: 26, v: 3, r: 72 },
    { n: "Tomas Rigo", p: "CM", a: 23, v: 3, r: 72 },
    { n: "Josh Wilson-Esbrand", p: "LB", a: 23, v: 2.9, r: 71 },
    { n: "Ato Ampah", p: "RW", a: 19, v: 2.3, r: 70 },
    { n: "Jun-ho Bae", p: "CAM", a: 22, v: 2.3, r: 70 },
    { n: "Eric-Junior Bocat", p: "LB", a: 26, v: 1.5, r: 68 },
    { n: "Junior Tchamadeu", p: "RB", a: 22, v: 1.5, r: 68 }
  ],
  "Strasbourg": [
    { n: "Joaqu\xEDn Panichelli", p: "ST", a: 23, v: 28.5, r: 84 },
    { n: "Karim Coulibaly", p: "CB", a: 18, v: 18, r: 82 },
    { n: "Mike Penders", p: "GK", a: 20, v: 18, r: 82 },
    { n: "Conrad Harder", p: "ST", a: 20, v: 16.5, r: 81 },
    { n: "Isma\xEBl Doukour\xE9", p: "CB", a: 22, v: 16.5, r: 81 },
    { n: "Martial Godo", p: "LW", a: 22, v: 14.3, r: 80 },
    { n: "Samir El Mourabet", p: "CM", a: 20, v: 14.3, r: 80 },
    { n: "Sebastian Nanasi", p: "LM", a: 23, v: 13.5, r: 80 },
    { n: "D\xE1rio Essugo", p: "CDM", a: 20, v: 12.2, r: 80 },
    { n: "Filip J\xF8rgensen", p: "GK", a: 23, v: 12, r: 79 },
    { n: "Lucas H\xF8gsberg", p: "CB", a: 19, v: 12, r: 79 },
    { n: "Gessime Yassine", p: "RW", a: 20, v: 8.3, r: 77 },
    { n: "Kendry P\xE1ez", p: "CAM", a: 18, v: 7.5, r: 77 },
    { n: "F\xE9lix Lemar\xE9chal", p: "CAM", a: 22, v: 6.8, r: 76 },
    { n: "Samuel Amo-Ameyaw", p: "RW", a: 19, v: 6.8, r: 76 },
    { n: "Maxi Oyedele", p: "CDM", a: 21, v: 4.1, r: 73 },
    { n: "Mateo Del Blanco", p: "LB", a: 22, v: 3.8, r: 73 },
    { n: "Oso", p: "LB", a: 22, v: 3.8, r: 73 },
    { n: "Deivid Washington", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Giovanni Reyna", p: "CAM", a: 23, v: 3, r: 72 },
    { n: "Mi\u0142osz Piekutowski", p: "GK", a: 19, v: 0.8, r: 64 }
  ],
  "Sturm Graz": [
    { n: "Alexander Prass", p: "LM", a: 22, v: 9.8, r: 78 },
    { n: "Nelson Weiper", p: "ST", a: 20, v: 8.3, r: 77 },
    { n: "Otar Kiteishvili", p: "CAM", a: 29, v: 4.5, r: 74 },
    { n: "Filip R\xF3zga", p: "CAM", a: 19, v: 2.3, r: 70 },
    { n: "Jacob Peter H\xF6dl", p: "RM", a: 18, v: 2.3, r: 70 },
    { n: "Jusuf Gazibegovic", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Jon Gorenc Stankovic", p: "CDM", a: 29, v: 2, r: 70 },
    { n: "Arjan Malic", p: "RB", a: 20, v: 1.5, r: 68 },
    { n: "Emir Karic", p: "LB", a: 28, v: 1.5, r: 68 },
    { n: "Stefan Hierl\xE4nder", p: "RM", a: 34, v: 0.8, r: 64 }
  ],
  "Stuttgart": [
    { n: "Angelo Stiller", p: "CDM", a: 24, v: 36.5, r: 86 },
    { n: "Jamie Leweling", p: "RW", a: 24, v: 32.3, r: 85 },
    { n: "Bilal El Khannouss", p: "CAM", a: 21, v: 26.3, r: 84 },
    { n: "Finn Jeltsch", p: "CB", a: 19, v: 24, r: 83 },
    { n: "Deniz Undav", p: "ST", a: 29, v: 18, r: 82 },
    { n: "Ermedin Demirovic", p: "ST", a: 27, v: 18, r: 82 },
    { n: "Ramon Hendriks", p: "CB", a: 24, v: 16.5, r: 81 },
    { n: "Maximilian Mittelst\xE4dt", p: "LB", a: 28, v: 14.3, r: 80 },
    { n: "Jeff Chabot", p: "CB", a: 27, v: 12, r: 79 },
    { n: "Tiago Tom\xE1s", p: "RW", a: 23, v: 12, r: 79 },
    { n: "Chris F\xFChrich", p: "LW", a: 27, v: 8.3, r: 77 },
    { n: "Dennis Seimen", p: "GK", a: 20, v: 8.3, r: 77 },
    { n: "Dzenan Pejcinovic", p: "ST", a: 20, v: 8.3, r: 77 },
    { n: "Josha Vagnoman", p: "RB", a: 25, v: 8.3, r: 77 },
    { n: "Lorenz Assignon", p: "RB", a: 25, v: 8.3, r: 77 },
    { n: "Luca Jaquez", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Atakan Karazor", p: "CDM", a: 29, v: 6.5, r: 76 },
    { n: "Jeremy Ar\xE9valo", p: "ST", a: 20, v: 6, r: 76 },
    { n: "Leo Sauer", p: "LW", a: 20, v: 6, r: 76 },
    { n: "Nikolas Nartey", p: "CM", a: 25, v: 6, r: 76 },
    { n: "Ameen Al-Dakhil", p: "CB", a: 23, v: 5.7, r: 75 },
    { n: "Grischa Pr\xF6mel", p: "CM", a: 30, v: 3, r: 72 },
    { n: "Leonidas Stergiou", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Justin Diehl", p: "LW", a: 21, v: 2.1, r: 70 },
    { n: "Dan-Axel Zagadou", p: "CB", a: 27, v: 1.7, r: 68 }
  ],
  "Sunderland": [
    { n: "Habib Diarra", p: "CM", a: 21, v: 26.3, r: 84 },
    { n: "Malick Fofana", p: "LW", a: 20, v: 24, r: 83 },
    { n: "Noah Sadiki", p: "CM", a: 21, v: 24, r: 83 },
    { n: "Brian Brobbey", p: "ST", a: 23, v: 20.3, r: 82 },
    { n: "Chemsdine Talbi", p: "RW", a: 20, v: 20.3, r: 82 },
    { n: "Chris Rigg", p: "CAM", a: 18, v: 20.3, r: 82 },
    { n: "Enzo Le F\xE9e", p: "CM", a: 25, v: 20.3, r: 82 },
    { n: "Robin Roefs", p: "GK", a: 22, v: 20.3, r: 82 },
    { n: "Trai Hume", p: "RB", a: 23, v: 18, r: 82 },
    { n: "Dan Ballard", p: "CB", a: 26, v: 16.5, r: 81 },
    { n: "Kevin Danso", p: "CB", a: 27, v: 16.5, r: 81 },
    { n: "Nordi Mukiele", p: "RB", a: 28, v: 14.3, r: 80 },
    { n: "Wilson Isidor", p: "ST", a: 25, v: 14.3, r: 80 },
    { n: "Nilson Angulo", p: "LW", a: 22, v: 13.5, r: 80 },
    { n: "Omar Alderete", p: "CB", a: 29, v: 12, r: 79 },
    { n: "Dayann Methalie", p: "LB", a: 19, v: 9.8, r: 78 },
    { n: "Romaine Mundle", p: "LW", a: 22, v: 6.8, r: 76 },
    { n: "Granit Xhaka", p: "CDM", a: 33, v: 6.5, r: 76 },
    { n: "Reinildo Mandava", p: "LB", a: 31, v: 3.8, r: 73 },
    { n: "Jocelin Ta Bi", p: "RW", a: 20, v: 2.3, r: 70 },
    { n: "Melker Ellborg", p: "GK", a: 22, v: 2.3, r: 70 },
    { n: "Abdoullah Ba", p: "RM", a: 22, v: 1.5, r: 68 },
    { n: "Thomas Meunier", p: "RB", a: 34, v: 1.5, r: 68 }
  ],
  "Swansea City": [
    { n: "\u017Dan Vipotnik", p: "ST", a: 23, v: 12, r: 79 },
    { n: "Malick Yalcouy\xE9", p: "CM", a: 20, v: 9.8, r: 78 },
    { n: "Gustavo Nunes", p: "LW", a: 20, v: 8.3, r: 77 },
    { n: "Jeremy Monga", p: "LW", a: 16, v: 8.3, r: 77 },
    { n: "Ben Cabango", p: "CB", a: 25, v: 7.5, r: 77 },
    { n: "Adam Idah", p: "ST", a: 24, v: 4.5, r: 74 },
    { n: "Zeidane Inoussa", p: "LW", a: 23, v: 4.5, r: 74 },
    { n: "Josh Tymon", p: "LB", a: 26, v: 3.8, r: 73 },
    { n: "Gon\xE7alo Franco", p: "CM", a: 25, v: 3, r: 72 },
    { n: "Leo Walta", p: "CAM", a: 22, v: 3, r: 72 },
    { n: "Liam Cullen", p: "CAM", a: 26, v: 2.3, r: 70 },
    { n: "Marko Stameni\u0107", p: "CM", a: 23, v: 2.3, r: 70 },
    { n: "Ronald", p: "RW", a: 24, v: 2.3, r: 70 },
    { n: "Oliver Cooper", p: "CAM", a: 26, v: 1.5, r: 68 }
  ],
  "S\xE3o Paulo": [
    { n: "Marcos Ant\xF4nio", p: "CM", a: 25, v: 9.8, r: 78 },
    { n: "Lucas Ferreira", p: "RW", a: 19, v: 5.7, r: 75 },
    { n: "Matheus Alves", p: "CAM", a: 20, v: 5.7, r: 75 },
    { n: "Pablo Maia", p: "CDM", a: 23, v: 4.1, r: 73 },
    { n: "Dami\xE1n Bobadilla", p: "CM", a: 24, v: 3.8, r: 73 },
    { n: "Ferreirinha", p: "LW", a: 28, v: 3.8, r: 73 },
    { n: "Nahuel Ferraresi", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Andr\xE9 Silva", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Gonzalo Tapia", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Pedro Lima", p: "RB", a: 19, v: 3, r: 72 },
    { n: "Henrique Carmo", p: "RW", a: 19, v: 2.9, r: 71 },
    { n: "Enzo D\xEDaz", p: "LB", a: 30, v: 2.3, r: 70 },
    { n: "Lucas Moura", p: "RW", a: 34, v: 1.7, r: 68 },
    { n: "Carlos Coronel", p: "GK", a: 29, v: 1.5, r: 68 },
    { n: "Maik", p: "RB", a: 20, v: 1.5, r: 68 },
    { n: "Wendell", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "Patryck", p: "LB", a: 22, v: 1.4, r: 68 }
  ],
  "S\xF8nderjyskE": [],
  "S\xFCdtirol": [
    { n: "Fabio Rispoli", p: "CM", a: 19, v: 3.8, r: 73 },
    { n: "Kevin Zeroli", p: "CM", a: 20, v: 3, r: 72 },
    { n: "Alessandro Plizzari", p: "GK", a: 25, v: 0.8, r: 64 },
    { n: "Salvatore Molina", p: "RM", a: 34, v: 0.8, r: 64 }
  ],
  "Telstar": [
    { n: "Adil Lechkar", p: "RM", a: 24, v: 0.8, r: 64 },
    { n: "Jayden Turfkruier", p: "LM", a: 21, v: 0.8, r: 64 },
    { n: "Nigel Ogidi Nwankwo", p: "LM", a: 27, v: 0.8, r: 64 },
    { n: "Tyrese Noslin", p: "RM", a: 23, v: 0.8, r: 64 },
    { n: "Jeff Hardeveld", p: "LM", a: 30, v: 0.7, r: 64 }
  ],
  "Tenerife": [],
  "Thun": [
    { n: "Franz-Ethan Meichtry", p: "CM", a: 20, v: 2.3, r: 70 },
    { n: "Niklas Steffen", p: "GK", a: 24, v: 1.5, r: 68 },
    { n: "Uros Vasic", p: "LM", a: 22, v: 0.8, r: 64 }
  ],
  "Tigres UANL": [
    { n: "Juan Brunetta", p: "CAM", a: 28, v: 7.5, r: 77 },
    { n: "Diego Lainez", p: "RW", a: 25, v: 6, r: 76 },
    { n: "Ozziel Herrera", p: "RW", a: 24, v: 5.3, r: 75 },
    { n: "Joaquim", p: "CB", a: 27, v: 4.5, r: 74 },
    { n: "Jes\xFAs Angulo", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Marcelo Flores", p: "LW", a: 22, v: 3.8, r: 73 },
    { n: "Alan Franco", p: "CB", a: 29, v: 3.6, r: 73 },
    { n: "C\xE9sar Ara\xFAjo", p: "CDM", a: 24, v: 3.2, r: 72 },
    { n: "Fernando Gorriar\xE1n", p: "CM", a: 31, v: 3, r: 72 },
    { n: "Jes\xFAs Garza", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Marco Farf\xE1n", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Uriel Antuna", p: "RW", a: 28, v: 2.3, r: 70 },
    { n: "Osvaldo Rodr\xEDguez", p: "LB", a: 29, v: 1.5, r: 68 },
    { n: "Emiliano G\xF3mez", p: "CF", a: 24, v: 1.4, r: 68 }
  ],
  "Tijuana": [
    { n: "Gilberto Mora", p: "CAM", a: 17, v: 8.3, r: 77 },
    { n: "Kevin Casta\xF1eda", p: "CAM", a: 26, v: 4.5, r: 74 },
    { n: "Rafael Fern\xE1ndez", p: "RB", a: 25, v: 2.3, r: 70 },
    { n: "Shamar Nicholson", p: "ST", a: 28, v: 2.3, r: 70 },
    { n: "Iv\xE1n Tona", p: "CDM", a: 25, v: 1.6, r: 68 }
  ],
  "Toluca": [
    { n: "Marcel Ruiz", p: "CM", a: 25, v: 8.3, r: 77 },
    { n: "Alexis Vega", p: "LW", a: 28, v: 6.8, r: 76 },
    { n: "Franco Romero", p: "CDM", a: 25, v: 5.7, r: 75 },
    { n: "Federico Pereira", p: "CB", a: 25, v: 5.3, r: 75 },
    { n: "Helinho", p: "RW", a: 25, v: 5.3, r: 75 },
    { n: "Nicol\xE1s Castro", p: "CAM", a: 25, v: 4.5, r: 74 },
    { n: "Paulinho", p: "ST", a: 33, v: 4.5, r: 74 },
    { n: "Bruno M\xE9ndez", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Santiago Sim\xF3n", p: "RB", a: 23, v: 3.8, r: 73 },
    { n: "\xC9rick Guti\xE9rrez", p: "CM", a: 30, v: 2.9, r: 71 },
    { n: "Jes\xFAs Gallardo", p: "LB", a: 31, v: 2.3, r: 70 },
    { n: "P\xE1vel P\xE9rez", p: "LW", a: 27, v: 2.3, r: 70 },
    { n: "Sebasti\xE1n C\xF3rdova", p: "CAM", a: 28, v: 2.3, r: 70 },
    { n: "Diego Barbosa", p: "RB", a: 29, v: 1.5, r: 68 },
    { n: "Mauricio Isa\xEDs", p: "LB", a: 24, v: 0.8, r: 64 }
  ],
  "Torino": [
    { n: "Pietro Comuzzo", p: "CB", a: 20, v: 18.8, r: 82 },
    { n: "Cesare Casadei", p: "CM", a: 22, v: 11.3, r: 79 },
    { n: "Lucas Perri", p: "GK", a: 28, v: 10.5, r: 79 },
    { n: "Daniel Bragan\xE7a", p: "CM", a: 26, v: 8.3, r: 77 },
    { n: "Nathan Patterson", p: "RB", a: 24, v: 8.3, r: 77 },
    { n: "Niccol\xF2 Fortini", p: "LB", a: 19, v: 8.3, r: 77 },
    { n: "Nikola Vla\u0161i\u0107", p: "CAM", a: 28, v: 7.5, r: 77 },
    { n: "Sa\xFAl Coco", p: "CB", a: 26, v: 7.5, r: 77 },
    { n: "Ch\xE9 Adams", p: "ST", a: 29, v: 6.8, r: 76 },
    { n: "Rolando Mandragora", p: "CDM", a: 28, v: 6.1, r: 76 },
    { n: "Rafik Belghali", p: "RB", a: 23, v: 6, r: 76 },
    { n: "Zakaria Aboukhlal", p: "RW", a: 25, v: 6, r: 76 },
    { n: "Gaetano Oristanio", p: "CAM", a: 23, v: 4.5, r: 74 },
    { n: "Gvidas Gineitis", p: "CM", a: 21, v: 4.5, r: 74 },
    { n: "Ardian Ismajli", p: "CB", a: 29, v: 3.8, r: 73 },
    { n: "Emirhan \u0130lkhan", p: "CM", a: 21, v: 3.8, r: 73 },
    { n: "Giovanni Simeone", p: "ST", a: 30, v: 3.8, r: 73 },
    { n: "Kian Fitz-Jim", p: "CM", a: 22, v: 3, r: 72 },
    { n: "Marcus Pedersen", p: "RB", a: 25, v: 3, r: 72 },
    { n: "Rafa Obrador", p: "LB", a: 21, v: 3, r: 72 },
    { n: "Sandro Kulenovi\u0107", p: "ST", a: 26, v: 3, r: 72 },
    { n: "Tino Anjorin", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Valentino Lazaro", p: "RM", a: 29, v: 3, r: 72 },
    { n: "Franco Israel", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "Duv\xE1n Zapata", p: "ST", a: 35, v: 2, r: 70 },
    { n: "Cristiano Biraghi", p: "LB", a: 33, v: 1.5, r: 68 },
    { n: "Ricardo Rodr\xEDguez", p: "LB", a: 33, v: 1.5, r: 68 },
    { n: "Diego Mascardi", p: "GK", a: 19, v: 0.8, r: 64 }
  ],
  "Toronto FC": [
    { n: "Djordje Mihailovic", p: "CAM", a: 27, v: 5.3, r: 75 },
    { n: "Jos\xE9 Cifuentes", p: "CM", a: 26, v: 3.8, r: 73 },
    { n: "Lewis Morgan", p: "LW", a: 29, v: 3.6, r: 73 },
    { n: "Niklas Dorsch", p: "CDM", a: 27, v: 2.8, r: 71 },
    { n: "D\xE1niel Sall\xF3i", p: "LW", a: 29, v: 2.3, r: 70 },
    { n: "Matheus Pereira", p: "LB", a: 25, v: 2.1, r: 70 },
    { n: "Theo Corbeanu", p: "RW", a: 23, v: 1.5, r: 68 },
    { n: "Malik Henry", p: "RM", a: 23, v: 0.8, r: 64 }
  ],
  "Tottenham": [
    { n: "Sandro Tonali", p: "CDM", a: 26, v: 64.8, r: 89 },
    { n: "Micky van de Ven", p: "CB", a: 24, v: 52.5, r: 88 },
    { n: "Omar Marmoush", p: "ST", a: 26, v: 48.8, r: 87 },
    { n: "Mohammed Kudus", p: "RW", a: 25, v: 44.3, r: 87 },
    { n: "Xavi Simons", p: "CAM", a: 22, v: 40.5, r: 86 },
    { n: "Lucas Bergvall", p: "CM", a: 19, v: 32.3, r: 85 },
    { n: "Pedro Porro", p: "RB", a: 26, v: 32.3, r: 85 },
    { n: "Savinho", p: "LW", a: 21, v: 32.3, r: 85 },
    { n: "Archie Gray", p: "CM", a: 19, v: 28.5, r: 84 },
    { n: "Conor Gallagher", p: "CM", a: 25, v: 28.5, r: 84 },
    { n: "Dejan Kulusevski", p: "CAM", a: 25, v: 28.5, r: 84 },
    { n: "Destiny Udogie", p: "LB", a: 23, v: 28.5, r: 84 },
    { n: "Dominic Solanke", p: "ST", a: 28, v: 28.5, r: 84 },
    { n: "Jan Paul van Hecke", p: "CB", a: 25, v: 28.5, r: 84 },
    { n: "Mateus Fernandes", p: "CM", a: 21, v: 28.5, r: 84 },
    { n: "Richarlison", p: "ST", a: 28, v: 22.5, r: 83 },
    { n: "James Maddison", p: "CAM", a: 29, v: 20.3, r: 82 },
    { n: "Mathys Tel", p: "ST", a: 20, v: 20.3, r: 82 },
    { n: "Marcos Senesi", p: "CB", a: 28, v: 18, r: 82 },
    { n: "Wilson Odobert", p: "LW", a: 21, v: 16.5, r: 81 },
    { n: "Rodrigo Bentancur", p: "CDM", a: 29, v: 16.2, r: 81 },
    { n: "Tosin Adarabioyo", p: "CB", a: 28, v: 14.3, r: 80 },
    { n: "Mykhaylo Mudryk", p: "LW", a: 24, v: 13.5, r: 80 },
    { n: "Anton\xEDn Kinsk\xFD", p: "GK", a: 22, v: 10.5, r: 79 },
    { n: "Andrew Robertson", p: "LB", a: 31, v: 8.3, r: 77 },
    { n: "Ben Davies", p: "CB", a: 32, v: 3.8, r: 73 },
    { n: "Callum Olusesi", p: "CM", a: 18, v: 2.3, r: 70 }
  ],
  "Toulouse": [
    { n: "Guillaume Restes", p: "GK", a: 20, v: 14.3, r: 80 },
    { n: "Alexis Vossah", p: "CM", a: 17, v: 12, r: 79 },
    { n: "Mathis Amougou", p: "CM", a: 19, v: 8.3, r: 77 },
    { n: "Cristian C\xE1sseres Jr.", p: "CM", a: 25, v: 7.5, r: 77 },
    { n: "Pape Demba Diop", p: "CM", a: 22, v: 6.8, r: 76 },
    { n: "Mark McKenzie", p: "CB", a: 26, v: 4.5, r: 74 },
    { n: "Aron D\xF8nnum", p: "RM", a: 27, v: 3.8, r: 73 },
    { n: "David Odogu", p: "CB", a: 19, v: 3.8, r: 73 },
    { n: "Rasmus Nicolaisen", p: "CB", a: 28, v: 3.8, r: 73 },
    { n: "Frank Magri", p: "ST", a: 26, v: 3, r: 72 },
    { n: "Jacen Russell-Rowe", p: "ST", a: 23, v: 3, r: 72 },
    { n: "Santiago Hidalgo", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Rafik Messali", p: "RB", a: 22, v: 1.5, r: 68 },
    { n: "Warren Kamanzi", p: "RB", a: 25, v: 1.5, r: 68 }
  ],
  "Trabzonspor": [
    { n: "Mohamed Salah", p: "RW", a: 33, v: 24, r: 83 },
    { n: "Simon Banza", p: "ST", a: 29, v: 11.4, r: 79 },
    { n: "Andr\xE9 Onana", p: "GK", a: 29, v: 9.8, r: 78 },
    { n: "Arseniy Batagov", p: "CB", a: 23, v: 9, r: 78 },
    { n: "Ernest Muci", p: "CAM", a: 24, v: 9, r: 78 },
    { n: "Felipe Augusto", p: "ST", a: 21, v: 8.3, r: 77 },
    { n: "Wagner Pina", p: "RB", a: 23, v: 6.8, r: 76 },
    { n: "Batista Mendy", p: "CDM", a: 25, v: 6.1, r: 76 },
    { n: "Chibuike Nwaiwu", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Oleksandr Zubkov", p: "RW", a: 29, v: 6, r: 76 },
    { n: "Paul Onuachu", p: "ST", a: 31, v: 4.5, r: 74 },
    { n: "Tim Jabol-Folcarelli", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Muhammed Cham", p: "CAM", a: 25, v: 4.3, r: 74 },
    { n: "Pedro Malheiro", p: "RB", a: 24, v: 4.3, r: 74 },
    { n: "Benjamin Bouchouari", p: "CM", a: 24, v: 3.8, r: 73 },
    { n: "Kazeem Olaigbe", p: "LW", a: 22, v: 3, r: 72 },
    { n: "Mathias L\xF8vik", p: "LB", a: 22, v: 3, r: 72 },
    { n: "Mustafa Eskihella\xE7", p: "LB", a: 28, v: 3, r: 72 },
    { n: "Cihan \xC7anak", p: "RW", a: 20, v: 2.3, r: 70 },
    { n: "Ruslan Malinovskyi", p: "CM", a: 33, v: 2, r: 70 },
    { n: "Onuralp \xC7evikkan", p: "GK", a: 19, v: 0.8, r: 64 },
    { n: "Stefan Savic", p: "CB", a: 35, v: 0.3, r: 59 }
  ],
  "Troyes": [
    { n: "Tawfik Bentayeb", p: "ST", a: 23, v: 3.8, r: 73 },
    { n: "Isma\xEBl Boura", p: "LB", a: 25, v: 3, r: 72 },
    { n: "Mouhamed Diop", p: "CM", a: 25, v: 2.3, r: 70 },
    { n: "Jaur\xE8s Assoumou", p: "LW", a: 23, v: 1.5, r: 68 },
    { n: "Merwan Ifnaoui", p: "RW", a: 27, v: 1.5, r: 68 }
  ],
  "Twente": [
    { n: "Bart van Rooij", p: "RB", a: 24, v: 7.5, r: 77 },
    { n: "Ruud Nijstad", p: "CB", a: 17, v: 6.8, r: 76 },
    { n: "Michal Sad\xEDlek", p: "CM", a: 26, v: 6.4, r: 76 },
    { n: "Ramiz Zerrouki", p: "CDM", a: 27, v: 5.3, r: 75 },
    { n: "Sondre \xD8rjas\xE6ter", p: "LW", a: 22, v: 4.5, r: 74 },
    { n: "Michel Vlap", p: "CAM", a: 28, v: 3.6, r: 73 },
    { n: "Daan Rots", p: "RW", a: 24, v: 3, r: 72 },
    { n: "Kristian Hlynsson", p: "CAM", a: 21, v: 3, r: 72 },
    { n: "Virgil Misidjan", p: "LM", a: 30, v: 2.1, r: 70 },
    { n: "Lars Unnerstall", p: "GK", a: 35, v: 1.5, r: 68 },
    { n: "Marko Pjaca", p: "LW", a: 30, v: 1.5, r: 68 },
    { n: "Taylor Booth", p: "RW", a: 24, v: 1.5, r: 68 },
    { n: "Sayfallah Ltaief", p: "LM", a: 25, v: 1.4, r: 68 }
  ],
  "Udinese": [
    { n: "Oumar Solet", p: "CB", a: 25, v: 16.5, r: 81 },
    { n: "Nicol\xF2 Zaniolo", p: "CF", a: 26, v: 12.1, r: 80 },
    { n: "Lennon Miller", p: "CM", a: 19, v: 8.3, r: 77 },
    { n: "Maduka Okoye", p: "GK", a: 26, v: 8.3, r: 77 },
    { n: "Keinan Davis", p: "ST", a: 27, v: 7.5, r: 77 },
    { n: "Jurgen Ekkelenkamp", p: "CM", a: 25, v: 6, r: 76 },
    { n: "Nicol\xF2 Bertola", p: "CB", a: 22, v: 4.5, r: 74 },
    { n: "Alessandro Zanoli", p: "RB", a: 25, v: 3.8, r: 73 },
    { n: "Giorgi Chakvetadze", p: "CAM", a: 26, v: 3.8, r: 73 },
    { n: "Jakub Piotrowski", p: "CM", a: 28, v: 3.8, r: 73 },
    { n: "Matteo Palma", p: "CB", a: 17, v: 3.8, r: 73 },
    { n: "Sandi Lovri\u0107", p: "CM", a: 27, v: 3.8, r: 73 },
    { n: "Unai G\xF3mez", p: "CAM", a: 22, v: 3.8, r: 73 },
    { n: "Jesper Karlstr\xF6m", p: "CDM", a: 30, v: 3.2, r: 72 },
    { n: "Idrissa Gueye", p: "ST", a: 19, v: 3, r: 72 },
    { n: "Lazar Jovanovic", p: "RW", a: 19, v: 3, r: 72 },
    { n: "Vakoun Bayo", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Bartosz Mrozek", p: "GK", a: 25, v: 2.3, r: 70 },
    { n: "Hassane Kamara", p: "LB", a: 31, v: 2.3, r: 70 },
    { n: "Juan Arizala", p: "LM", a: 20, v: 2.3, r: 70 },
    { n: "M\xEBrgim Vojvoda", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "R\u0103zvan Sava", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Alessandro Nunziante", p: "GK", a: 18, v: 1.5, r: 68 }
  ],
  "Union Berlin": [
    { n: "Leopold Querfeld", p: "CB", a: 22, v: 14.3, r: 80 },
    { n: "Emmanuel Latte Lath", p: "ST", a: 27, v: 12, r: 79 },
    { n: "Aljoscha Kemlein", p: "CDM", a: 21, v: 9.7, r: 78 },
    { n: "Tom Rothe", p: "LB", a: 21, v: 8.3, r: 77 },
    { n: "Zeno Van Den Bosch", p: "CB", a: 22, v: 6.8, r: 76 },
    { n: "Felix Uduokhai", p: "CB", a: 28, v: 6.4, r: 76 },
    { n: "Andrej Ilic", p: "ST", a: 25, v: 4.5, r: 74 },
    { n: "Andr\xE1s Sch\xE4fer", p: "CM", a: 26, v: 3.8, r: 73 },
    { n: "Michel Aebischer", p: "CM", a: 28, v: 3.8, r: 73 },
    { n: "Derrick K\xF6hn", p: "LB", a: 26, v: 3, r: 72 },
    { n: "Livan Burcu", p: "LW", a: 21, v: 3, r: 72 },
    { n: "Oliver Burke", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Woo-yeong Jeong", p: "CAM", a: 26, v: 3, r: 72 },
    { n: "Marin Ljubicic", p: "ST", a: 23, v: 2.9, r: 71 },
    { n: "Frederik R\xF6nnow", p: "GK", a: 33, v: 2.3, r: 70 },
    { n: "Josip Juranovic", p: "RB", a: 30, v: 2.3, r: 70 },
    { n: "Rani Khedira", p: "CDM", a: 31, v: 1.6, r: 68 }
  ],
  "Union Saint-Gilloise": [
    { n: "Adem Zorgane", p: "CM", a: 25, v: 8.3, r: 77 },
    { n: "Kevin Mac Allister", p: "CB", a: 28, v: 8.3, r: 77 },
    { n: "Kamiel Van De Perre", p: "CM", a: 21, v: 6, r: 76 },
    { n: "Ousseynou Niang", p: "LM", a: 24, v: 6, r: 76 },
    { n: "Raul Florucz", p: "ST", a: 24, v: 4.5, r: 74 },
    { n: "Anouar Ait El Hadj", p: "CAM", a: 23, v: 3.8, r: 73 },
    { n: "Besfort Zeneli", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Kevin Rodr\xEDguez", p: "ST", a: 25, v: 3.8, r: 73 },
    { n: "Lo\xEFc Lapoussin", p: "LM", a: 27, v: 3, r: 72 },
    { n: "Louis Patris", p: "RB", a: 24, v: 2.3, r: 70 },
    { n: "Mohammed Fuseini", p: "ST", a: 23, v: 2.3, r: 70 },
    { n: "Guilherme Smith", p: "LW", a: 22, v: 1.5, r: 68 }
  ],
  "Utrecht": [
    { n: "Alonzo Engwanda", p: "CDM", a: 22, v: 6.5, r: 76 },
    { n: "Yoann Cathline", p: "LW", a: 23, v: 6.4, r: 76 },
    { n: "Gjivai Zechi\xEBl", p: "CM", a: 21, v: 6, r: 76 },
    { n: "Kevin Paredes", p: "LM", a: 20, v: 6, r: 76 },
    { n: "Siebe Horemans", p: "RB", a: 27, v: 3.8, r: 73 },
    { n: "Jesper Karlsson", p: "LW", a: 27, v: 3, r: 72 },
    { n: "Vasilios Barkas", p: "GK", a: 31, v: 3, r: 72 },
    { n: "Zidane Iqbal", p: "CM", a: 22, v: 2.9, r: 71 },
    { n: "Dani de Wit", p: "CAM", a: 27, v: 2.3, r: 70 },
    { n: "Victor Jensen", p: "CAM", a: 25, v: 2.3, r: 70 },
    { n: "Davy van den Berg", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Adrian Blake", p: "LW", a: 20, v: 1.5, r: 68 }
  ],
  "Vaduz": [
    { n: "Gabriele De Donno", p: "RM", a: 23, v: 0.8, r: 64 }
  ],
  "Valencia": [
    { n: "Javi Guerra", p: "CM", a: 22, v: 20.3, r: 82 },
    { n: "Harvey Elliott", p: "CAM", a: 22, v: 18, r: 82 },
    { n: "C\xE9sar T\xE1rrega", p: "CB", a: 23, v: 9.8, r: 78 },
    { n: "Diego L\xF3pez", p: "RW", a: 23, v: 9.8, r: 78 },
    { n: "Hugo Duro", p: "ST", a: 26, v: 9.8, r: 78 },
    { n: "Arnau Mart\xEDnez", p: "RB", a: 22, v: 8.3, r: 77 },
    { n: "Pepelu", p: "CDM", a: 27, v: 6.5, r: 76 },
    { n: "Andr\xE9 Almeida", p: "CAM", a: 25, v: 6, r: 76 },
    { n: "Filip Ugrinic", p: "CM", a: 26, v: 4.5, r: 74 },
    { n: "Jos\xE9 Copete", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Jos\xE9 Gay\xE0", p: "LB", a: 30, v: 3.8, r: 73 },
    { n: "Justin de Haas", p: "CB", a: 25, v: 3.8, r: 73 },
    { n: "Pablo Maffeo", p: "RB", a: 28, v: 3.8, r: 73 },
    { n: "Guido Rodr\xEDguez", p: "CDM", a: 32, v: 3.2, r: 72 },
    { n: "Jes\xFAs V\xE1zquez", p: "LB", a: 22, v: 3, r: 72 },
    { n: "Umar Sadiq", p: "ST", a: 28, v: 3, r: 72 },
    { n: "Aliou Dieng", p: "CDM", a: 28, v: 2.4, r: 71 },
    { n: "Kayne van Oevelen", p: "GK", a: 22, v: 1.5, r: 68 },
    { n: "Luis Rioja", p: "RW", a: 32, v: 1.5, r: 68 },
    { n: "Renzo Saravia", p: "RB", a: 32, v: 1.5, r: 68 },
    { n: "Stole Dimitrievski", p: "GK", a: 32, v: 1.5, r: 68 },
    { n: "Mouctar Diakhaby", p: "CB", a: 29, v: 1.2, r: 67 }
  ],
  "Valladolid": [
    { n: "Julien Ponceau", p: "CAM", a: 25, v: 1.5, r: 68 },
    { n: "Guille Bueno", p: "LB", a: 23, v: 0.8, r: 64 }
  ],
  "Vancouver Whitecaps": [
    { n: "Thomas M\xFCller", p: "CF", a: 36, v: 4.3, r: 74 },
    { n: "Brian White", p: "ST", a: 29, v: 3.8, r: 73 },
    { n: "Ryan Gauld", p: "CAM", a: 30, v: 3.8, r: 73 },
    { n: "Sebastian Berhalter", p: "CM", a: 24, v: 3.8, r: 73 },
    { n: "Andr\xE9s Cubas", p: "CDM", a: 29, v: 3.6, r: 73 },
    { n: "Yohei Takaoka", p: "GK", a: 29, v: 3, r: 72 },
    { n: "\xC9dier Ocampo", p: "RB", a: 22, v: 2.3, r: 70 },
    { n: "Emmanuel Sabbi", p: "RW", a: 28, v: 2.3, r: 70 },
    { n: "Ryan Raposo", p: "LM", a: 24, v: 1.5, r: 68 },
    { n: "Tate Johnson", p: "LB", a: 20, v: 1.5, r: 68 }
  ],
  "Vara\u017Edin": [],
  "Vasco da Gama": [
    { n: "Robert Renan", p: "CB", a: 22, v: 8.3, r: 77 },
    { n: "Santiago Sosa", p: "CDM", a: 26, v: 6.5, r: 76 },
    { n: "Carlos Cuesta", p: "CB", a: 26, v: 6, r: 76 },
    { n: "L\xE9o Jardim", p: "GK", a: 30, v: 6, r: 76 },
    { n: "Lucas Piton", p: "LB", a: 25, v: 6, r: 76 },
    { n: "Matheus Fran\xE7a", p: "CAM", a: 21, v: 6, r: 76 },
    { n: "Nuno Moreira", p: "RW", a: 26, v: 4.5, r: 74 },
    { n: "Paulo Henrique", p: "RB", a: 29, v: 4.5, r: 74 },
    { n: "Cauan Barros", p: "CDM", a: 21, v: 4.1, r: 73 },
    { n: "Marino Hinestroza", p: "RW", a: 23, v: 3.8, r: 73 },
    { n: "Andr\xE9s G\xF3mez", p: "LW", a: 23, v: 3.6, r: 73 },
    { n: "Jo\xE3o Victor", p: "CB", a: 27, v: 3.6, r: 73 },
    { n: "Brenner", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Johan Rojas", p: "CAM", a: 23, v: 3, r: 72 },
    { n: "Adson", p: "RW", a: 25, v: 2.3, r: 70 },
    { n: "Philippe Coutinho", p: "CAM", a: 33, v: 2.3, r: 70 },
    { n: "Jos\xE9 Luis Rodr\xEDguez", p: "RB", a: 28, v: 1.5, r: 68 }
  ],
  "Venezia": [
    { n: "Akor Adams", p: "ST", a: 25, v: 9.8, r: 78 },
    { n: "Simon Sohm", p: "CM", a: 24, v: 6.8, r: 76 },
    { n: "Albion Rrahmani", p: "ST", a: 25, v: 6, r: 76 },
    { n: "Armel Bella-Kotchap", p: "CB", a: 24, v: 6, r: 76 },
    { n: "Filip Stankovi\u0107", p: "GK", a: 23, v: 6, r: 76 },
    { n: "Gianluca Busio", p: "CM", a: 23, v: 4.5, r: 74 },
    { n: "Jo\xEBl Schingtienne", p: "CB", a: 23, v: 3.8, r: 73 },
    { n: "Andrea Adorante", p: "ST", a: 25, v: 3, r: 72 },
    { n: "Mat\xEDas Moreno", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Antoine Hainaut", p: "RB", a: 23, v: 2.3, r: 70 },
    { n: "Matteo Dagasso", p: "CM", a: 21, v: 2.3, r: 70 },
    { n: "Thierry Correia", p: "RB", a: 26, v: 2.3, r: 70 },
    { n: "Toni Fern\xE1ndez", p: "CAM", a: 17, v: 2.3, r: 70 },
    { n: "John Yeboah", p: "CF", a: 25, v: 2.1, r: 70 },
    { n: "Th\xF3rir J\xF3hann Helgason", p: "CM", a: 25, v: 2.1, r: 70 },
    { n: "Pasquale Mazzocchi", p: "RB", a: 30, v: 1.5, r: 68 },
    { n: "Richie Sagrado", p: "RB", a: 21, v: 1.5, r: 68 },
    { n: "Bjarki Bjarkason", p: "LM", a: 23, v: 0.8, r: 64 },
    { n: "Lorenzo Berardi", p: "LM", a: 19, v: 0.8, r: 64 },
    { n: "Lorenzo Montip\xF2", p: "GK", a: 29, v: 0.8, r: 64 }
  ],
  "Verona": [
    { n: "Tomas Suslov", p: "CAM", a: 23, v: 3.8, r: 73 },
    { n: "Amin Sarr", p: "ST", a: 24, v: 3.6, r: 73 },
    { n: "Antoine Bernede", p: "CM", a: 26, v: 3, r: 72 },
    { n: "Gabriele Zappa", p: "RB", a: 26, v: 3, r: 72 },
    { n: "Suat Serdar", p: "CM", a: 28, v: 3, r: 72 },
    { n: "Samuele Mulattieri", p: "ST", a: 25, v: 2.9, r: 71 },
    { n: "Domagoj Bradari\u0107", p: "LB", a: 26, v: 2.3, r: 70 },
    { n: "Martin Frese", p: "LB", a: 27, v: 2.3, r: 70 },
    { n: "Andr\xE9a Le Borgne", p: "CDM", a: 19, v: 2, r: 70 },
    { n: "Nicola Leali", p: "GK", a: 32, v: 1.5, r: 68 },
    { n: "Mattia Compagnon", p: "RM", a: 24, v: 0.8, r: 64 }
  ],
  "Viborg FF": [
    { n: "Thomas J\xF8rgensen", p: "CM", a: 20, v: 3, r: 72 },
    { n: "Jean Manuel Mbom", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "Lucas Lund", p: "GK", a: 25, v: 1.5, r: 68 },
    { n: "Srdjan Kuzmic", p: "LB", a: 21, v: 1.5, r: 68 }
  ],
  "Vicenza": [
    { n: "Tommaso Corazza", p: "LB", a: 21, v: 1.5, r: 68 },
    { n: "Filippo Costa", p: "LM", a: 28, v: 0.8, r: 64 },
    { n: "Lorenzo Caferri", p: "RM", a: 26, v: 0.8, r: 64 },
    { n: "Raul Talarico", p: "RM", a: 23, v: 0.8, r: 64 },
    { n: "Nicola Rauti", p: "CF", a: 25, v: 0.7, r: 64 },
    { n: "Riccardo Marchizza", p: "LB", a: 27, v: 0.7, r: 64 }
  ],
  "Villarreal": [
    { n: "Alberto Moleiro", p: "LW", a: 22, v: 32.3, r: 85 },
    { n: "Pape Gueye", p: "CM", a: 26, v: 32.3, r: 85 },
    { n: "Georges Mikautadze", p: "ST", a: 25, v: 22.5, r: 83 },
    { n: "Carlos Romero", p: "LB", a: 24, v: 20.3, r: 82 },
    { n: "Renato Veiga", p: "CB", a: 22, v: 20.3, r: 82 },
    { n: "Logan Costa", p: "CB", a: 24, v: 14.3, r: 80 },
    { n: "Ilias Akhomach", p: "RW", a: 21, v: 9.8, r: 78 },
    { n: "Luiz J\xFAnior", p: "GK", a: 24, v: 9.8, r: 78 },
    { n: "Rafa Mar\xEDn", p: "CB", a: 23, v: 9.8, r: 78 },
    { n: "Tajon Buchanan", p: "RW", a: 26, v: 9.8, r: 78 },
    { n: "Juan Foyth", p: "CB", a: 27, v: 8.3, r: 77 },
    { n: "Santiago Mouri\xF1o", p: "RB", a: 23, v: 8.3, r: 77 },
    { n: "Sergi Cardona", p: "LB", a: 26, v: 7.5, r: 77 },
    { n: "Santi Comesa\xF1a", p: "CM", a: 29, v: 6.8, r: 76 },
    { n: "Tani Oluwaseyi", p: "ST", a: 25, v: 6.8, r: 76 },
    { n: "Ayoze P\xE9rez", p: "ST", a: 32, v: 4.5, r: 74 },
    { n: "Nathan-Dylan Saliba", p: "CM", a: 21, v: 4.5, r: 74 },
    { n: "Nicolas P\xE9p\xE9", p: "RW", a: 30, v: 4.5, r: 74 },
    { n: "Alex Freeman", p: "RB", a: 21, v: 3, r: 72 },
    { n: "Arnau Tenas", p: "GK", a: 24, v: 3, r: 72 },
    { n: "Gerard Moreno", p: "ST", a: 33, v: 2.9, r: 71 },
    { n: "Alfon Gonz\xE1lez", p: "LW", a: 26, v: 2.3, r: 70 },
    { n: "Carlos Maci\xE0", p: "CM", a: 17, v: 2.3, r: 70 },
    { n: "P\xE9ter Gul\xE1csi", p: "GK", a: 35, v: 1.5, r: 68 }
  ],
  "Vit\xF3ria": [
    { n: "Luan C\xE2ndido", p: "LB", a: 24, v: 2.3, r: 70 },
    { n: "Lucas Arcanjo", p: "GK", a: 27, v: 2.3, r: 70 },
    { n: "Hugo", p: "LB", a: 24, v: 2.1, r: 70 },
    { n: "Baralhas", p: "CDM", a: 27, v: 2, r: 70 },
    { n: "Walace", p: "CDM", a: 30, v: 2, r: 70 },
    { n: "Aitor Cantalapiedra", p: "CAM", a: 29, v: 1.5, r: 68 },
    { n: "Erick", p: "RW", a: 28, v: 1.5, r: 68 },
    { n: "Ramon", p: "LB", a: 24, v: 1.5, r: 68 },
    { n: "Ignacio Laquintana", p: "RW", a: 26, v: 1.4, r: 68 }
  ],
  "Vit\xF3ria Guimar\xE3es": [
    { n: "Oumar Camara", p: "LW", a: 18, v: 3.8, r: 73 },
    { n: "Toni Borevkovi\u0107", p: "CB", a: 28, v: 3.6, r: 73 },
    { n: "Beni Mukendi", p: "CM", a: 23, v: 2.3, r: 70 },
    { n: "Jo\xE3o Mendes", p: "LB", a: 25, v: 2.3, r: 70 },
    { n: "Telmo Arcanjo", p: "RW", a: 24, v: 2.3, r: 70 },
    { n: "Gustavo Silva", p: "RW", a: 26, v: 2.1, r: 70 },
    { n: "Maga", p: "RB", a: 23, v: 1.5, r: 68 },
    { n: "Noah Saviolo", p: "LW", a: 21, v: 1.5, r: 68 },
    { n: "Samu", p: "CAM", a: 29, v: 1.5, r: 68 },
    { n: "Tony Strata", p: "RB", a: 21, v: 1.5, r: 68 }
  ],
  "Volos": [
    { n: "R\xE9my Cabella", p: "CAM", a: 35, v: 2.1, r: 70 },
    { n: "Yvan Neyou", p: "CDM", a: 28, v: 1.6, r: 68 }
  ],
  "WSG Tirol": [
    { n: "Quincy Butler", p: "RM", a: 24, v: 0.8, r: 64 }
  ],
  "Watford": [
    { n: "Imr\xE2n Louza", p: "CM", a: 26, v: 11.3, r: 79 },
    { n: "Souma\xEFla Coulibaly", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Luca Kjerrumgaard", p: "ST", a: 22, v: 4.5, r: 74 },
    { n: "Mart\xEDn Payero", p: "CM", a: 27, v: 4.5, r: 74 },
    { n: "Nestory Irankunda", p: "RW", a: 19, v: 4.5, r: 74 },
    { n: "Edoardo Bove", p: "CM", a: 23, v: 3.8, r: 73 },
    { n: "Othmane Maamma", p: "RW", a: 20, v: 3.8, r: 73 },
    { n: "Jordan Zemura", p: "LB", a: 26, v: 3.6, r: 73 },
    { n: "Branimir Mlacic", p: "CB", a: 18, v: 3, r: 72 },
    { n: "Edo Kayembe", p: "CM", a: 27, v: 3, r: 72 },
    { n: "Iker Bravo", p: "ST", a: 20, v: 3, r: 72 },
    { n: "Kwadwo Baah", p: "LW", a: 22, v: 2.3, r: 70 },
    { n: "Federico Ravaglia", p: "GK", a: 26, v: 1.5, r: 68 },
    { n: "Jeremy Ngakia", p: "RB", a: 25, v: 1.5, r: 68 },
    { n: "J\xE9r\xE9my Petris", p: "RB", a: 27, v: 1.5, r: 68 },
    { n: "Rocco Vata", p: "LW", a: 20, v: 1.5, r: 68 },
    { n: "Egil Selvik", p: "GK", a: 28, v: 0.8, r: 64 },
    { n: "Daniel Bachmann", p: "GK", a: 31, v: 0.7, r: 64 }
  ],
  "Werder Bremen": [
    { n: "Jens Stage", p: "CM", a: 29, v: 11.3, r: 79 },
    { n: "Marco Friedl", p: "CB", a: 27, v: 9.8, r: 78 },
    { n: "Senne Lynen", p: "CDM", a: 26, v: 6.5, r: 76 },
    { n: "Arthur", p: "RB", a: 22, v: 6, r: 76 },
    { n: "Justin Njinmah", p: "RW", a: 25, v: 6, r: 76 },
    { n: "Eren Dink\xE7i", p: "RW", a: 24, v: 4.5, r: 74 },
    { n: "Marco Gr\xFCll", p: "LW", a: 27, v: 4.5, r: 74 },
    { n: "Youri Regeer", p: "CDM", a: 22, v: 4.1, r: 73 },
    { n: "Chuki", p: "CAM", a: 21, v: 3.8, r: 73 },
    { n: "Ludovit Reis", p: "CM", a: 25, v: 3.8, r: 73 },
    { n: "Niclas F\xFCllkrug", p: "ST", a: 32, v: 3.8, r: 73 },
    { n: "Keke Topp", p: "ST", a: 21, v: 3, r: 72 },
    { n: "Mitchell Weiser", p: "RB", a: 31, v: 3, r: 72 },
    { n: "Patrice Covic", p: "CAM", a: 18, v: 3, r: 72 },
    { n: "Alexander Schlager", p: "GK", a: 29, v: 2.3, r: 70 },
    { n: "Karl Hein", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Moussa Ndiaye", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Olivier Deman", p: "LB", a: 25, v: 2.3, r: 70 }
  ],
  "West Brom": [
    { n: "Isaac Price", p: "CM", a: 22, v: 8.3, r: 77 },
    { n: "Aune Heggeb\xF8", p: "ST", a: 24, v: 6, r: 76 },
    { n: "Josh Maja", p: "ST", a: 27, v: 4.5, r: 74 },
    { n: "Chris Mepham", p: "CB", a: 28, v: 4.3, r: 74 },
    { n: "Toby Collyer", p: "CDM", a: 21, v: 4.1, r: 73 },
    { n: "Alfie Gilchrist", p: "RB", a: 22, v: 3, r: 72 },
    { n: "Mikey Johnston", p: "LW", a: 26, v: 3, r: 72 },
    { n: "Callum Styles", p: "LB", a: 25, v: 2.3, r: 70 },
    { n: "Jayson Molumby", p: "CM", a: 26, v: 2.3, r: 70 },
    { n: "Ousmane Diakit\xE9", p: "CDM", a: 25, v: 1.6, r: 68 },
    { n: "Charlie Taylor", p: "LB", a: 32, v: 1.5, r: 68 },
    { n: "Jed Wallace", p: "RW", a: 31, v: 1.5, r: 68 },
    { n: "Josh Griffiths", p: "GK", a: 24, v: 1.5, r: 68 }
  ],
  "West Ham": [
    { n: "Jarrod Bowen", p: "RW", a: 29, v: 28.5, r: 84 },
    { n: "Taty Castellanos", p: "ST", a: 27, v: 22.5, r: 83 },
    { n: "Arne Engels", p: "CM", a: 22, v: 14.3, r: 80 },
    { n: "Pablo", p: "ST", a: 21, v: 14.3, r: 80 },
    { n: "Maximilian Kilman", p: "CB", a: 28, v: 12.8, r: 80 },
    { n: "Edson \xC1lvarez", p: "CDM", a: 28, v: 12.2, r: 80 },
    { n: "Soungoutou Magassa", p: "CDM", a: 22, v: 12.2, r: 80 },
    { n: "Konstantinos Mavropanos", p: "CB", a: 28, v: 12, r: 79 },
    { n: "Mads Hermansen", p: "GK", a: 25, v: 12, r: 79 },
    { n: "Morato", p: "CB", a: 24, v: 11.3, r: 79 },
    { n: "Jo\xEBl Piroe", p: "ST", a: 26, v: 10.5, r: 79 },
    { n: "Kyle Walker-Peters", p: "RB", a: 28, v: 10.5, r: 79 },
    { n: "Oliver Scarles", p: "LB", a: 20, v: 8.3, r: 77 },
    { n: "Tom\xE1\u0161 Sou\u010Dek", p: "CDM", a: 31, v: 8.1, r: 77 },
    { n: "Manor Solomon", p: "LW", a: 26, v: 7.5, r: 77 },
    { n: "Edvin Austb\xF8", p: "LW", a: 20, v: 6, r: 76 },
    { n: "Alphonse Areola", p: "GK", a: 32, v: 3.8, r: 73 },
    { n: "Divine Mukasa", p: "CAM", a: 18, v: 3.8, r: 73 },
    { n: "Andrew Irving", p: "CM", a: 25, v: 3.6, r: 73 },
    { n: "Adama Boiro", p: "LB", a: 23, v: 2.3, r: 70 },
    { n: "Jo\xEBl Veltman", p: "RB", a: 33, v: 2.3, r: 70 }
  ],
  "Westerlo": [
    { n: "Do\u011Fucan Haspolat", p: "CDM", a: 25, v: 4.1, r: 73 },
    { n: "Emin Bayram", p: "CB", a: 22, v: 3, r: 72 },
    { n: "Isa Sakamoto", p: "CAM", a: 22, v: 3, r: 72 },
    { n: "Nacho Ferri", p: "ST", a: 21, v: 3, r: 72 },
    { n: "Ibrahim Fofana", p: "CDM", a: 22, v: 2.4, r: 71 },
    { n: "Andreas Jungdal", p: "GK", a: 23, v: 2.3, r: 70 },
    { n: "Min-hyeok Yang", p: "RW", a: 19, v: 2.3, r: 70 },
    { n: "Pape Diong", p: "CDM", a: 19, v: 2, r: 70 },
    { n: "Nikola Storm", p: "LW", a: 31, v: 1.4, r: 68 }
  ],
  "Willem II": [
    { n: "Kasper Boogaard", p: "CDM", a: 19, v: 2, r: 70 }
  ],
  "Wolfsberger AC": [
    { n: "Dejan Zukic", p: "CAM", a: 24, v: 3, r: 72 },
    { n: "Nikolas Polster", p: "GK", a: 23, v: 1.5, r: 68 }
  ],
  "Wolfsburg": [
    { n: "Sa\xEBl Kumbedi", p: "RB", a: 20, v: 9.8, r: 78 },
    { n: "Mattias Svanberg", p: "CM", a: 26, v: 7.5, r: 77 },
    { n: "Kento Shiogai", p: "ST", a: 20, v: 6.8, r: 76 },
    { n: "Aster Vranckx", p: "CM", a: 23, v: 6, r: 76 },
    { n: "Bence D\xE1rdai", p: "CAM", a: 19, v: 6, r: 76 },
    { n: "Joakim Maehle", p: "LB", a: 28, v: 6, r: 76 },
    { n: "Jonas Adjetey", p: "CB", a: 22, v: 6, r: 76 },
    { n: "Aaron Zehnter", p: "LB", a: 21, v: 4.5, r: 74 },
    { n: "Timon Wellenreuther", p: "GK", a: 30, v: 4.5, r: 74 },
    { n: "Denis Vavro", p: "CB", a: 29, v: 3.8, r: 73 },
    { n: "Fraser Hornby", p: "ST", a: 26, v: 3.8, r: 73 },
    { n: "Jenson Seelt", p: "CB", a: 22, v: 3.8, r: 73 },
    { n: "Kilian Fischer", p: "RB", a: 25, v: 3.8, r: 73 },
    { n: "Maximilian Arnold", p: "CM", a: 31, v: 3.8, r: 73 },
    { n: "Muhammed Damar", p: "CAM", a: 21, v: 3.8, r: 73 },
    { n: "Elvis Rexhbecaj", p: "CM", a: 28, v: 3, r: 72 },
    { n: "Alexander Bernhardsson", p: "RW", a: 27, v: 2.3, r: 70 },
    { n: "Christian Eriksen", p: "CAM", a: 33, v: 2.3, r: 70 },
    { n: "Pharell Hensel", p: "CM", a: 18, v: 2.3, r: 70 },
    { n: "Rog\xE9rio", p: "LB", a: 27, v: 2.1, r: 70 }
  ],
  "Wolves": [
    { n: "Ladislav Krej\u010D\xED", p: "CB", a: 26, v: 18, r: 82 },
    { n: "Mateus Man\xE9", p: "CAM", a: 18, v: 16.5, r: 81 },
    { n: "Toti", p: "CB", a: 26, v: 16.5, r: 81 },
    { n: "Fer L\xF3pez", p: "CAM", a: 21, v: 12.8, r: 80 },
    { n: "Jean-Ricner Bellegarde", p: "CM", a: 27, v: 12.8, r: 80 },
    { n: "Hugo Bueno", p: "LB", a: 23, v: 9.8, r: 78 },
    { n: "Jackson Tchatchoua", p: "RB", a: 24, v: 9.8, r: 78 },
    { n: "Jordan James", p: "CM", a: 21, v: 9.8, r: 78 },
    { n: "Marshall Munetsi", p: "CM", a: 29, v: 9.8, r: 78 },
    { n: "Yerson Mosquera", p: "CB", a: 24, v: 9.8, r: 78 },
    { n: "Adam Armstrong", p: "ST", a: 28, v: 6.8, r: 76 },
    { n: "Tommy Doyle", p: "CM", a: 24, v: 6.8, r: 76 },
    { n: "Nasser Djiga", p: "CB", a: 23, v: 4.5, r: 74 },
    { n: "Bertrand Traor\xE9", p: "RW", a: 30, v: 3.8, r: 73 },
    { n: "Jos\xE9 S\xE1", p: "GK", a: 32, v: 3.8, r: 73 },
    { n: "Boubacar Traor\xE9", p: "CDM", a: 24, v: 3.2, r: 72 },
    { n: "Rafiki Sa\xEFd", p: "LW", a: 25, v: 3, r: 72 },
    { n: "Ra\xFAl Jim\xE9nez", p: "ST", a: 34, v: 3, r: 72 },
    { n: "Enso Gonz\xE1lez", p: "LW", a: 20, v: 2.9, r: 71 },
    { n: "Ghislain Konan", p: "LB", a: 30, v: 2.3, r: 70 },
    { n: "Kieran Trippier", p: "RB", a: 35, v: 2.3, r: 70 },
    { n: "Jo\xE3o Virg\xEDnia", p: "GK", a: 26, v: 0.8, r: 64 }
  ],
  "Wrexham": [
    { n: "Anthony Patterson", p: "GK", a: 25, v: 6.8, r: 76 },
    { n: "Callum Doyle", p: "CB", a: 22, v: 6.8, r: 76 },
    { n: "Max Cleworth", p: "CB", a: 23, v: 6, r: 76 },
    { n: "Nathan Broadhead", p: "LW", a: 27, v: 6, r: 76 },
    { n: "Ben Sheaf", p: "CDM", a: 27, v: 5.7, r: 75 },
    { n: "Lewis O'Brien", p: "CM", a: 27, v: 4.5, r: 74 },
    { n: "Joe Worrall", p: "CB", a: 28, v: 3.6, r: 73 },
    { n: "Issa Kabor\xE9", p: "RB", a: 24, v: 3, r: 72 },
    { n: "Arthur Okonkwo", p: "GK", a: 24, v: 2.3, r: 70 },
    { n: "Liberato Cacace", p: "LB", a: 25, v: 2.3, r: 70 },
    { n: "Ryan Longman", p: "RM", a: 25, v: 1.5, r: 68 },
    { n: "James McClean", p: "LM", a: 34, v: 0.8, r: 64 },
    { n: "Danny Ward", p: "GK", a: 32, v: 0.7, r: 64 }
  ],
  "Young Boys": [
    { n: "Alvyn Sanches", p: "CAM", a: 22, v: 7.5, r: 77 },
    { n: "Marvin Keller", p: "GK", a: 23, v: 6, r: 76 },
    { n: "C\xE9dric Zesiger", p: "CB", a: 27, v: 3.8, r: 73 },
    { n: "Moritz Jenz", p: "CB", a: 26, v: 3.8, r: 73 },
    { n: "Samuel Essende", p: "ST", a: 27, v: 3.6, r: 73 },
    { n: "Stefan Bukinac", p: "LB", a: 20, v: 3, r: 72 },
    { n: "Ryan Andrews", p: "RB", a: 21, v: 2.3, r: 70 },
    { n: "Armin Gigovic", p: "CM", a: 23, v: 2.1, r: 70 },
    { n: "Edimilson Fernandes", p: "CDM", a: 29, v: 1.8, r: 69 },
    { n: "Christian Fassnacht", p: "CAM", a: 32, v: 1.5, r: 68 },
    { n: "Darian Males", p: "RM", a: 24, v: 1.5, r: 68 },
    { n: "Isaac Schmidt", p: "LB", a: 26, v: 1.5, r: 68 }
  ],
  "Zulte Waregem": [
    { n: "Jeppe Erenbjerg", p: "CAM", a: 25, v: 2.3, r: 70 },
    { n: "Joseph Opoku", p: "LW", a: 20, v: 2.3, r: 70 },
    { n: "Marley Ak\xE9", p: "LW", a: 24, v: 1.5, r: 68 }
  ],
  "\xC7orum FK": [
    { n: "Cengiz \xDCnder", p: "RW", a: 28, v: 5.7, r: 75 },
    { n: "Berat \xD6zdemir", p: "CDM", a: 27, v: 2, r: 70 }
  ]
};

// src/data/clubManagerALeague2026.ts
var CM_ALEAGUE_META = {
  read: "2026-10-06",
  players: 310,
  clubs: 12
};
var CM_ALEAGUE_PARTIAL = ["Central Coast Mariners"];
var CM_ALEAGUE_SUPERSEDES = { "Ryan Fraser": "Southampton" };
var CM_ALEAGUE_ROSTERS = {
  "Adelaide United": [
    { n: "Panagiotis Kikianis", p: "CB", a: 21, v: 1.05, r: 66 },
    { n: "Ethan Alagich", p: "CM", a: 22, v: 0.73, r: 64 },
    { n: "Craig Goodwin", p: "LW", a: 34, v: 0.57, r: 62 },
    { n: "Jonny Yull", p: "CAM", a: 21, v: 0.45, r: 61 },
    { n: "Dylan Pierias", p: "RB", a: 26, v: 0.41, r: 61 },
    { n: "Jay Barnett", p: "CDM", a: 25, v: 0.36, r: 60 },
    { n: "Ryan White", p: "CM", a: 21, v: 0.36, r: 60 },
    { n: "Luke Duzel", p: "CDM", a: 24, v: 0.32, r: 59 },
    { n: "Brody Burkitt", p: "ST", a: 20, v: 0.28, r: 59 },
    { n: "Joshua Smits", p: "GK", a: 33, v: 0.28, r: 59 },
    { n: "Ryan Kitto", p: "LB", a: 32, v: 0.28, r: 59 },
    { n: "Bart Vriends", p: "CB", a: 35, v: 0.2, r: 57 },
    { n: "Ben Folami", p: "LW", a: 27, v: 0.2, r: 57 },
    { n: "Juan Mu\xF1iz", p: "CAM", a: 34, v: 0.2, r: 57 },
    { n: "Harry Crawford", p: "ST", a: 19, v: 0.16, r: 55 },
    { n: "Jacob Brazete", p: "LW", a: 20, v: 0.16, r: 55 },
    { n: "Sotirios Phillis", p: "CB", a: 20, v: 0.16, r: 55 },
    { n: "Amlani Tatu", p: "LW", a: 18, v: 0.12, r: 54 },
    { n: "Ethan Cox", p: "GK", a: 22, v: 0.12, r: 54 },
    { n: "Fabian Talladira", p: "CM", a: 20, v: 0.12, r: 54 },
    { n: "Joey Garuccio", p: "CM", a: 19, v: 0.12, r: 54 },
    { n: "Ajak Riak", p: "ST", a: 25, v: 0.08, r: 52 },
    { n: "Anselmo de Moraes", p: "CAM", a: 37, v: 0.08, r: 52 },
    { n: "Jake Najdovski", p: "ST", a: 21, v: 0.08, r: 52 },
    { n: "Max Vartuli", p: "GK", a: 21, v: 0.08, r: 52 },
    { n: "Denver Minster", p: "LB", a: 16, v: 0.04, r: 48 },
    { n: "Feyzo Kasumovic", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Israel Mbula-Monga", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Malual Nichola", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Mitchell Smith", p: "ST", a: 19, v: 0.04, r: 48 },
    { n: "Vinko Stanisic", p: "CB", a: 19, v: 0.04, r: 48 }
  ],
  "Auckland FC": [
    { n: "Lachlan Brook", p: "LW", a: 25, v: 0.53, r: 62 },
    { n: "Francis de Vries", p: "LB", a: 31, v: 0.49, r: 62 },
    { n: "Sam Cosgrove", p: "ST", a: 29, v: 0.49, r: 62 },
    { n: "Jake Brimmer", p: "CM", a: 28, v: 0.45, r: 61 },
    { n: "Lachlan Bayliss", p: "CAM", a: 24, v: 0.45, r: 61 },
    { n: "Callan Elliot", p: "RB", a: 27, v: 0.36, r: 60 },
    { n: "Hiroki Sakai", p: "RB", a: 36, v: 0.32, r: 59 },
    { n: "Logan Rogerson", p: "RW", a: 28, v: 0.32, r: 59 },
    { n: "Michael Woud", p: "GK", a: 27, v: 0.32, r: 59 },
    { n: "Nando Pijnaker", p: "CB", a: 27, v: 0.32, r: 59 },
    { n: "Cameron Howieson", p: "CM", a: 31, v: 0.24, r: 58 },
    { n: "Jonty Bidois", p: "ST", a: 21, v: 0.2, r: 57 },
    { n: "Oli Sail", p: "GK", a: 30, v: 0.2, r: 57 },
    { n: "Felipe Gallegos", p: "CM", a: 34, v: 0.16, r: 55 },
    { n: "Daniel Normann", p: "CDM", a: 24, v: 0.14, r: 55 },
    { n: "Isa Prins", p: "LW", a: 21, v: 0.14, r: 55 },
    { n: "Luka Vicelich", p: "CB", a: 18, v: 0.14, r: 55 },
    { n: "Oliver Middleton", p: "CM", a: 21, v: 0.12, r: 54 },
    { n: "Ronan Wynne", p: "CB", a: 25, v: 0.12, r: 54 },
    { n: "Van Fitzharris", p: "CAM", a: 18, v: 0.12, r: 54 },
    { n: "Joseph Knowles", p: "GK", a: 21, v: 0.08, r: 52 },
    { n: "Aaron Calver", p: "CB", a: 30, v: 0.04, r: 48 },
    { n: "Aaron Cartwright", p: "RW", a: 18, v: 0.04, r: 48 },
    { n: "Marley Leuluai", p: "CDM", a: 19, v: 0.04, r: 48 }
  ],
  "Brisbane Roar": [
    { n: "Milorad Stajic", p: "CDM", a: 24, v: 0.45, r: 61 },
    { n: "Virgiliu Postolachi", p: "ST", a: 26, v: 0.45, r: 61 },
    { n: "Dimitri Valkanis", p: "CB", a: 20, v: 0.36, r: 60 },
    { n: "Tae-Hee Nam", p: "CAM", a: 35, v: 0.32, r: 59 },
    { n: "Emin Durakovic", p: "CM", a: 21, v: 0.28, r: 59 },
    { n: "Joel King", p: "LB", a: 25, v: 0.28, r: 59 },
    { n: "Jordan Lauton", p: "CM", a: 23, v: 0.28, r: 59 },
    { n: "Noah Maieroni", p: "CDM", a: 21, v: 0.28, r: 59 },
    { n: "Sabit Ngor", p: "RW", a: 25, v: 0.28, r: 59 },
    { n: "Justin Vidic", p: "ST", a: 22, v: 0.24, r: 58 },
    { n: "Tyrese Francois", p: "CM", a: 26, v: 0.24, r: 58 },
    { n: "Marko Ilic", p: "LW", a: 27, v: 0.18, r: 56 },
    { n: "Hosine Bility", p: "CB", a: 25, v: 0.16, r: 55 },
    { n: "Nathan Amanatidis", p: "RW", a: 20, v: 0.16, r: 55 },
    { n: "Tom Aldred", p: "CB", a: 36, v: 0.16, r: 55 },
    { n: "Jacob Nasso", p: "RB", a: 20, v: 0.14, r: 55 },
    { n: "Niall Thom", p: "RW", a: 20, v: 0.14, r: 55 },
    { n: "Emmett Shaw", p: "CM", a: 17, v: 0.08, r: 52 },
    { n: "Archie Mitchell", p: "LB", a: 17, v: 0.04, r: 48 },
    { n: "Dean Bouzanis", p: "GK", a: 36, v: 0.04, r: 48 },
    { n: "George Plusnin", p: "GK", a: 18, v: 0.04, r: 48 },
    { n: "Max Court", p: "CAM", a: 17, v: 0.04, r: 48 },
    { n: "Oscar Page", p: "GK", a: 20, v: 0.04, r: 48 },
    { n: "Taj Sorensen", p: "CM", a: 17, v: 0.04, r: 48 },
    { n: "Tate Russell", p: "RB", a: 27, v: 0.04, r: 48 }
  ],
  "Central Coast Mariners": [
    { n: "Lucas Mauragis", p: "LB", a: 25, v: 0.41, r: 61 },
    { n: "Haine Eames", p: "CAM", a: 18, v: 0.32, r: 59 },
    { n: "Bailey Brandtman", p: "LW", a: 21, v: 0.28, r: 59 },
    { n: "Dylan Peraic-Cullen", p: "GK", a: 20, v: 0.28, r: 59 },
    { n: "Harrison Steele", p: "CDM", a: 23, v: 0.28, r: 59 },
    { n: "Oli Lavale", p: "ST", a: 21, v: 0.24, r: 58 },
    { n: "Arthur De Lima", p: "CM", a: 19, v: 0.2, r: 57 },
    { n: "Storm Roux", p: "RB", a: 33, v: 0.18, r: 56 },
    { n: "Trent Sainsbury", p: "CB", a: 34, v: 0.16, r: 55 },
    { n: "Diesel Herrington", p: "CB", a: 22, v: 0.14, r: 55 },
    { n: "Jesse Mantell", p: "CM", a: 18, v: 0.14, r: 55 },
    { n: "Andrew Redmayne", p: "GK", a: 37, v: 0.12, r: 54 },
    { n: "Callum McCaskey", p: "CB", a: 17, v: 0.04, r: 48 },
    { n: "Gabriel Tilo", p: "RB", a: 17, v: 0.04, r: 48 },
    { n: "Laurence Taylor", p: "CM", a: 18, v: 0.04, r: 48 },
    { n: "Luke Becvinovski", p: "ST", a: 17, v: 0.04, r: 48 },
    { n: "Max Naylor", p: "ST", a: 18, v: 0.04, r: 48 },
    { n: "Noah McCann", p: "CB", a: 21, v: 0.04, r: 48 },
    { n: "Oliver O'Carroll", p: "CM", a: 17, v: 0.04, r: 48 },
    { n: "Presley Ortiz", p: "ST", a: 23, v: 0.04, r: 48 },
    { n: "Rufai Abubakar", p: "GK", a: 18, v: 0.04, r: 48 },
    { n: "Shumba Mutokoyi", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Stevan Rujak", p: "LB", a: 17, v: 0.04, r: 48 }
  ],
  "Macarthur FC": [
    { n: "Ryan Fraser", p: "LW", a: 32, v: 1.22, r: 67 },
    { n: "Apostolos Stamatelopoulos", p: "ST", a: 27, v: 0.45, r: 61 },
    { n: "Kosta Grozos", p: "CDM", a: 26, v: 0.36, r: 60 },
    { n: "Nathan Paull", p: "CB", a: 23, v: 0.36, r: 60 },
    { n: "Callum Talbot", p: "RB", a: 25, v: 0.32, r: 59 },
    { n: "Harry Politidis", p: "LB", a: 24, v: 0.32, r: 59 },
    { n: "Liam Rose", p: "CDM", a: 29, v: 0.32, r: 59 },
    { n: "Luke Vickery", p: "RW", a: 20, v: 0.32, r: 59 },
    { n: "Bernardo Oliveira", p: "RW", a: 22, v: 0.28, r: 59 },
    { n: "Connor Pain", p: "LW", a: 32, v: 0.28, r: 59 },
    { n: "Dean Bosnjak", p: "LW", a: 19, v: 0.28, r: 59 },
    { n: "Tatsuki Nara", p: "CB", a: 33, v: 0.28, r: 59 },
    { n: "Alexander Robinson", p: "GK", a: 21, v: 0.24, r: 58 },
    { n: "Ben Gibson", p: "ST", a: 23, v: 0.24, r: 58 },
    { n: "Oliver Randazzo", p: "CM", a: 19, v: 0.22, r: 57 },
    { n: "Will McKay", p: "RB", a: 20, v: 0.2, r: 57 },
    { n: "Musa Tour\xE9", p: "ST", a: 20, v: 0.16, r: 55 },
    { n: "Henrique Oliveira", p: "RW", a: 17, v: 0.12, r: 54 },
    { n: "Jonathan Aspropotamitis", p: "CB", a: 30, v: 0.12, r: 54 },
    { n: "Zane Helweh", p: "LW", a: 20, v: 0.12, r: 54 },
    { n: "James Hilton", p: "GK", a: 24, v: 0.08, r: 52 },
    { n: "Jing Reec", p: "ST", a: 23, v: 0.08, r: 52 },
    { n: "Dylan Rose", p: "CDM", a: 20, v: 0.04, r: 48 },
    { n: "Harry Menham", p: "LB", a: 20, v: 0.04, r: 48 },
    { n: "Kai Kennedy", p: "LW", a: 24, v: 0.04, r: 48 },
    { n: "Michael Pratezina", p: "ST", a: 18, v: 0.04, r: 48 },
    { n: "Sebastian Krslovic", p: "CB", a: 20, v: 0.04, r: 48 }
  ],
  "Melbourne City": [
    { n: "Matheus Rossetto", p: "CM", a: 30, v: 0.81, r: 64 },
    { n: "Max Caputo", p: "ST", a: 21, v: 0.65, r: 63 },
    { n: "Nathaniel Atkinson", p: "RB", a: 27, v: 0.57, r: 62 },
    { n: "Emiliano Marcondes", p: "CAM", a: 31, v: 0.49, r: 62 },
    { n: "Awer Mabil", p: "CM", a: 31, v: 0.41, r: 61 },
    { n: "Kavian Rahmani", p: "CAM", a: 19, v: 0.36, r: 60 },
    { n: "Medin Memeti", p: "ST", a: 19, v: 0.32, r: 59 },
    { n: "Alessandro Lopane", p: "CAM", a: 22, v: 0.28, r: 59 },
    { n: "Liam Bonetig", p: "CB", a: 21, v: 0.28, r: 59 },
    { n: "Andrew Nabbout", p: "RW", a: 33, v: 0.24, r: 58 },
    { n: "Harrison Delbridge", p: "CB", a: 34, v: 0.24, r: 58 },
    { n: "Mathew Leckie", p: "LW", a: 35, v: 0.24, r: 58 },
    { n: "Takeshi Kanamori", p: "RW", a: 32, v: 0.24, r: 58 },
    { n: "Besian Kutleshi", p: "CB", a: 17, v: 0.22, r: 57 },
    { n: "Quinn MacNicol", p: "CAM", a: 18, v: 0.22, r: 57 },
    { n: "Aziz Behich", p: "LB", a: 35, v: 0.2, r: 57 },
    { n: "Benjamin Mazzeo", p: "RW", a: 21, v: 0.2, r: 57 },
    { n: "Lawrence Wong", p: "CAM", a: 19, v: 0.16, r: 55 },
    { n: "Peter Antoniou", p: "RB", a: 19, v: 0.16, r: 55 },
    { n: "Beckham Baker", p: "RW", a: 18, v: 0.12, r: 54 },
    { n: "Macklin Freke", p: "GK", a: 27, v: 0.12, r: 54 },
    { n: "James Nieuwenhuizen", p: "GK", a: 22, v: 0.08, r: 52 },
    { n: "Mathew Baker", p: "LB", a: 17, v: 0.08, r: 52 },
    { n: "Akeem Gerald", p: "RW", a: 16, v: 0.04, r: 48 },
    { n: "Jayden Necovski", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Lachie Charles", p: "GK", a: 19, v: 0.04, r: 48 },
    { n: "Roland Ballah", p: "LW", a: 18, v: 0.04, r: 48 },
    { n: "Ryan Kalms", p: "CB", a: 20, v: 0.04, r: 48 }
  ],
  "Melbourne Victory": [
    { n: "Denis Genreau", p: "CAM", a: 27, v: 0.57, r: 62 },
    { n: "Guillermo May", p: "ST", a: 28, v: 0.53, r: 62 },
    { n: "Jordi Valadon", p: "CDM", a: 23, v: 0.49, r: 62 },
    { n: "Keegan Jelacic", p: "ST", a: 24, v: 0.41, r: 61 },
    { n: "Clerismario Santos Rodrigues", p: "LW", a: 25, v: 0.36, r: 60 },
    { n: "Matthew Grimaldi", p: "RW", a: 22, v: 0.36, r: 60 },
    { n: "Louis D'Arrigo", p: "CDM", a: 25, v: 0.32, r: 59 },
    { n: "Phillip Ziereis", p: "CB", a: 33, v: 0.32, r: 59 },
    { n: "Harrison Sawyer", p: "ST", a: 29, v: 0.28, r: 59 },
    { n: "Jack Warshawsky", p: "GK", a: 22, v: 0.28, r: 59 },
    { n: "Franco Lino", p: "LB", a: 21, v: 0.24, r: 58 },
    { n: "Harry Shillington", p: "RB", a: 21, v: 0.24, r: 58 },
    { n: "Joshua Inserra", p: "RB", a: 21, v: 0.24, r: 58 },
    { n: "Charles Nduka", p: "ST", a: 28, v: 0.22, r: 57 },
    { n: "Tom Lockyer", p: "CB", a: 31, v: 0.2, r: 57 },
    { n: "Brendan Hamill", p: "CB", a: 34, v: 0.16, r: 55 },
    { n: "Xavier Stella", p: "CDM", a: 20, v: 0.14, r: 55 },
    { n: "Jack Duncan", p: "GK", a: 33, v: 0.12, r: 54 },
    { n: "Jason Davidson", p: "CB", a: 35, v: 0.12, r: 54 },
    { n: "Oliver Dragicevic", p: "CM", a: 18, v: 0.12, r: 54 },
    { n: "Daniel Graskoski", p: "GK", a: 19, v: 0.08, r: 52 },
    { n: "Mikey Ghossaini", p: "LW", a: 19, v: 0.08, r: 52 },
    { n: "Jack Mihailidis", p: "CAM", a: 19, v: 0.04, r: 48 }
  ],
  "Newcastle Jets": [
    { n: "Joe Lolley", p: "RW", a: 34, v: 0.61, r: 63 },
    { n: "Alex Badolato", p: "CAM", a: 21, v: 0.49, r: 62 },
    { n: "Zach Clough", p: "CM", a: 31, v: 0.49, r: 62 },
    { n: "Daniel Wilmering", p: "LB", a: 25, v: 0.45, r: 61 },
    { n: "Will Dobson", p: "CM", a: 19, v: 0.45, r: 61 },
    { n: "Nikos Vergos", p: "ST", a: 30, v: 0.36, r: 60 },
    { n: "Alex Grant", p: "CB", a: 32, v: 0.32, r: 59 },
    { n: "James Delianov", p: "GK", a: 26, v: 0.32, r: 59 },
    { n: "Joel Bertolissio", p: "RB", a: 23, v: 0.32, r: 59 },
    { n: "Zane Schreiber", p: "CDM", a: 21, v: 0.32, r: 59 },
    { n: "Xavier Bertoncello", p: "LW", a: 20, v: 0.3, r: 59 },
    { n: "Max Burgess", p: "CDM", a: 31, v: 0.28, r: 59 },
    { n: "Thomas Aquilina", p: "RB", a: 25, v: 0.28, r: 59 },
    { n: "Max Cooper", p: "CB", a: 19, v: 0.24, r: 58 },
    { n: "Patrick Wood", p: "ST", a: 24, v: 0.24, r: 58 },
    { n: "Will Kennedy", p: "LB", a: 21, v: 0.12, r: 54 },
    { n: "Alex Nunes", p: "CAM", a: 19, v: 0.08, r: 52 },
    { n: "Joe Shaughnessy", p: "CB", a: 34, v: 0.08, r: 52 },
    { n: "Oscar Fryer", p: "LW", a: 20, v: 0.06, r: 50 },
    { n: "Alex Nassiep", p: "GK", a: 20, v: 0.04, r: 48 },
    { n: "Jordan Baylis", p: "GK", a: 20, v: 0.04, r: 48 },
    { n: "Julian Recchia", p: "CM", a: 18, v: 0.04, r: 48 },
    { n: "Oliver Cockle", p: "RW", a: 17, v: 0.04, r: 48 },
    { n: "Oscar Gonzalez", p: "ST", a: 18, v: 0.04, r: 48 }
  ],
  "Perth Glory": [
    { n: "Tom Lawrence", p: "ST", a: 32, v: 0.81, r: 64 },
    { n: "Calem Nieuwenhof", p: "CDM", a: 25, v: 0.65, r: 63 },
    { n: "William Freney", p: "CM", a: 20, v: 0.41, r: 61 },
    { n: "Jaiden Kucharski", p: "ST", a: 24, v: 0.36, r: 60 },
    { n: "Charbel Shamoon", p: "RB", a: 22, v: 0.32, r: 59 },
    { n: "Giovanni De Abreu", p: "CM", a: 19, v: 0.32, r: 59 },
    { n: "Lachlan Jackson", p: "CB", a: 31, v: 0.32, r: 59 },
    { n: "Matt Sutton", p: "GK", a: 26, v: 0.32, r: 59 },
    { n: "Sam Sutton", p: "LB", a: 24, v: 0.32, r: 59 },
    { n: "Sebastian Despotovski", p: "ST", a: 21, v: 0.32, r: 59 },
    { n: "Brian Kaltak", p: "CB", a: 33, v: 0.28, r: 59 },
    { n: "Henry Hore", p: "CM", a: 27, v: 0.28, r: 59 },
    { n: "Stefan Colakovski", p: "LW", a: 26, v: 0.28, r: 59 },
    { n: "Trent Ostler", p: "CM", a: 24, v: 0.24, r: 58 },
    { n: "Lucas Scicluna", p: "CDM", a: 20, v: 0.2, r: 57 },
    { n: "Matt Dench", p: "LB", a: 22, v: 0.2, r: 57 },
    { n: "Andriano Lebib", p: "CB", a: 20, v: 0.16, r: 55 },
    { n: "Matt Ellis", p: "CAM", a: 25, v: 0.12, r: 54 },
    { n: "Anthony Didulica", p: "CM", a: 18, v: 0.08, r: 52 },
    { n: "Brandon O'Neill", p: "CM", a: 32, v: 0.04, r: 48 },
    { n: "Cher Deng", p: "CB", a: 21, v: 0.04, r: 48 },
    { n: "Daniel Solsky", p: "GK", a: 23, v: 0.04, r: 48 },
    { n: "Oliver Evans", p: "ST", a: 18, v: 0.04, r: 48 },
    { n: "Pieter Jacobsz", p: "ST", a: 25, v: 0.04, r: 48 },
    { n: "Riley Foxe", p: "CB", a: 19, v: 0.04, r: 48 },
    { n: "Ryan Warner", p: "GK", a: 21, v: 0.04, r: 48 },
    { n: "Sebastian Kukucka", p: "ST", a: 18, v: 0.04, r: 48 },
    { n: "Tadi Kuzamba", p: "RB", a: 19, v: 0.04, r: 48 }
  ],
  "Sydney FC": [
    { n: "Marcel Tisserand", p: "CB", a: 33, v: 0.81, r: 64 },
    { n: "V\xEDctor Campuzano", p: "ST", a: 29, v: 0.57, r: 62 },
    { n: "Tiago Quintal", p: "ST", a: 20, v: 0.49, r: 62 },
    { n: "Al Hassan Tour\xE9", p: "LW", a: 26, v: 0.36, r: 60 },
    { n: "Harrison Devenish-Meares", p: "GK", a: 29, v: 0.36, r: 60 },
    { n: "Jacob Farrell", p: "LB", a: 23, v: 0.36, r: 60 },
    { n: "Oriola Sunday", p: "ST", a: 23, v: 0.36, r: 60 },
    { n: "Takahiro Sekine", p: "LM", a: 31, v: 0.36, r: 60 },
    { n: "Wataru Kamijo", p: "CM", a: 20, v: 0.36, r: 60 },
    { n: "Alexandar Popovi\u0107", p: "CB", a: 24, v: 0.32, r: 59 },
    { n: "Ben Garuccio", p: "LB", a: 31, v: 0.32, r: 59 },
    { n: "Jordan Courtney-Perkins", p: "CB", a: 23, v: 0.32, r: 59 },
    { n: "Rhys Youlley", p: "CM", a: 21, v: 0.3, r: 59 },
    { n: "Akol Akon", p: "RW", a: 17, v: 0.28, r: 59 },
    { n: "Rhyan Grant", p: "RB", a: 35, v: 0.28, r: 59 },
    { n: "Abel Walatee", p: "CM", a: 22, v: 0.24, r: 58 },
    { n: "Gabriel Popovi\u0107", p: "ST", a: 23, v: 0.12, r: 54 },
    { n: "Jake Hollman", p: "CAM", a: 25, v: 0.12, r: 54 },
    { n: "Mathias Macallister", p: "ST", a: 19, v: 0.12, r: 54 },
    { n: "Gus Hoefsloot", p: "GK", a: 20, v: 0.08, r: 52 },
    { n: "James Overy", p: "RB", a: 18, v: 0.08, r: 52 },
    { n: "Ethan Dyer", p: "CB", a: 17, v: 0.04, r: 48 },
    { n: "Joe Lacey", p: "CM", a: 19, v: 0.04, r: 48 },
    { n: "Marin France", p: "CM", a: 19, v: 0.04, r: 48 },
    { n: "Nickolas Alfaro", p: "CM", a: 18, v: 0.04, r: 48 },
    { n: "Sandy Zaverdinos", p: "GK", a: 19, v: 0.04, r: 48 },
    { n: "Tyler Williams", p: "CB", a: 18, v: 0.04, r: 48 },
    { n: "Zach Harrison", p: "ST", a: 16, v: 0.04, r: 48 }
  ],
  "Wellington Phoenix": [
    { n: "Bryce Duke", p: "CAM", a: 25, v: 0.65, r: 63 },
    { n: "Alex Rufer", p: "CDM", a: 30, v: 0.49, r: 62 },
    { n: "Isaac Hughes", p: "CB", a: 22, v: 0.45, r: 61 },
    { n: "Rafael Dur\xE1n", p: "ST", a: 29, v: 0.41, r: 61 },
    { n: "Corban Piper", p: "ST", a: 24, v: 0.36, r: 60 },
    { n: "Lukas Kelly-Heald", p: "LB", a: 21, v: 0.36, r: 60 },
    { n: "Matthew Sheridan", p: "RB", a: 22, v: 0.36, r: 60 },
    { n: "Bill Tuiloma", p: "CB", a: 31, v: 0.32, r: 59 },
    { n: "James McGarry", p: "LB", a: 28, v: 0.32, r: 59 },
    { n: "Walter Scott", p: "LB", a: 27, v: 0.24, r: 58 },
    { n: "Fin Roa Conchie", p: "CDM", a: 23, v: 0.2, r: 57 },
    { n: "Nathan Walker", p: "LW", a: 20, v: 0.2, r: 57 },
    { n: "Alby Kelly-Heald", p: "GK", a: 21, v: 0.16, r: 55 },
    { n: "Eamonn McCarron", p: "GK", a: 19, v: 0.16, r: 55 },
    { n: "Max Anderson", p: "CM", a: 25, v: 0.16, r: 55 },
    { n: "Kazuki Nagasawa", p: "CM", a: 34, v: 0.12, r: 54 },
    { n: "Riley Bidois", p: "ST", a: 24, v: 0.12, r: 54 },
    { n: "Xuan Loke", p: "RB", a: 21, v: 0.12, r: 54 },
    { n: "Anaru Cassidy", p: "CDM", a: 20, v: 0.1, r: 53 },
    { n: "Henry Gray", p: "GK", a: 21, v: 0.1, r: 53 },
    { n: "Jayden Smith", p: "CB", a: 19, v: 0.08, r: 52 }
  ],
  "Western Sydney Wanderers": [
    { n: "Angus Thurgate", p: "CM", a: 26, v: 0.53, r: 62 },
    { n: "Brandon Borrello", p: "ST", a: 31, v: 0.49, r: 62 },
    { n: "Nicolas Milanovic", p: "RW", a: 24, v: 0.49, r: 62 },
    { n: "Anthony Pantazopoulos", p: "CB", a: 23, v: 0.41, r: 61 },
    { n: "Dylan Scicluna", p: "CM", a: 22, v: 0.36, r: 60 },
    { n: "Miguel Di Pizio", p: "CM", a: 20, v: 0.36, r: 60 },
    { n: "Alex Gersbach", p: "LB", a: 29, v: 0.32, r: 59 },
    { n: "Germ\xE1n Ferreyra", p: "CB", a: 30, v: 0.32, r: 59 },
    { n: "Steven Ugarkovic", p: "CDM", a: 32, v: 0.32, r: 59 },
    { n: "Aydan Hammond", p: "RW", a: 22, v: 0.24, r: 58 },
    { n: "Jarrod Carluccio", p: "ST", a: 25, v: 0.24, r: 58 },
    { n: "Lawrence Thomas", p: "GK", a: 34, v: 0.24, r: 58 },
    { n: "Liam Gillion", p: "LW", a: 23, v: 0.24, r: 58 },
    { n: "Jai Rose", p: "CM", a: 18, v: 0.2, r: 57 },
    { n: "Panashe Madanha", p: "ST", a: 22, v: 0.16, r: 55 },
    { n: "Hiroshi Ibusuki", p: "ST", a: 35, v: 0.12, r: 54 },
    { n: "Jordan Holmes", p: "GK", a: 29, v: 0.12, r: 54 },
    { n: "Nathan Barrie", p: "CB", a: 20, v: 0.12, r: 54 },
    { n: "Awan Lual", p: "ST", a: 19, v: 0.08, r: 52 },
    { n: "Alaat Abdul-Rahman", p: "ST", a: 19, v: 0.04, r: 48 },
    { n: "Atiya Waraga", p: "ST", a: 19, v: 0.04, r: 48 },
    { n: "Emile Katrib", p: "CB", a: 17, v: 0.04, r: 48 },
    { n: "Georgio Hassarati", p: "ST", a: 17, v: 0.04, r: 48 },
    { n: "Joshua Cetinic", p: "CM", a: 18, v: 0.04, r: 48 },
    { n: "Marcus Savic", p: "CB", a: 17, v: 0.04, r: 48 },
    { n: "Oscar Morrison", p: "CM", a: 19, v: 0.04, r: 48 },
    { n: "Ricky Fransen", p: "CB", a: 19, v: 0.04, r: 48 },
    { n: "Tristan Vidackovic", p: "GK", a: 23, v: 0.04, r: 48 }
  ]
};

// src/data/clubManagerRussia2026.ts
var CM_RUSSIA_META = {
  label: "Russian Premier League",
  read: "2026-10-08",
  readTo: "2026-10-08",
  players: 403,
  clubs: 16
};
var CM_RUSSIA_PARTIAL = [];
var CM_RUSSIA_ROSTERS = {
  "Akhmat Grozny": [
    { n: "Lechi Sadulaev", p: "LW", a: 26, v: 3.24, r: 72 },
    { n: "Maksim Samorodov", p: "RW", a: 24, v: 3.24, r: 72 },
    { n: "Egas Cacintura", p: "CAM", a: 28, v: 2.43, r: 71 },
    { n: "Kirill Shchetinin", p: "CAM", a: 24, v: 2.03, r: 70 },
    { n: "Kalidou Sidib\xE9", p: "CDM", a: 27, v: 1.62, r: 68 },
    { n: "Georgiy Melkadze", p: "ST", a: 29, v: 1.46, r: 68 },
    { n: "Klisman Cake", p: "CB", a: 27, v: 1.46, r: 68 },
    { n: "Arsen Adamov", p: "RB", a: 26, v: 1.22, r: 67 },
    { n: "Turpal-Ali Ibishev", p: "CB", a: 24, v: 1.22, r: 67 },
    { n: "J\xFAlio Rom\xE3o", p: "CDM", a: 28, v: 0.97, r: 65 },
    { n: "Miroslav Bogosavac", p: "LB", a: 29, v: 0.97, r: 65 },
    { n: "Ousmane N'Dong", p: "CB", a: 27, v: 0.97, r: 65 },
    { n: "Sergey Pryakhin", p: "CAM", a: 23, v: 0.97, r: 65 },
    { n: "Mohamed Konat\xE9", p: "ST", a: 28, v: 0.81, r: 64 },
    { n: "Erald Maksuti", p: "LW", a: 22, v: 0.73, r: 64 },
    { n: "Maksim Sidorov", p: "LB", a: 28, v: 0.73, r: 64 },
    { n: "Vadim Ulyanov", p: "GK", a: 25, v: 0.73, r: 64 },
    { n: "Ismael Silva", p: "CM", a: 31, v: 0.65, r: 63 },
    { n: "Kelliano", p: "CDM", a: 23, v: 0.65, r: 63 },
    { n: "Galymzhan Kenzhebek", p: "LW", a: 23, v: 0.49, r: 62 },
    { n: "Abakar Gadzhiev", p: "CAM", a: 22, v: 0.32, r: 59 },
    { n: "Kirill Kistenev", p: "RB", a: 20, v: 0.28, r: 59 },
    { n: "Rasul Mitsaev", p: "GK", a: 24, v: 0.28, r: 59 },
    { n: "Giorgiy Shelia", p: "GK", a: 37, v: 0.12, r: 54 },
    { n: "Aleksey Kasadzhikov", p: "ST", a: 19, v: 0.08, r: 52 }
  ],
  "Akron Tolyatti": [
    { n: "Dmitriy Pestryakov", p: "RW", a: 19, v: 2.43, r: 71 },
    { n: "Gilson Benchimol", p: "ST", a: 24, v: 1.62, r: 68 },
    { n: "Milutin Vidosavljevic", p: "CAM", a: 25, v: 1.46, r: 68 },
    { n: "Slobodan Tedic", p: "ST", a: 26, v: 1.46, r: 68 },
    { n: "Aleksa Djurasovic", p: "CDM", a: 23, v: 1.22, r: 67 },
    { n: "Arseniy Dmitriev", p: "RW", a: 19, v: 1.22, r: 67 },
    { n: "Ionu\u021B Nedelcearu", p: "CB", a: 30, v: 1.22, r: 67 },
    { n: "Kristijan Bistrovic", p: "CM", a: 28, v: 1.22, r: 67 },
    { n: "Maksim Boldyrev", p: "LW", a: 22, v: 0.97, r: 65 },
    { n: "Stefan Loncar", p: "CM", a: 30, v: 0.97, r: 65 },
    { n: "Khetag Khosonov", p: "CDM", a: 28, v: 0.81, r: 64 },
    { n: "Marat Bokoev", p: "CB", a: 25, v: 0.81, r: 64 },
    { n: "Rodrigo Escoval", p: "CB", a: 29, v: 0.81, r: 64 },
    { n: "Konstantin Maradishvili", p: "CDM", a: 26, v: 0.73, r: 64 },
    { n: "Yomar Rocha", p: "RB", a: 23, v: 0.73, r: 64 },
    { n: "Vitaliy Gudiev", p: "GK", a: 31, v: 0.65, r: 63 },
    { n: "Vyacheslav Bardybakhin", p: "LB", a: 24, v: 0.61, r: 63 },
    { n: "Artem Shumanskiy", p: "ST", a: 21, v: 0.57, r: 62 },
    { n: "Karlen Hovhannisyan", p: "CM", a: 21, v: 0.49, r: 62 },
    { n: "K\xE9vin Ar\xE9valo", p: "LW", a: 20, v: 0.41, r: 61 },
    { n: "Yuriy Zheleznov", p: "LW", a: 23, v: 0.41, r: 61 },
    { n: "Artem Sidorenko", p: "CM", a: 19, v: 0.32, r: 59 },
    { n: "Denis Popenkov", p: "LB", a: 20, v: 0.32, r: 59 },
    { n: "Ignat Terekhovskiy", p: "GK", a: 20, v: 0.32, r: 59 },
    { n: "Nikita Bazilevskiy", p: "CAM", a: 20, v: 0.32, r: 59 },
    { n: "Nikita Platon", p: "CDM", a: 19, v: 0.04, r: 48 }
  ],
  "Baltika": [
    { n: "Brayan Gil", p: "ST", a: 25, v: 4.05, r: 73 },
    { n: "Maksim Petrov", p: "CAM", a: 25, v: 2.43, r: 71 },
    { n: "Nathan Gassama", p: "CB", a: 25, v: 2.03, r: 70 },
    { n: "Sergey Varatynov", p: "CB", a: 23, v: 2.03, r: 70 },
    { n: "Chinonso Offor", p: "ST", a: 26, v: 1.62, r: 68 },
    { n: "Evgeniy Latyshonok", p: "GK", a: 28, v: 1.46, r: 68 },
    { n: "Mingiyan Beveev", p: "RB", a: 30, v: 1.46, r: 68 },
    { n: "Eduardo Anderson", p: "CB", a: 25, v: 1.22, r: 67 },
    { n: "Egor Golenkov", p: "ST", a: 27, v: 1.22, r: 67 },
    { n: "Aleksandr Filin", p: "CB", a: 30, v: 0.97, r: 65 },
    { n: "Ilya Petrov", p: "CM", a: 31, v: 0.97, r: 65 },
    { n: "Loris Mouyokolo", p: "CB", a: 25, v: 0.97, r: 65 },
    { n: "Aymane Mourid", p: "CDM", a: 26, v: 0.81, r: 64 },
    { n: "Mikhail Ryadno", p: "LB", a: 21, v: 0.81, r: 64 },
    { n: "Stefan Kovac", p: "CM", a: 27, v: 0.81, r: 64 },
    { n: "Andrey Mendel", p: "CDM", a: 31, v: 0.73, r: 64 },
    { n: "Fahd Moufi", p: "RB", a: 30, v: 0.73, r: 64 },
    { n: "Ivan Belikov", p: "CDM", a: 22, v: 0.73, r: 64 },
    { n: "Maksim Shnaptsev", p: "RB", a: 22, v: 0.65, r: 63 },
    { n: "Eldar Civic", p: "LB", a: 30, v: 0.61, r: 63 },
    { n: "Ilya Kirsh", p: "CB", a: 22, v: 0.61, r: 63 },
    { n: "Vladislav Pospelov", p: "CAM", a: 20, v: 0.57, r: 62 },
    { n: "Konstantin Shiltsov", p: "CAM", a: 24, v: 0.41, r: 61 },
    { n: "Egor Lyubakov", p: "GK", a: 27, v: 0.32, r: 59 },
    { n: "Ivan Kukushkin", p: "GK", a: 24, v: 0.24, r: 58 },
    { n: "Ilya Porokhov", p: "ST", a: 25, v: 0.2, r: 57 },
    { n: "Dmitriy Begun", p: "LB", a: 23, v: 0.1, r: 53 }
  ],
  "CSKA Moscow": [
    { n: "Matvey Kislyak", p: "CM", a: 21, v: 20.25, r: 82 },
    { n: "Ivan Oblyakov", p: "CM", a: 28, v: 8.1, r: 77 },
    { n: "Kirill Glebov", p: "RW", a: 20, v: 8.1, r: 77 },
    { n: "Dmitriy Barinov", p: "CDM", a: 30, v: 5.67, r: 75 },
    { n: "Kirill Danilov", p: "CB", a: 19, v: 5.67, r: 75 },
    { n: "Luciano Gondou", p: "ST", a: 25, v: 5.67, r: 75 },
    { n: "Danil Krugovoy", p: "LM", a: 28, v: 4.86, r: 74 },
    { n: "Matvey Lukin", p: "CB", a: 22, v: 3.24, r: 72 },
    { n: "Mois\xE9s", p: "LB", a: 31, v: 3.24, r: 72 },
    { n: "Milan Gajic", p: "RB", a: 30, v: 2.84, r: 71 },
    { n: "Danila Kozlov", p: "CAM", a: 21, v: 2.43, r: 71 },
    { n: "Ivan Oleynikov", p: "CAM", a: 28, v: 2.03, r: 70 },
    { n: "Matija Popovi\u0107", p: "CAM", a: 20, v: 2.03, r: 70 },
    { n: "Mohamed Azzi", p: "RB", a: 24, v: 2.03, r: 70 },
    { n: "Maksim Borisko", p: "GK", a: 26, v: 1.62, r: 68 },
    { n: "Maksim Voronov", p: "ST", a: 18, v: 1.62, r: 68 },
    { n: "Tamerlan Musaev", p: "ST", a: 25, v: 1.62, r: 68 },
    { n: "Vladislav Torop", p: "GK", a: 22, v: 1.62, r: 68 },
    { n: "Dzhamalutdin Abdulkadyrov", p: "CB", a: 21, v: 1.22, r: 67 },
    { n: "Igor Akinfeev", p: "GK", a: 40, v: 0.81, r: 64 },
    { n: "Artem Bandikyan", p: "CDM", a: 21, v: 0.61, r: 63 },
    { n: "Imran Firov", p: "LW", a: 18, v: 0.41, r: 61 },
    { n: "Artem Serikov", p: "RW", a: 19, v: 0.12, r: 54 },
    { n: "Egor Besaev", p: "GK", a: 20, v: 0.04, r: 48 },
    { n: "Nikolay Barovskiy", p: "GK", a: 20, v: 0.04, r: 48 }
  ],
  "Dynamo Makhachkala": [
    { n: "Houssem Mrezigue", p: "CDM", a: 26, v: 1.62, r: 68 },
    { n: "Gamid Agalarov", p: "ST", a: 26, v: 1.22, r: 67 },
    { n: "Mohammadjavad Hosseinnejad", p: "CAM", a: 23, v: 1.22, r: 67 },
    { n: "Nikita Glushkov", p: "CM", a: 27, v: 1.22, r: 67 },
    { n: "Temirkan Sundukov", p: "LB", a: 25, v: 1.22, r: 67 },
    { n: "Andr\xE9s Alarc\xF3n", p: "CB", a: 25, v: 0.97, r: 65 },
    { n: "Daniil Lesovoy", p: "LW", a: 28, v: 0.97, r: 65 },
    { n: "Idar Shumakhov", p: "CB", a: 27, v: 0.81, r: 64 },
    { n: "Miro", p: "ST", a: 23, v: 0.81, r: 64 },
    { n: "Mutalip Alibekov", p: "CB", a: 29, v: 0.73, r: 64 },
    { n: "David Volk", p: "GK", a: 25, v: 0.65, r: 63 },
    { n: "Ilyas Akhmedov", p: "CB", a: 19, v: 0.65, r: 63 },
    { n: "Timur Magomedov", p: "GK", a: 24, v: 0.65, r: 63 },
    { n: "Egor Smelov", p: "CAM", a: 21, v: 0.61, r: 63 },
    { n: "Marat Apshatsev", p: "CM", a: 25, v: 0.49, r: 62 },
    { n: "Soslan Kagermazov", p: "RB", a: 30, v: 0.49, r: 62 },
    { n: "Razhab Magomedov", p: "CAM", a: 26, v: 0.41, r: 61 },
    { n: "Abdulpasha Dzhabrailov", p: "CDM", a: 21, v: 0.32, r: 59 },
    { n: "Aleksandr Sandrachuk", p: "RB", a: 24, v: 0.32, r: 59 },
    { n: "Makhmud Makhamadzhonov", p: "LB", a: 23, v: 0.32, r: 59 },
    { n: "Vladimir Khubulov", p: "LW", a: 25, v: 0.32, r: 59 },
    { n: "Dmitriy Aleksandrov", p: "CDM", a: 20, v: 0.28, r: 59 },
    { n: "Kirill Zinovich", p: "CAM", a: 23, v: 0.28, r: 59 },
    { n: "Nikita Karabashev", p: "GK", a: 24, v: 0.24, r: 58 },
    { n: "Serder Serderov", p: "ST", a: 32, v: 0.2, r: 57 }
  ],
  "Dynamo Moscow": [
    { n: "Konstantin Tyukavin", p: "ST", a: 24, v: 13.77, r: 80 },
    { n: "Bitello", p: "CAM", a: 26, v: 12.15, r: 80 },
    { n: "Daniil Fomin", p: "CDM", a: 29, v: 5.67, r: 75 },
    { n: "Danil Glebov", p: "CDM", a: 26, v: 5.67, r: 75 },
    { n: "Juan Jos\xE9 C\xE1ceres", p: "RB", a: 26, v: 5.67, r: 75 },
    { n: "Luis Ch\xE1vez", p: "CDM", a: 30, v: 4.86, r: 74 },
    { n: "Maximiliano Guti\xE9rrez", p: "RW", a: 22, v: 4.86, r: 74 },
    { n: "Nicol\xE1s Marichal", p: "CB", a: 25, v: 4.05, r: 73 },
    { n: "Yaroslav Gladyshev", p: "RW", a: 23, v: 2.84, r: 71 },
    { n: "Arthur Gomes", p: "LW", a: 28, v: 2.43, r: 71 },
    { n: "Maksim Osipenko", p: "CB", a: 32, v: 2.43, r: 71 },
    { n: "Dmitriy Skopintsev", p: "LB", a: 29, v: 2.03, r: 70 },
    { n: "Ivan Sergeev", p: "ST", a: 31, v: 2.03, r: 70 },
    { n: "Kurban Rasulov", p: "GK", a: 20, v: 1.62, r: 68 },
    { n: "Timofey Marinkin", p: "CM", a: 18, v: 1.46, r: 68 },
    { n: "Milan Majstorovic", p: "CB", a: 21, v: 0.97, r: 65 },
    { n: "Viktor Okishor", p: "CAM", a: 19, v: 0.97, r: 65 },
    { n: "Aleksandr Kutitskiy", p: "CDM", a: 24, v: 0.81, r: 64 },
    { n: "Leon Zaydenzal", p: "RB", a: 22, v: 0.81, r: 64 },
    { n: "Andrey Lunev", p: "GK", a: 34, v: 0.65, r: 63 },
    { n: "Igor Leshchuk", p: "GK", a: 30, v: 0.49, r: 62 }
  ],
  "Fakel Voronezh": [
    { n: "Belajdi Pusi", p: "ST", a: 28, v: 0.81, r: 64 },
    { n: "Matvey Bardachev", p: "CB", a: 20, v: 0.81, r: 64 },
    { n: "Albert Gabaraev", p: "CB", a: 29, v: 0.65, r: 63 },
    { n: "Yuriy Zhuravlev", p: "CB", a: 30, v: 0.65, r: 63 },
    { n: "Aleksandr Koksharov", p: "ST", a: 21, v: 0.57, r: 62 },
    { n: "Daniil Frolkin", p: "GK", a: 25, v: 0.57, r: 62 },
    { n: "Darko Todorovic", p: "RB", a: 29, v: 0.57, r: 62 },
    { n: "Nikolay Giorgobiani", p: "CAM", a: 29, v: 0.57, r: 62 },
    { n: "Stanislav Magkeev", p: "CB", a: 27, v: 0.57, r: 62 },
    { n: "Aleksey Sutormin", p: "RW", a: 32, v: 0.49, r: 62 },
    { n: "Igor Obukhov", p: "GK", a: 30, v: 0.49, r: 62 },
    { n: "Vyacheslav Yakimov", p: "CDM", a: 28, v: 0.49, r: 62 },
    { n: "Butta Magomedov", p: "CAM", a: 28, v: 0.45, r: 61 },
    { n: "Axel Gnapi", p: "ST", a: 25, v: 0.41, r: 61 },
    { n: "Hodaifa El Mhassani", p: "RB", a: 26, v: 0.41, r: 61 },
    { n: "Maksim Turishchev", p: "ST", a: 24, v: 0.41, r: 61 },
    { n: "Abdula Bagamaev", p: "CAM", a: 21, v: 0.36, r: 60 },
    { n: "Igor Yurganov", p: "CB", a: 32, v: 0.36, r: 60 },
    { n: "Kirill Simonov", p: "CM", a: 20, v: 0.36, r: 60 },
    { n: "Ravil Netfullin", p: "CDM", a: 33, v: 0.36, r: 60 },
    { n: "Anton Kovalev", p: "RM", a: 26, v: 0.32, r: 59 },
    { n: "Ilnur Alshin", p: "LW", a: 33, v: 0.32, r: 59 },
    { n: "Vyacheslav Dorovskikh", p: "GK", a: 23, v: 0.14, r: 55 },
    { n: "Vladislav Kalinichev", p: "GK", a: 21, v: 0.04, r: 48 }
  ],
  "Krasnodar": [
    { n: "Stanislav Agkatsev", p: "GK", a: 24, v: 9.72, r: 78 },
    { n: "Jhon C\xF3rdoba", p: "ST", a: 33, v: 7.29, r: 77 },
    { n: "Nikita Krivtsov", p: "CAM", a: 24, v: 7.29, r: 77 },
    { n: "Aleksandr Chernikov", p: "CDM", a: 26, v: 6.48, r: 76 },
    { n: "Jo\xE3o Batxi", p: "RW", a: 28, v: 6.48, r: 76 },
    { n: "V\xEDtor Tormena", p: "CB", a: 30, v: 6.48, r: 76 },
    { n: "Dmitriy Vorobyov", p: "ST", a: 28, v: 5.67, r: 75 },
    { n: "Douglas Augusto", p: "CM", a: 29, v: 5.67, r: 75 },
    { n: "Kevin Pina", p: "CDM", a: 29, v: 4.05, r: 73 },
    { n: "Lucas Olaza", p: "LB", a: 32, v: 2.84, r: 71 },
    { n: "Ilya Vakhania", p: "RB", a: 25, v: 2.43, r: 71 },
    { n: "Maizon Rodr\xEDguez", p: "CB", a: 23, v: 2.43, r: 71 },
    { n: "Valentin Paltsev", p: "CB", a: 25, v: 2.43, r: 71 },
    { n: "Daniil Utkin", p: "CM", a: 26, v: 1.46, r: 68 },
    { n: "Juan Manuel Boselli", p: "CF", a: 26, v: 1.22, r: 67 },
    { n: "Jubal", p: "CB", a: 33, v: 1.22, r: 67 },
    { n: "Magomed Ozdoev", p: "CDM", a: 33, v: 0.97, r: 65 },
    { n: "Aleksandr Koryakin", p: "GK", a: 24, v: 0.61, r: 63 },
    { n: "Artem Khmarin", p: "LB", a: 19, v: 0.32, r: 59 },
    { n: "Efim Burkin", p: "CAM", a: 18, v: 0.24, r: 58 },
    { n: "Sergey Petrov", p: "RB", a: 35, v: 0.2, r: 57 }
  ],
  "Krylia Sovetov": [
    { n: "Fernando Costanza", p: "CDM", a: 27, v: 2.03, r: 70 },
    { n: "Yuriy Gorshkov", p: "LB", a: 27, v: 1.46, r: 68 },
    { n: "Ilzat Akhmetov", p: "CAM", a: 28, v: 1.22, r: 67 },
    { n: "Mihajlo Banjac", p: "CM", a: 26, v: 1.22, r: 67 },
    { n: "Nikita Chernov", p: "CB", a: 30, v: 1.22, r: 67 },
    { n: "Nikita Saltykov", p: "LW", a: 22, v: 1.22, r: 67 },
    { n: "Denis Makarov", p: "RW", a: 28, v: 0.97, r: 65 },
    { n: "Islam Chesnokov", p: "RW", a: 26, v: 0.97, r: 65 },
    { n: "Kirill Pechenin", p: "LB", a: 29, v: 0.97, r: 65 },
    { n: "Maksim Vityugov", p: "CDM", a: 28, v: 0.97, r: 65 },
    { n: "Nikolay Rasskazov", p: "RB", a: 28, v: 0.97, r: 65 },
    { n: "Dominik Oroz", p: "CB", a: 25, v: 0.81, r: 64 },
    { n: "Thomas Galdames", p: "LB", a: 27, v: 0.81, r: 64 },
    { n: "Martin Kramaric", p: "LW", a: 28, v: 0.73, r: 64 },
    { n: "Ivan Lepskiy", p: "CB", a: 21, v: 0.65, r: 63 },
    { n: "Nikita Kokarev", p: "GK", a: 23, v: 0.65, r: 63 },
    { n: "Sergey Bozhin", p: "CB", a: 32, v: 0.65, r: 63 },
    { n: "Amar Rahmanovic", p: "CAM", a: 32, v: 0.61, r: 63 },
    { n: "Dani Fern\xE1ndez", p: "RB", a: 29, v: 0.57, r: 62 },
    { n: "Jimmy Mar\xEDn", p: "RW", a: 29, v: 0.57, r: 62 },
    { n: "Kazbek Mukailov", p: "ST", a: 19, v: 0.49, r: 62 },
    { n: "Kirill Stolbov", p: "CM", a: 22, v: 0.49, r: 62 },
    { n: "Vladislav Shitov", p: "ST", a: 23, v: 0.49, r: 62 },
    { n: "Sergey Pesjakov", p: "GK", a: 37, v: 0.16, r: 55 },
    { n: "Evgeniy Frolov", p: "GK", a: 38, v: 0.04, r: 48 }
  ],
  "Lokomotiv Moscow": [
    { n: "Aleksandr Silyanov", p: "RB", a: 25, v: 6.48, r: 76 },
    { n: "C\xE9sar Montes", p: "CB", a: 29, v: 6.08, r: 76 },
    { n: "Sergey Pinyaev", p: "LW", a: 21, v: 6.08, r: 76 },
    { n: "Lucas Fasson", p: "CB", a: 25, v: 4.05, r: 73 },
    { n: "Evgeniy Morozov", p: "CB", a: 25, v: 3.24, r: 72 },
    { n: "Anton Mitryushkin", p: "GK", a: 30, v: 2.84, r: 71 },
    { n: "Gerzino Nyamsi", p: "CB", a: 29, v: 2.84, r: 71 },
    { n: "Andrey Mostovoy", p: "LW", a: 28, v: 2.43, r: 71 },
    { n: "Nikolay Komlichenko", p: "ST", a: 31, v: 2.43, r: 71 },
    { n: "Vadim Rakov", p: "ST", a: 21, v: 2.43, r: 71 },
    { n: "Aleksandr Rudenko", p: "LW", a: 27, v: 2.03, r: 70 },
    { n: "Maksim Nenakhov", p: "RB", a: 27, v: 2.03, r: 70 },
    { n: "Zelimkhan Bakaev", p: "RW", a: 30, v: 2.03, r: 70 },
    { n: "Lucas Vera", p: "CM", a: 29, v: 1.62, r: 68 },
    { n: "Sergey Babkin", p: "CM", a: 24, v: 1.62, r: 68 },
    { n: "Egor Pogostnov", p: "CB", a: 22, v: 1.22, r: 67 },
    { n: "Ilya Eremeev", p: "CM", a: 18, v: 1.22, r: 67 },
    { n: "Ilya Lantratov", p: "GK", a: 30, v: 1.22, r: 67 },
    { n: "Nikolay Titkov", p: "CM", a: 26, v: 1.22, r: 67 },
    { n: "Aleksandr Kovalenko", p: "CM", a: 23, v: 0.97, r: 65 },
    { n: "Cristian Ram\xEDrez", p: "LB", a: 32, v: 0.97, r: 65 },
    { n: "Georgiy Dzhikiya", p: "CB", a: 32, v: 0.81, r: 64 },
    { n: "Danila Godyaev", p: "CM", a: 22, v: 0.65, r: 63 },
    { n: "Vladislav Golubev", p: "ST", a: 18, v: 0.41, r: 61 },
    { n: "Mikhail Shchetinin", p: "CDM", a: 21, v: 0.28, r: 59 },
    { n: "Ruslan Myalkovskiy", p: "LW", a: 20, v: 0.28, r: 59 },
    { n: "Daniil Veselov", p: "GK", a: 21, v: 0.16, r: 55 }
  ],
  "Orenburg": [
    { n: "Andrey Kasadzhikov", p: "LW", a: 19, v: 1.62, r: 68 },
    { n: "Dami\xE1n Puebla", p: "CAM", a: 24, v: 1.62, r: 68 },
    { n: "Aleksandr Degtev", p: "GK", a: 21, v: 1.22, r: 67 },
    { n: "Jo\xE3o Silva", p: "CB", a: 27, v: 1.22, r: 67 },
    { n: "Jordhy Thompson", p: "RW", a: 22, v: 1.22, r: 67 },
    { n: "Evgeniy Bolotov", p: "CDM", a: 25, v: 0.97, r: 65 },
    { n: "Bogdan Ovsyannikov", p: "GK", a: 27, v: 0.81, r: 64 },
    { n: "Emil Tsenov", p: "CB", a: 24, v: 0.81, r: 64 },
    { n: "Jhon Alex Palacios", p: "CB", a: 27, v: 0.81, r: 64 },
    { n: "Aleksey Tataev", p: "CB", a: 28, v: 0.73, r: 64 },
    { n: "Danila Khotulev", p: "CB", a: 24, v: 0.73, r: 64 },
    { n: "Dmitriy Vasiljev", p: "CDM", a: 22, v: 0.73, r: 64 },
    { n: "Maxime Sivis", p: "RB", a: 28, v: 0.73, r: 64 },
    { n: "Ruslan Kul", p: "CM", a: 26, v: 0.65, r: 63 },
    { n: "Danila Vedernikov", p: "LB", a: 25, v: 0.61, r: 63 },
    { n: "Alexandre Jesus", p: "ST", a: 25, v: 0.57, r: 62 },
    { n: "Artem Kasimov", p: "CB", a: 23, v: 0.57, r: 62 },
    { n: "Dmitriy Rybchinskiy", p: "RM", a: 28, v: 0.57, r: 62 },
    { n: "Egor Nazarenko", p: "CAM", a: 21, v: 0.57, r: 62 },
    { n: "Jersson Gonz\xE1lez", p: "RW", a: 25, v: 0.57, r: 62 },
    { n: "Maksim Saveljev", p: "ST", a: 24, v: 0.57, r: 62 },
    { n: "Robert Mej\xEDa", p: "CDM", a: 26, v: 0.57, r: 62 },
    { n: "Anton Lukashov", p: "RB", a: 22, v: 0.36, r: 60 },
    { n: "Renat Golybin", p: "CAM", a: 21, v: 0.32, r: 59 },
    { n: "Gedeon Guzina", p: "ST", a: 32, v: 0.28, r: 59 },
    { n: "Stanislav Poroykov", p: "RB", a: 22, v: 0.24, r: 58 },
    { n: "Maksim Rudakov", p: "GK", a: 30, v: 0.2, r: 57 },
    { n: "Aleksey Baranovskiy", p: "CAM", a: 21, v: 0.18, r: 56 },
    { n: "Benjam\xEDn Bosch", p: "RW", a: 21, v: 0.16, r: 55 },
    { n: "Ivan Ivashchenko", p: "CDM", a: 18, v: 0.16, r: 55 },
    { n: "Maksim Syshchenko", p: "CB", a: 22, v: 0.12, r: 54 },
    { n: "Mikhail Pykhcheev", p: "CDM", a: 20, v: 0.12, r: 54 },
    { n: "Omar Minatulaev", p: "CM", a: 20, v: 0.08, r: 52 }
  ],
  "Rodina Moscow": [
    { n: "Micka\xEBl Nad\xE9", p: "CB", a: 27, v: 2.43, r: 71 },
    { n: "Rodrigo Bec\xE3o", p: "CB", a: 30, v: 1.62, r: 68 },
    { n: "German Onugkha", p: "ST", a: 30, v: 1.46, r: 68 },
    { n: "Artem Maksimenko", p: "ST", a: 28, v: 1.22, r: 67 },
    { n: "Iker Pozo", p: "CDM", a: 26, v: 1.22, r: 67 },
    { n: "Artem Meshchaninov", p: "CB", a: 30, v: 0.97, r: 65 },
    { n: "Brian Mansilla", p: "LW", a: 29, v: 0.97, r: 65 },
    { n: "Ivan Timoshenko", p: "ST", a: 27, v: 0.97, r: 65 },
    { n: "Mitja Krizan", p: "CB", a: 29, v: 0.97, r: 65 },
    { n: "Ruslan Fishchenko", p: "CDM", a: 26, v: 0.97, r: 65 },
    { n: "Artem Sokol", p: "RB", a: 29, v: 0.65, r: 63 },
    { n: "Stanislav Bessmertniy", p: "RB", a: 22, v: 0.65, r: 63 },
    { n: "Artur Gharibyan", p: "ST", a: 20, v: 0.61, r: 63 },
    { n: "Ilya Dyatlov", p: "LB", a: 22, v: 0.57, r: 62 },
    { n: "Leo Goglichidze", p: "LB", a: 29, v: 0.57, r: 62 },
    { n: "Dmitriy Tananeev", p: "CB", a: 28, v: 0.49, r: 62 },
    { n: "Soltmurad Bakaev", p: "RW", a: 27, v: 0.49, r: 62 },
    { n: "Leon Musaev", p: "CDM", a: 27, v: 0.41, r: 61 },
    { n: "Magomedkhabib Abdusalamov", p: "ST", a: 23, v: 0.41, r: 61 },
    { n: "Andrey Egorychev", p: "CAM", a: 33, v: 0.32, r: 59 },
    { n: "Astemir Gordyushenko", p: "CAM", a: 29, v: 0.32, r: 59 },
    { n: "Dmitriy Shadrintsev", p: "LB", a: 27, v: 0.28, r: 59 },
    { n: "Yordy Reyna", p: "CAM", a: 33, v: 0.28, r: 59 },
    { n: "Kerfala Cissoko", p: "ST", a: 27, v: 0.24, r: 58 },
    { n: "Kirill Ushatov", p: "CAM", a: 26, v: 0.2, r: 57 },
    { n: "Ilya Svinov", p: "GK", a: 26, v: 0.12, r: 54 },
    { n: "Sergey Aydarov", p: "GK", a: 28, v: 0.08, r: 52 }
  ],
  "Rostov": [
    { n: "Viktor Melekhin", p: "CB", a: 22, v: 3.24, r: 72 },
    { n: "Ronaldo", p: "RW", a: 25, v: 2.84, r: 71 },
    { n: "Olakunle Olusegun", p: "LW", a: 24, v: 2.03, r: 70 },
    { n: "Oumar Sako", p: "CB", a: 30, v: 2.03, r: 70 },
    { n: "Aleksey Mironov", p: "CM", a: 26, v: 1.62, r: 68 },
    { n: "Daniil Khlusevich", p: "RB", a: 25, v: 1.62, r: 68 },
    { n: "Konstantin Kuchaev", p: "CAM", a: 28, v: 1.62, r: 68 },
    { n: "Rustam Yatimov", p: "GK", a: 28, v: 1.62, r: 68 },
    { n: "Andrey Langovich", p: "RB", a: 23, v: 1.46, r: 68 },
    { n: "Ivan Komarov", p: "CAM", a: 23, v: 1.46, r: 68 },
    { n: "Timur Suleymanov", p: "ST", a: 26, v: 1.46, r: 68 },
    { n: "Maksim Mukhin", p: "CDM", a: 24, v: 0.97, r: 65 },
    { n: "Danila Prokhin", p: "CB", a: 25, v: 0.81, r: 64 },
    { n: "David Semenchuk", p: "CB", a: 21, v: 0.73, r: 64 },
    { n: "Ygor Nogueira", p: "CB", a: 31, v: 0.65, r: 63 },
    { n: "Daniil Shantaliy", p: "CM", a: 22, v: 0.61, r: 63 },
    { n: "Dmitriy Chistyakov", p: "CB", a: 32, v: 0.61, r: 63 },
    { n: "Yaroslav Mikhailov", p: "CM", a: 23, v: 0.57, r: 62 },
    { n: "German Ignatov", p: "CB", a: 21, v: 0.49, r: 62 },
    { n: "Artem Petrov", p: "GK", a: 18, v: 0.41, r: 61 },
    { n: "Imran Aznaurov", p: "LW", a: 22, v: 0.41, r: 61 },
    { n: "Anton Shamonin", p: "ST", a: 21, v: 0.28, r: 59 },
    { n: "Nikita Babakin", p: "CB", a: 20, v: 0.24, r: 58 },
    { n: "Daniil Golikov", p: "GK", a: 22, v: 0.2, r: 57 },
    { n: "Denis Titov", p: "LW", a: 19, v: 0.2, r: 57 },
    { n: "Ilya Zhbanov", p: "LM", a: 22, v: 0.2, r: 57 },
    { n: "Karim Madrakhimov", p: "RW", a: 18, v: 0.2, r: 57 },
    { n: "Ibraheem Mahfus Ajasa", p: "LW", a: 20, v: 0.12, r: 54 }
  ],
  "Rubin Kazan": [
    { n: "Ilya Rozhkov", p: "LB", a: 21, v: 4.05, r: 73 },
    { n: "Veldin Hodza", p: "CDM", a: 23, v: 3.24, r: 72 },
    { n: "Jacques Siwe", p: "ST", a: 25, v: 2.84, r: 71 },
    { n: "Anderson Arroyo", p: "RB", a: 27, v: 2.27, r: 70 },
    { n: "Egor Teslenko", p: "CB", a: 25, v: 2.27, r: 70 },
    { n: "Igor Vujacic", p: "CB", a: 32, v: 2.27, r: 70 },
    { n: "Evgeniy Staver", p: "GK", a: 28, v: 2.03, r: 70 },
    { n: "Ignacio Saavedra", p: "CDM", a: 27, v: 2.03, r: 70 },
    { n: "Nazmi Gripshi", p: "CAM", a: 29, v: 2.03, r: 70 },
    { n: "Denil Maldonado", p: "CB", a: 28, v: 1.62, r: 68 },
    { n: "Ilya Samoshnikov", p: "LB", a: 28, v: 1.62, r: 68 },
    { n: "Dardan Shabanhaxhaj", p: "ST", a: 25, v: 1.22, r: 67 },
    { n: "Eddie Salcedo", p: "ST", a: 25, v: 1.22, r: 67 },
    { n: "Nikita Lobov", p: "CB", a: 21, v: 1.22, r: 67 },
    { n: "Jakhongir Urozov", p: "CB", a: 22, v: 0.97, r: 65 },
    { n: "Aleksandar Jukic", p: "CM", a: 26, v: 0.73, r: 64 },
    { n: "Bogdan Jocic", p: "CM", a: 25, v: 0.73, r: 64 },
    { n: "Aleksey Gritsaenko", p: "CB", a: 31, v: 0.61, r: 63 },
    { n: "Ulvi Babaev", p: "LW", a: 22, v: 0.61, r: 63 },
    { n: "Konstantin Nizhegorodov", p: "CB", a: 24, v: 0.57, r: 62 },
    { n: "Daniil Motorin", p: "ST", a: 22, v: 0.49, r: 62 },
    { n: "Maksim Ignatjev", p: "LB", a: 26, v: 0.49, r: 62 },
    { n: "Daniil Kuznetsov", p: "RW", a: 23, v: 0.41, r: 61 },
    { n: "Dmitriy Kabutov", p: "RM", a: 34, v: 0.32, r: 59 },
    { n: "Artur Nigmatullin", p: "GK", a: 35, v: 0.24, r: 58 },
    { n: "Matvey Ivanov", p: "LW", a: 19, v: 0.24, r: 58 },
    { n: "Nikita Korets", p: "GK", a: 21, v: 0.16, r: 55 }
  ],
  "Spartak Moscow": [
    { n: "Esequiel Barco", p: "CAM", a: 27, v: 12.96, r: 80 },
    { n: "Manfred Ugalde", p: "ST", a: 24, v: 9.72, r: 78 },
    { n: "Mirlind Daku", p: "ST", a: 28, v: 8.1, r: 77 },
    { n: "Pablo Solari", p: "RW", a: 25, v: 6.48, r: 76 },
    { n: "Nail Umyarov", p: "CDM", a: 26, v: 6.08, r: 76 },
    { n: "Danil Prutsev", p: "CM", a: 26, v: 4.86, r: 74 },
    { n: "Ruslan Litvinov", p: "CB", a: 25, v: 4.86, r: 74 },
    { n: "Aleksandr Maksimenko", p: "GK", a: 28, v: 3.24, r: 72 },
    { n: "Daniil Denisov", p: "RB", a: 23, v: 3.24, r: 72 },
    { n: "Srdjan Babic", p: "CB", a: 30, v: 3.24, r: 72 },
    { n: "Alexander Djiku", p: "CB", a: 32, v: 2.84, r: 71 },
    { n: "Christopher Martins", p: "CDM", a: 29, v: 2.84, r: 71 },
    { n: "Anton Zinkovskiy", p: "LW", a: 30, v: 1.62, r: 68 },
    { n: "Roman Zobnin", p: "CM", a: 32, v: 1.62, r: 68 },
    { n: "Vladislav Saus", p: "RM", a: 23, v: 1.62, r: 68 },
    { n: "Ilya Pomazun", p: "GK", a: 30, v: 0.81, r: 64 },
    { n: "Daniil Zorin", p: "CAM", a: 22, v: 0.57, r: 62 },
    { n: "Nikita Massalyga", p: "RW", a: 18, v: 0.32, r: 59 },
    { n: "Pavel Polekh", p: "LW", a: 16, v: 0.2, r: 57 },
    { n: "Ivan Sorokin", p: "CM", a: 18, v: 0.16, r: 55 },
    { n: "Aleksandr Dovbnya", p: "GK", a: 39, v: 0.04, r: 48 }
  ],
  "Zenit": [
    { n: "Luiz Henrique", p: "RW", a: 25, v: 19.44, r: 82 },
    { n: "Maksim Glushenkov", p: "CF", a: 27, v: 12.15, r: 80 },
    { n: "Wendel", p: "CM", a: 29, v: 12.15, r: 80 },
    { n: "Igor Diveev", p: "CB", a: 27, v: 8.1, r: 77 },
    { n: "Nino", p: "CB", a: 29, v: 7.29, r: 77 },
    { n: "Aleksandr Sobolev", p: "ST", a: 29, v: 6.08, r: 76 },
    { n: "Douglas Santos", p: "LB", a: 32, v: 6.08, r: 76 },
    { n: "Artem Karpukas", p: "CDM", a: 24, v: 5.67, r: 75 },
    { n: "Gustavo Mantuan", p: "RB", a: 25, v: 4.05, r: 73 },
    { n: "Rom\xE1n Vega", p: "LB", a: 22, v: 4.05, r: 73 },
    { n: "Wilmar Barrios", p: "CDM", a: 32, v: 4.05, r: 73 },
    { n: "Denis Adamov", p: "GK", a: 28, v: 2.84, r: 71 },
    { n: "Kevin Andrade", p: "CB", a: 27, v: 2.84, r: 71 },
    { n: "Daniil Kondakov", p: "CAM", a: 18, v: 2.03, r: 70 },
    { n: "Nuraly Alip", p: "CB", a: 26, v: 1.62, r: 68 },
    { n: "Vyacheslav Karavaev", p: "RB", a: 31, v: 1.62, r: 68 },
    { n: "Sergey Volkov", p: "RB", a: 24, v: 1.22, r: 67 },
    { n: "Vadim Shilov", p: "RW", a: 18, v: 0.65, r: 63 },
    { n: "Bogdan Moskvichev", p: "GK", a: 22, v: 0.49, r: 62 },
    { n: "Daniil Odoevskiy", p: "GK", a: 23, v: 0.49, r: 62 },
    { n: "Aleksandr Erokhin", p: "CAM", a: 36, v: 0.08, r: 52 }
  ]
};

// src/data/clubManagerWorldRosters.ts
function joinWorld() {
  const out = { ...CM_ROSTERS };
  for (const [name, club] of Object.entries(CM_ALEAGUE_SUPERSEDES)) {
    const list = out[club];
    if (list) out[club] = list.filter((p) => p.n !== name);
  }
  return { ...out, ...CM_ALEAGUE_ROSTERS, ...CM_RUSSIA_ROSTERS };
}
var CM_WORLD_ROSTERS = joinWorld();
var CM_WORLD_PARTIAL = [...CM_PARTIAL, ...CM_ALEAGUE_PARTIAL, ...CM_RUSSIA_PARTIAL];
var CM_GENERATED_LEAGUES = [
  { label: "A-League Men", players: CM_ALEAGUE_META.players, read: CM_ALEAGUE_META.read, readTo: CM_ALEAGUE_META.read },
  { label: CM_RUSSIA_META.label, players: CM_RUSSIA_META.players, read: CM_RUSSIA_META.read, readTo: CM_RUSSIA_META.readTo }
];

// src/lib/clubManagerEras.ts
var CM_BASE_YEAR = 2026;
function seasonLabel(year) {
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`;
}
var ENTRY_AGE_WEIGHTS = [
  [17, 4],
  [18, 9],
  [19, 13],
  [20, 15],
  [21, 14],
  [22, 13],
  [23, 11],
  [24, 9],
  [25, 7],
  [26, 5]
];
var ENTRY_AGE_TOTAL = ENTRY_AGE_WEIGHTS.reduce((s2, [, w]) => s2 + w, 0);
var ERA_PLAYERS = {};
function eraPlayersPhrase(eraId) {
  const n = ERA_PLAYERS[eraId];
  return n === void 0 ? "Real players" : `${n} real players`;
}
var CM_ERAS = [
  {
    id: "now",
    label: seasonLabel(CM_BASE_YEAR),
    startYear: CM_BASE_YEAR,
    emoji: "\u{1F4C5}",
    /* Round 832: the old lines promised every squad exactly as it is and
       every name real, which the youth padding of thin squads made false.
       They say what the squads really are now. */
    blurb: "Today. Real squads as of August 2026, thin ones topped up with made up youth.",
    honesty: "Real data: every real player has his real name, age and value as of August 2026. Thin squads are padded with made up youth players and say so."
  },
  /* Round 971: the fourth past season, the newest, so it sits first. The
     blurb names only squads the bake carries (its anchors in
     scripts/bakeEra2020.mjs), and the honesty line owns up to the summer
     movers no dated record placed.
     Review fix: the honesty line says what the bake does. A move is made
     where a dated record shows it AND the next season's row names the club;
     a leaver whose new club no row confirms is left out (Glik, Tatarusanu);
     a mover no record covered stays put (Lazaro, Biraghi). The empty
     stadiums are that season's, read 2026-10-05: premierleague.com ("How has
     the COVID-19 pandemic affected Premier League matches?": behind closed
     doors "largely ... throughout the season", fans back in limited numbers
     in December in some areas and in May) and Sky Sports ("How 2020 changed
     football: Fans stay at home"). The brief also asked for five
     substitutes, but the Premier League voted to stay at three for 2020-21
     (Sky Sports, "Premier League clubs vote against allowing five
     substitutes in 2020/21 season"; ESPN), so the card does not claim it.
     Closing check fix, every source read 2026-10-05. The empty stadiums
     were all five leagues', not only England's: Deloitte's Annual Review of
     Football Finance 2022 (deloitte.com/ce/en/industries/tmt/research/
     gx-annual-review-of-football-finance.html: "matches played behind
     closed doors and stadia empty for the majority of the season") and
     KPMG Football Benchmark on the big five clubs (essma.eu, 7 September
     2021: the 2020/21 season "was played in empty stadiums"). The
     substitutes are said as they were: five in the other four leagues
     (Inside World Football, 18 December 2020, naming La Liga, the
     Bundesliga, Serie A and Ligue 1; ESPN, Dale Johnson, 4 August 2022,
     espn.com/soccer/story/_/id/37630254), three in the Premier League (Sky
     Sports 12062269, 4 September 2020: "three replacements from seven";
     ESPN 37585852, 6 August 2020; NBC Sports, 17 December 2020). Round 1331:
     the engine now plays each league's own rule by season (subsRuleFor in
     clubManagerSubsRule.ts, sourced in scripts/data/cmSubsRuleSources.json),
     so the card says the matches follow it; simEra2020 section 8 holds the
     card's numbers to the engine's. */
  {
    id: "era2020",
    label: seasonLabel(2020),
    startYear: 2020,
    emoji: "\u{1F3DF}\uFE0F",
    blurb: "Haaland and Bellingham at Dortmund, Mbapp\xE9 and Neymar at PSG, Bruno at United, Lewandowski at Bayern. All of the big five, 2020-21.",
    get honesty() {
      return `Real data. ${eraPlayersPhrase("era2020")} with their real 2020 ages and values, all 98 clubs of the 2020-21 Premier League, La Liga, Serie A, Bundesliga and Ligue 1, a season played mostly in empty stadiums. Spain, Italy, Germany and France let a side make five changes in three stoppages that year while the Premier League stayed at three, and the matches here follow the same rule. Summer 2020 moves are made where a dated record shows them and the next season's data agrees. A man who left for a club the data can't confirm is left out rather than guessed, and a mover no record covered still sits at his old club. Thin squads are padded with made up youth players and say so.`;
    }
  },
  {
    id: "era2015",
    label: seasonLabel(2015),
    startYear: 2015,
    emoji: "\u{1F98A}",
    blurb: "The Leicester season. MSN Barcelona, Vardy at 5000 to 1, Lewandowski at Bayern, Ibrahimovic at PSG. All of the big five, 2015-16.",
    get honesty() {
      return `Real data. ${eraPlayersPhrase("era2015")} with their real 2015 ages and values, all 98 clubs of the 2015-16 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`;
    }
  },
  {
    id: "era2010",
    label: seasonLabel(2010),
    startYear: 2010,
    emoji: "\u{1F570}\uFE0F",
    /* Round 901, read 2026-10-03: Klopp's young Dortmund won the 2010-11
       Bundesliga (bundesliga.com, "Jurgen Klopp: how Borussia Dortmund won
       the 2010/11 German top flight"; ESPN, story 37503225), and Lille won
       Ligue 1 and the Coupe de France, their first double since 1946
       (UEFA.com, "Lille celebrating breakthrough double"; Al Jazeera, 21 May
       2011, "Lille win first French title in 57 years"; RSSSF's season). */
    blurb: "Prime Messi. Mourinho's Madrid. Klopp's young Dortmund. Lille's double. All of the big five, 2010-11.",
    get honesty() {
      return `Real data. ${eraPlayersPhrase("era2010")} with their real 2010 ages and values, all 98 clubs of the 2010-11 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`;
    }
  },
  {
    id: "era2005",
    label: seasonLabel(2005),
    startYear: 2005,
    emoji: "\u{1F4FC}",
    blurb: "Ronaldinho's Ballon d'Or. Mourinho's Chelsea. A 17 year old Messi. Shevchenko's Milan, Ballack's Bayern, Juninho's Lyon. All of the big five, 2005-06.",
    get honesty() {
      return `Real data. ${eraPlayersPhrase("era2005")} with their real 2005 ages and values, all 98 clubs of the 2005-06 Premier League, La Liga, Serie A, Bundesliga and Ligue 1. Thin squads are padded with made up youth players and say so.`;
    }
  }
];
var CM_CLOCK_META = {
  baseYear: CM_BASE_YEAR,
  rosterAsOf: CM_ROSTER_META.asOf
};

// src/lib/gmXp.ts
var GM_TREES = [
  "scouting",
  "negotiation",
  "capCraft",
  "development",
  "trading",
  "ownership",
  "media"
];
var GM_MAX_TREE_POINTS = 5;
var GM_MAX_LEVEL = 1 + GM_TREES.length * GM_MAX_TREE_POINTS;

// src/lib/clubManagerXp.ts
var SKILL_TREES = [
  "tactics",
  "recruitment",
  "negotiation",
  "youth",
  "manManagement",
  "finance",
  "media"
];
var MAX_TREE_POINTS = 5;
var MAX_LEVEL = 1 + SKILL_TREES.length * MAX_TREE_POINTS;

// src/lib/clubManagerStart.ts
var CURRENCY_CODES = ["GBP", "EUR", "USD", "BRL", "JPY"];
var CURRENCIES = {
  GBP: { symbol: "\xA3", label: "Pounds" },
  EUR: { symbol: "\u20AC", label: "Euros" },
  USD: { symbol: "$", label: "Dollars" },
  BRL: { symbol: "R$", label: "Reais" },
  JPY: { symbol: "\xA5", label: "Yen" }
};
var DEFAULT_CURRENCY = "GBP";
var STRICTNESS_MIN = 1;
var STRICTNESS_MAX = 5;
var STRICTNESS_DEFAULT = 3;
var START_OPTIONS_VERSION = 1;
function defaultStartOptions() {
  return {
    v: START_OPTIONS_VERSION,
    currency: DEFAULT_CURRENCY,
    nationJobs: true,
    strictness: STRICTNESS_DEFAULT
  };
}
function isValidStartOptions(u) {
  if (!u || typeof u !== "object" || Array.isArray(u)) return false;
  const o = u;
  if (o.v !== START_OPTIONS_VERSION) return false;
  if (typeof o.currency !== "string" || !CURRENCY_CODES.includes(o.currency)) return false;
  if (typeof o.nationJobs !== "boolean") return false;
  const s2 = o.strictness;
  if (typeof s2 !== "number" || !Number.isInteger(s2) || s2 < STRICTNESS_MIN || s2 > STRICTNESS_MAX) return false;
  return true;
}
function startOptionsOf(state) {
  return isValidStartOptions(state.startOptions) ? state.startOptions : defaultStartOptions();
}
function currencySymbol(state) {
  return CURRENCIES[startOptionsOf(state).currency].symbol;
}

// src/lib/saveFence.ts
var FENCE_PREFIX = "dukb-fence:";
var fenceKeyOf = (saveKey2) => FENCE_PREFIX + saveKey2;
function createSaveFence(source) {
  const held = /* @__PURE__ */ new Map();
  const store = () => {
    try {
      return (typeof source === "function" ? source() : source) ?? null;
    } catch {
      return null;
    }
  };
  const stored = (saveKey2) => {
    try {
      const raw = store()?.getItem(fenceKeyOf(saveKey2));
      if (raw === null || raw === void 0 || raw.trim() === "") return null;
      const n = Number(raw);
      return Number.isSafeInteger(n) && n >= 0 ? n : null;
    } catch {
      return null;
    }
  };
  const moved = (saveKey2) => {
    const mine = held.get(saveKey2);
    if (mine === void 0) return false;
    const now = stored(saveKey2);
    return now !== null && now !== mine;
  };
  return {
    adopt(saveKey2) {
      held.set(saveKey2, stored(saveKey2) ?? 0);
    },
    release(saveKey2) {
      held.delete(saveKey2);
    },
    moved,
    write(saveKey2, doWrite) {
      if (moved(saveKey2)) return "moved";
      const mine = held.get(saveKey2);
      const next = Math.max(mine ?? 0, stored(saveKey2) ?? 0) + 1;
      const s2 = store();
      let before = null;
      let fenced = false;
      try {
        if (s2) {
          before = s2.getItem(fenceKeyOf(saveKey2));
          s2.setItem(fenceKeyOf(saveKey2), String(next));
          fenced = true;
        }
      } catch {
      }
      let ok = false;
      try {
        ok = doWrite() === true;
      } catch {
        ok = false;
      }
      let at = fenced ? next : mine;
      if (fenced && !ok && s2) {
        try {
          if (before === null) s2.removeItem(fenceKeyOf(saveKey2));
          else s2.setItem(fenceKeyOf(saveKey2), before);
          at = mine;
        } catch {
        }
      }
      if (mine !== void 0 && at !== void 0) held.set(saveKey2, at);
      return ok ? "written" : "failed";
    }
  };
}
var saveFence = createSaveFence(
  () => typeof window === "undefined" ? null : window.localStorage
);

// src/lib/clubManager.ts
var cmSlot = (label, allowed, x, y) => ({ label, allowed, x, y });
var CM_GK = () => cmSlot("GK", ["GK"], 50, 90);
var { DC: CM_DC, DR: CM_DR, DL: CM_DL, MD: CM_MD, DM: CM_DM, AM: CM_AM, AMF: CM_AMF, WR: CM_WR, WL: CM_WL, FW: CM_FW } = SLOT_ALLOWED;
var CM_FORMATIONS = [
  ...FORMATIONS,
  { name: "4-3-3 holding", slots: [CM_GK(), cmSlot("RB", CM_DR, 84, 70), cmSlot("CB", CM_DC, 62, 74), cmSlot("CB", CM_DC, 38, 74), cmSlot("LB", CM_DL, 16, 70), cmSlot("CDM", CM_DM, 50, 58), cmSlot("CM", CM_MD, 68, 46), cmSlot("CM", CM_MD, 32, 46), cmSlot("RW", CM_WR, 80, 24), cmSlot("ST", CM_FW, 50, 18), cmSlot("LW", CM_WL, 20, 24)] },
  { name: "4-2-2-2", slots: [CM_GK(), cmSlot("RB", CM_DR, 84, 70), cmSlot("CB", CM_DC, 62, 74), cmSlot("CB", CM_DC, 38, 74), cmSlot("LB", CM_DL, 16, 70), cmSlot("CDM", CM_DM, 62, 56), cmSlot("CDM", CM_DM, 38, 56), cmSlot("CAM", CM_AM, 66, 36), cmSlot("CAM", CM_AM, 34, 36), cmSlot("ST", CM_FW, 60, 18), cmSlot("ST", CM_FW, 40, 18)] },
  { name: "3-4-2-1", slots: [CM_GK(), cmSlot("CB", CM_DC, 68, 74), cmSlot("CB", CM_DC, 50, 76), cmSlot("CB", CM_DC, 32, 74), cmSlot("RWB", CM_WR, 86, 50), cmSlot("CM", CM_MD, 60, 54), cmSlot("CM", CM_MD, 40, 54), cmSlot("LWB", CM_WL, 14, 50), cmSlot("CAM", CM_AMF, 64, 34), cmSlot("CAM", CM_AMF, 36, 34), cmSlot("ST", CM_FW, 50, 16)] },
  { name: "4-1-4-1", slots: [CM_GK(), cmSlot("RB", CM_DR, 84, 70), cmSlot("CB", CM_DC, 62, 74), cmSlot("CB", CM_DC, 38, 74), cmSlot("LB", CM_DL, 16, 70), cmSlot("CDM", CM_DM, 50, 60), cmSlot("RM", CM_WR, 84, 44), cmSlot("CM", CM_MD, 62, 48), cmSlot("CM", CM_MD, 38, 48), cmSlot("LM", CM_WL, 16, 44), cmSlot("ST", CM_FW, 50, 18)] },
  { name: "5-4-1", slots: [CM_GK(), cmSlot("RWB", CM_WR, 88, 64), cmSlot("CB", CM_DC, 68, 76), cmSlot("CB", CM_DC, 50, 78), cmSlot("CB", CM_DC, 32, 76), cmSlot("LWB", CM_WL, 12, 64), cmSlot("RM", CM_WR, 82, 46), cmSlot("CM", CM_MD, 60, 50), cmSlot("CM", CM_MD, 40, 50), cmSlot("LM", CM_WL, 18, 46), cmSlot("ST", CM_FW, 50, 18)] },
  { name: "4-3-1-2", slots: [CM_GK(), cmSlot("RB", CM_DR, 84, 70), cmSlot("CB", CM_DC, 62, 74), cmSlot("CB", CM_DC, 38, 74), cmSlot("LB", CM_DL, 16, 70), cmSlot("CM", CM_MD, 68, 52), cmSlot("CM", CM_MD, 50, 56), cmSlot("CM", CM_MD, 32, 52), cmSlot("CAM", CM_AM, 50, 34), cmSlot("ST", CM_FW, 60, 18), cmSlot("ST", CM_FW, 40, 18)] },
  { name: "3-5-2 high wing backs", slots: [CM_GK(), cmSlot("CB", CM_DC, 68, 74), cmSlot("CB", CM_DC, 50, 76), cmSlot("CB", CM_DC, 32, 74), cmSlot("RWB", CM_WR, 88, 42), cmSlot("CM", CM_MD, 64, 54), cmSlot("CM", CM_MD, 50, 58), cmSlot("CM", CM_MD, 36, 54), cmSlot("LWB", CM_WL, 12, 42), cmSlot("ST", CM_FW, 60, 20), cmSlot("ST", CM_FW, 40, 20)] },
  { name: "4-2-3-1 wide", slots: [CM_GK(), cmSlot("RB", CM_DR, 84, 70), cmSlot("CB", CM_DC, 62, 74), cmSlot("CB", CM_DC, 38, 74), cmSlot("LB", CM_DL, 16, 70), cmSlot("CDM", CM_DM, 62, 56), cmSlot("CDM", CM_DM, 38, 56), cmSlot("RW", CM_WR, 88, 30), cmSlot("CAM", CM_AM, 50, 36), cmSlot("LW", CM_WL, 12, 30), cmSlot("ST", CM_FW, 50, 16)] }
];
var SPLIT_SIMPLIFIED = "The real league splits into groups part way through the season; it is played here as a straight double round robin.";
var CONFERENCE_LEAGUE_UNPLAYED = "The Conference League place this table really earned (the competition began the season after) is not played.";
var SUMMER_2020_CLOSE = { y: 2020, m: 10, d: 5 };
var LEAGUE_RULES = {
  premier: { nationId: "england", flag: "England", cup: "FA Cup", europe: { ucl: 4, uel: 5, uecl: 6 }, drop: 3, tiebreak: "gdGf", secondTier: "championship", ladder: "top", season: "autumnSpring" },
  /* Round 1520 review: Cardiff City, Swansea City and Wrexham are Welsh clubs in the English league (clwbpeldroed.org,
     2025-01-13, on the Welsh league cup plan naming the Welsh EFL clubs; hayters.com, "Why Wrexham, Swansea and Cardiff
     could play in Europe"), so their board asks for Welsh players and their made up men are drawn from Wales. */
  championship: {
    clubCountry: { "Cardiff City": "Wales", "Swansea City": "Wales", Wrexham: "Wales" },
    nationId: "england",
    flag: "England",
    cup: "FA Cup",
    europe: null,
    drop: 3,
    ladder: "promotion",
    playoff: { rankUpTo: 8, target: 6, label: "Make the promotion playoffs" },
    season: "autumnSpring",
    simplified: "Three go up and three come down in a straight swap; the real promotion playoff is not played."
  },
  laliga: { nationId: "spain", flag: "Spain", cup: "Copa del Rey", europe: { ucl: 4, uel: 5, uecl: 6 }, drop: 3, tiebreak: "h2h", secondTier: "segunda", ladder: "top", season: "autumnSpring" },
  seriea: { nationId: "italy", flag: "Italy", cup: "Coppa Italia", europe: { ucl: 4, uel: 5, uecl: 6 }, drop: 3, tiebreak: "h2h", secondTier: "serieb", ladder: "top", season: "autumnSpring" },
  bundesliga: {
    nationId: "germany",
    flag: "Germany",
    cup: "DFB-Pokal",
    europe: { ucl: 4, uel: 5, uecl: 6 },
    drop: 2,
    tiebreak: "gdGfAgg",
    secondTier: "bundesliga2",
    ladder: "top",
    season: "autumnSpring",
    simplified: "The real relegation playoff (sixteenth against the 2. Bundesliga's third) is not played: two go straight down and two straight up."
  },
  /* Round 1040: two go down, not three, and Ligue 2 is modelled under it.
     2025-26: Metz and Nantes went straight down and sixteenth placed Nice
     kept their place in the barrage against Saint-Étienne, Ligue 2's
     playoff winner (franceinfo, 2026-05-29,
     https://www.franceinfo.fr/sports/foot/ligue-1/barrage-ligue-1-ligue-2-vainqueur-au-match-retour-nice-se-maintient-dans-l-elite-saint-etienne-reste-en-deuxieme-division_8036279.html;
     LFP, "2025-2026 : tout savoir sur les play-offs et les barrages de
     Ligue 2 BKT", https://ligue1.com/fr/articles/l1_article_3785-2025-2026-tout-savoir-sur-les-play-offs-et-les-barrages-de-ligue-2-bkt).
     2026-27: Foot Mercato's table legend (read 2026-10-06,
     https://www.footmercato.net/france/ligue-1/classement) says the same, the
     last two down and sixteenth in a barrage; THIN for 2026-27 in that it is
     one publisher, on the same shape as the season before. */
  ligue1: {
    nationId: "france",
    flag: "France",
    cup: "Coupe de France",
    europe: { ucl: 3, uel: 4, uecl: 5 },
    drop: 2,
    tiebreak: "gdH2h",
    secondTier: "ligue2",
    ladder: "top",
    season: "autumnSpring",
    simplified: "The real relegation barrage (sixteenth against the winner of Ligue 2's playoffs) is not played: two go straight down and two straight up."
  },
  eredivisie: { nationId: "netherlands", flag: "Netherlands", cup: "KNVB Cup", europe: { ucl: 2, uel: 3, uecl: 4 }, drop: 2, ladder: "top", season: "autumnSpring" },
  saudi: {
    nationId: "saudi",
    flag: "Saudi Arabia",
    cup: "King's Cup",
    europe: null,
    drop: 3,
    ladder: "top",
    season: "autumnSpring",
    continental: { label: "AFC Champions League Elite", rankUpTo: 5, target: 3 }
  },
  /* Round 1520 review: Toronto FC, CF Montréal and Vancouver Whitecaps are the Canadian clubs of MLS (CBC, "Major
     League Soccer Canadian teams 2021 schedule"; footballgroundmap.com, "The Canadian teams in the MLS"). */
  mlsEast: {
    clubCountry: { "Toronto FC": "Canada", "CF Montr\xE9al": "Canada" },
    nationId: "usa",
    flag: "USA",
    cup: "U.S. Open Cup",
    europe: null,
    drop: 0,
    ladder: "playoffs",
    playoff: { rankUpTo: 9, target: 8, label: "Make the playoffs" },
    floorFromBottom: 4,
    season: "calendarYear",
    simplified: "The playoffs are not played; the conference table settles the season."
  },
  mlsWest: {
    clubCountry: { "Vancouver Whitecaps": "Canada" },
    nationId: "usa",
    flag: "USA",
    cup: "U.S. Open Cup",
    europe: null,
    drop: 0,
    ladder: "playoffs",
    playoff: { rankUpTo: 9, target: 8, label: "Make the playoffs" },
    floorFromBottom: 4,
    season: "calendarYear",
    simplified: "The playoffs are not played; the conference table settles the season."
  },
  primeira: { nationId: "portugal", flag: "Portugal", cup: "Ta\xE7a de Portugal", europe: { ucl: 2, uel: 3, uecl: 4 }, drop: 2, ladder: "top", season: "autumnSpring" },
  scottish: { nationId: "scotland", flag: "Scotland", cup: "Scottish Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 1, ladder: "top", season: "autumnSpring" },
  superlig: { nationId: "turkey", flag: "T\xFCrkiye", cup: "Turkish Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 3, ladder: "top", season: "autumnSpring" },
  bundesliga2: {
    nationId: "germany",
    flag: "Germany",
    cup: "DFB-Pokal",
    europe: null,
    drop: 2,
    ladder: "promotion",
    playoff: { rankUpTo: 6, target: 3, label: "Reach the promotion playoff" },
    season: "autumnSpring",
    simplified: "The real promotion playoff (third against the Bundesliga's sixteenth) is not played: two go straight up and two straight down."
  },
  proleague: { nationId: "belgium", flag: "Belgium", cup: "Belgian Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 1, ladder: "top", season: "autumnSpring" },
  austria: { nationId: "austria", flag: "Austria", cup: "\xD6FB Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 1, ladder: "top", season: "autumnSpring", simplified: SPLIT_SIMPLIFIED },
  greece: { nationId: "greece", flag: "Greece", cup: "Greek Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 2, ladder: "top", season: "autumnSpring", simplified: SPLIT_SIMPLIFIED },
  denmark: { nationId: "denmark", flag: "Denmark", cup: "Danish Cup", europe: { ucl: 1, uel: 2, uecl: 3 }, drop: 2, ladder: "top", season: "autumnSpring", simplified: SPLIT_SIMPLIFIED },
  switzerland: {
    nationId: "switzerland",
    flag: "Switzerland",
    cup: "Swiss Cup",
    europe: { ucl: 1, uel: 2, uecl: 3 },
    drop: 1,
    ladder: "top",
    season: "autumnSpring",
    simplified: `${SPLIT_SIMPLIFIED} One goes straight down and the real relegation playoff is not played.`
  },
  croatia: {
    nationId: "croatia",
    flag: "Croatia",
    cup: "Croatian Cup",
    europe: { ucl: 1, uel: 2, uecl: 3 },
    drop: 1,
    ladder: "top",
    season: "autumnSpring",
    simplified: "The real league plays each other four times over 36 rounds and settles ninth in a playoff; it is played here as a straight double round robin with one going straight down."
  },
  /* Round 876: Brazil's Serie A. The real shape (20 clubs, double round
     robin, four down) with three simplifications. The real league runs
     through the calendar year and is played here on the game's August to May
     calendar, as MLS is. No continental competition is modelled for it (the
     Copa Libertadores is not in the game), so it has no European places. And
     the real table splits clubs level on points by wins first, then goal
     difference, goals scored and head to head (the 2026 regulations as
     reported by O Imparcial, January 2026, and Flashscore's 2026 guide);
     TiebreakRule has no wins step, so it takes the gdGfOnly default. */
  brasileirao: {
    nationId: "brazil",
    flag: "Brazil",
    cup: "Copa do Brasil",
    europe: null,
    drop: 4,
    ladder: "top",
    season: "calendarYear",
    simplified: "Played on the August to May calendar rather than January to December, with no Copa Libertadores, and clubs level on points split by goal difference then goals scored, where the real table reads wins first."
  },
  /* Round 883: Liga MX 2026-27, the first real league with no domestic cup
     (cup null, the shape Round 832 proved on a synthetic row). Each fact
     from two sources, read 2026-10-02:
     - No promotion or relegation from 2026-27 on (article 35 of the new
       competition regulations): Infobae, "Oficial: desaparece el descenso y
       ascenso en la Liga MX a partir del Apertura 2026" (2026-07-16), and
       Record, "Oficial: no habra ascenso y descenso en la Liga MX"
       (2026-07-16). So drop 0 and the MLS ladder: no board threatens it.
     - No domestic cup: the Copa MX was last played in November 2020 and its
       return was only ever promised (Record, 2025-10-17, the federation
       president saying it would come back "for 2025 or 2026"); the 2026-27
       calendar guides list the Leagues Cup and the Liguilla and no cup
       (Excelsior, "Guia de calendario de la Liga MX Apertura 2026"; TUDN,
       "Revela la Liga MX el calendario del Apertura 2026"). The Leagues Cup
       is a cross border competition with MLS and is not used as a cup.
     - The top eight of the table go straight to the Liguilla quarter finals,
       the play-in gone (TUDN as above; Mediotiempo, "Liga MX elimina el
       Play-In definitivamente", 2026-04-23): the board's playoff rung.
     Simplified: the Apertura and Clausura are played as one double round
     robin of 34 rounds and the Liguilla is not played, so the table settles
     the season. Level clubs split by goal difference then goals scored,
     which are the real first two steps (Fox Sports Mexico, 2026-04-22, then
     head to head and away goals); only that one source spelled the order
     out, so the row takes the gdGfOnly default rather than claiming the
     head to head step. */
  ligamx: {
    nationId: "mexico",
    flag: "Mexico",
    cup: null,
    europe: null,
    drop: 0,
    ladder: "playoffs",
    playoff: { rankUpTo: 10, target: 8, label: "Make the Liguilla" },
    floorFromBottom: 4,
    season: "autumnSpring",
    simplified: "The Apertura and Clausura are played as one double round robin and the Liguilla is not played, so the table settles the season. There is no domestic cup (the Copa MX has not been played since 2020), and clubs level on points split by goal difference then goals scored, the real table's first two steps."
  },
  /* Round 1035: the A-League Men 2026-27. Each fact read 2026-10-06:
     - 12 clubs, no promotion or relegation (drop 0, the playoffs ladder).
       The clubs are _membership.json's twelve. No relegation: ESPN
       (https://www.espn.com.au/football/story/_/id/43800726/everything-need-know-australian-championship,
       12 February 2025: the Australian Championship and the A-League are
       separate competitions "with no promotion and relegation between the
       two") and The Roar
       (https://www.theroar.com.au/2025/02/17/the-australian-championship-is-not-really-a-second-division-but-its-a-decent-start/,
       17 February 2025), both read 2026-10-06.
     - 26 games a club, the full home and away 22 plus four third meetings,
       over 28 matchweeks from Friday 16 October 2026, Grand Final on the
       weekend of 3 to 6 June 2027: the league's own fixture release
       (https://aleagues.com.au/news/aleague-men-2026-2027-fixture-list-revealed-key-dates-fixture-information/,
       16 July 2026) and Football360 the same day
       (https://football360.com.au/a-league-men-fixtures-released-key-dates-matches-will-they-play-through-asian-cup/).
       The engine plays the double round robin, 22 rounds.
     - The top six make the finals series (first and second straight to the
       semi finals, third to sixth in the elimination finals): the league's
       2026 finals page (https://aleagues.com.au/isuzu-ute-a-league-men-finals-series-2026/)
       and Football360's elimination finals preview
       (https://football360.com.au/a-league-elimination-finals-preview-auckland-fc-melbourne-city-melbourne-victory-sydney-fc-kisnorbo-reunion/).
       THIN for 2026-27: those two describe the 2025-26 season; neither
       fixture release above restates the cut, and only an encyclopedia's
       2026-27 page (a spot check) says the top six again. So the copy (this
       row's simplified, the guide, What's New) states it only as last
       season's format, which is two sourced. The cut is the board's rung
       only, since the finals are not played here.
     - The Australia Cup is for Australian clubs only from the 2026 edition,
       so Auckland FC and Wellington Phoenix do not enter it: Football
       Australia (https://footballaustralia.com.au/news/football-australia-announces-refined-competitions-structure-2026,
       28 January 2026, "Auckland FC and Wellington Phoenix FC no longer
       participating"), Football360
       (https://football360.com.au/australia-cup-wellington-auckland-new-zealand-teams-omitted/,
       27 January 2026) and RNZ (https://www.rnz.co.nz/news/sport/585350, 29
       January 2026). The ten Australian clubs enter at the round of 32.
       The same three call the two New Zealand clubs, so clubCountry gives
       them New Zealand and their board's home players ask reads it.
     - No continental row: the Asian places explained in print
       (https://football360.com.au/a-league-afc-champions-league-elite-acl-two-explained-who-has-qualified/,
       26 April 2026) are the 2025-26 table's, nothing yet says what the
       2026-27 table hands out, and the two New Zealand clubs are not
       eligible for Asian competition at all.
     - Clubs level on points: no order verified, so the gdGfOnly default. */
  aleague: {
    nationId: "australia",
    flag: "Australia",
    cup: "Australia Cup",
    cupExcluded: ["Auckland FC", "Wellington Phoenix"],
    clubCountry: { "Auckland FC": "New Zealand", "Wellington Phoenix": "New Zealand" },
    europe: null,
    drop: 0,
    ladder: "playoffs",
    playoff: { rankUpTo: 7, target: 6, label: "Make the finals" },
    floorFromBottom: 3,
    season: "autumnSpring",
    simplified: "The real season is 26 games (home and away plus four third meetings), and last season's finals series took the top six; here it is a double round robin of 22 and the finals are not played, so the table settles the season and its winner is the Premiers. Auckland FC and Wellington Phoenix play no cup, as they really do not enter the Australia Cup."
  },
  /* Round 1040: Serie B 2026-27, Serie A's modelled second tier, so the
     bottom three of Serie A go down and the top three of Serie B come up.
     Each fact read 2026-10-06:
     - 20 clubs: ESPN's 2026-27 table
       (https://www.espn.com/soccer/standings/_/league/ita.2) and Sky Sport
       Italia, "Serie B 2026-27, le squadre del prossimo campionato"
       (https://sport.sky.it/calcio/serie-b/squadre-serie-b-2026-2027,
       2026-06-07), which agree on all twenty.
     - The format, as both describe the 2025-26 season: first and second go
       straight up, third to eighth play the promotion playoff, the last three
       go straight down and sixteenth plays seventeenth in a playout (Sky
       Sport, https://sport.sky.it/calcio/serie-b/serie-b-2026-playoff-playout-promozioni-retrocessioni,
       2026-05-29; Sbircia la Notizia,
       https://www.sbircialanotizia.it/articoli/2026/05/08/serie-b-playoff-a9x3m/,
       2026-05-08). THIN for 2026-27: the season's calendar release
       (InfoOggi, 2026-07-10) says it again ends in playoffs and playouts but
       restates no places, so the rung is last season's.
     - All twenty play the Coppa Italia (44 clubs: Serie A's 20, Serie B's 20
       and four from Serie C): Sky Sport's 2026-27 bracket
       (https://sport.sky.it/calcio/coppa-italia/2026/06/24/tabellone-coppa-italia-2026-2027)
       and Sport Mediaset's round of 32 draw.
     - Clubs level on points: only one source spelled an order, so the
       gdGfOnly default. */
  serieb: {
    nationId: "italy",
    flag: "Italy",
    cup: "Coppa Italia",
    europe: null,
    drop: 3,
    ladder: "promotion",
    playoff: { rankUpTo: 10, target: 8, label: "Make the promotion playoffs" },
    season: "autumnSpring",
    simplified: "The promotion playoff and the relegation playout are not played: three go straight up and Serie A's bottom three come down in a straight swap."
  },
  /* Round 1040: Ligue 2 2026-27, Ligue 1's modelled second tier, so the
     bottom two of Ligue 1 go down and the top two of Ligue 2 come up. Each
     fact read 2026-10-06:
     - 18 clubs: ESPN's 2026-27 table
       (https://www.espn.com/soccer/standings/_/league/fra.2) and
       Saint-Étienne's own Ligue 2 BKT table, matchday 7
       (https://www.asse.fr/fr/club/saison-2026-2027/classement-ligue-2-bkt/),
       which agree on all eighteen.
     - First and second go straight up: Troyes and Le Mans in 2025-26 (LFP,
       https://ligue1.com/en/articles/l1_article_5560-promoted-pair-troyes-and-le-mans-prepare-for-the-ligue-1-challenge;
       Eurosport France on Troyes' direct promotion,
       https://www.eurosport.fr/football/ligue-2/2025-2026/ligue-2-vainqueur-de-saint-etienne-3-0-troyes-sassure-de-la-promotion-directe-en-ligue-1_sto23293849/story.shtml).
     - Third to fifth play the playoffs, whose winner meets Ligue 1's
       sixteenth in the barrage, and sixteenth plays the National's third:
       the LFP's 2025-26 guide (ligue1.com, the article beside the ligue1 row)
       and Foot Mercato's 2026-27 table legend
       (https://www.footmercato.net/france/ligue-2/classement).
     - Seventeenth and eighteenth go straight down (the drop of 2). The LFP
       guide above says nothing about direct relegation (Round 1040 review),
       so the two sources are Foot Mercato's 2026-27 legend above and Sports
       Infos on the final 2025-26 table, Bastia 17th and Amiens 18th both
       relegated to the National (2026-05-09,
       https://www.ski-nordique.net/classement-ligue-2-2025-2026-journee-28-sports-infos.6725171-72348.html,
       read 2026-10-07). THIN for 2026-27 in the same way as the ligue1 row:
       Foot Mercato is the one 2026-27 publisher, the other describes 2025-26.
     - Ligue 2 clubs play the Coupe de France, entering in the seventh round
       (14 and 15 November 2026), Ligue 1's at the round of 64: Metro Sports
       (https://metro-sports.fr/le-calendrier-de-ledition-2026-2027-de-la-coupe-de-france-devoile/)
       and Radio Sports (https://radiosports.fr/coupe-de-france-football-calendrier-et-resultats.html).
     - Clubs level on points: not two-sourced, so the gdGfOnly default. */
  ligue2: {
    nationId: "france",
    flag: "France",
    cup: "Coupe de France",
    europe: null,
    drop: 2,
    ladder: "promotion",
    playoff: { rankUpTo: 7, target: 5, label: "Make the promotion playoffs" },
    season: "autumnSpring",
    simplified: "The promotion playoffs, the barrage against Ligue 1's sixteenth and the relegation barrage are not played: two go straight up and Ligue 1's bottom two come down in a straight swap."
  },
  /* Round 1040: the Segunda División 2026-27 (LALIGA HYPERMOTION), La Liga's
     modelled second tier, so La Liga's bottom three go down and the
     Segunda's top three come up. Each fact read 2026-10-06:
     - 22 clubs, two of them reserve sides (Real Sociedad B and Celta
       Fortuna): ESPN's 2026-27 table
       (https://www.espn.com/soccer/standings/_/league/esp.2) and LaLiga's own
       (https://www.laliga.com/en-GB/laliga-hypermotion/standing), which agree
       on all twenty two. The game plays the other twenty.
     - First and second go straight up and third to sixth play the promotion
       playoff: LaLiga, "Quiénes juegan el play-off de ascenso" (2026-06-21,
       https://www.laliga.com/noticias/quienes-juegan-el-play-off-de-ascenso)
       and elDiario.es on the format (2025-08-13,
       https://www.eldiario.es/spin/deportes/calendario-laliga-hypermotion-2025-26-partidos-formato-ver-segunda-division-futbol-pm_1_12531612.html).
     - Four go down: LaLiga (https://www.laliga.com/noticias/descensos-de-segunda-division)
       and Sportpunta (2026-06-01, four since 1995-96,
       https://www.sportpunta.com/noticia/10398/fuera-de-juego/cuatro-equipos-descienden-de-laliga-hypermotion-a-primera-rfef.html).
     - The 2026-27 Copa del Rey's first round has twenty Segunda clubs, the
       two reserve sides left out: Infobae (EFE, 2026-10-04,
       https://www.infobae.com/espana/agencias/2026/10/04/16-equipos-de-primera-iniciaran-su-andadura-en-la-primera-eliminatoria-de-la-copa-del-rey/)
       and ElDesmarque's draw (2026-10-05,
       https://www.eldesmarque.com/futbol/copa-del-rey/20261005/directo-sorteo-primera-ronda-copa-rey-2027_19_020349979.html),
       FC Andorra among them. Whether a reserve side may be promoted was found
       in one source only, so the row does not lean on it.
     - Clubs level on points: not two-sourced, so the gdGfOnly default. */
  segunda: {
    nationId: "spain",
    flag: "Spain",
    cup: "Copa del Rey",
    europe: null,
    drop: 4,
    ladder: "promotion",
    playoff: { rankUpTo: 8, target: 6, label: "Make the promotion playoffs" },
    season: "autumnSpring",
    simplified: "The promotion playoff (third to sixth) is not played: three go straight up and La Liga's bottom three come down in a straight swap. The real league has 22 clubs, and its two reserve sides, Real Sociedad B and Celta Fortuna, are left out because they do not play the Copa del Rey, so 20 of the real 22 clubs play."
  },
  /* Round 1052: the Russian Premier League 2026-27, the Brazil shape (a drop
     count with no second tier in the game, so the drop zone is what the board
     asks and what the record reads, and no club is traded; no European
     places). Every fact below is on two publishers or more, read 2026-10-08,
     and copied from scripts/data/gatheredSquads/russia2026/research.json
     (its `facts`), which also holds the squads:
     - ru-format, sixteen clubs, thirty rounds, home and away: Sports.ru's
       season guide (2026-07-16, https://www.sports.ru/football/blogs/3421868.html)
       and Sport-Express's list of the participants (2026-07-23,
       https://www.sport-express.ru/football/rfpl/news/rpl-sezon-2026-27-polnyy-spisok-uchastnikov-chempionata-rossii-2441637/).
     - ru-drop, fifteenth and sixteenth go straight down, thirteenth and
       fourteenth play the First League's fourth and third over two legs:
       Sports.ru's season guide (above) and Cybersport.ru's 2026-2027 page
       (https://www.cybersport.ru/tournaments/football/rpl-2026-2027-rossiiskaia-premer-liga);
       Sport-Express (above) for the same rule as it was applied in May 2026.
       drop is 2, the automatic places only: the game has no second tier to
       play a playoff against, and a drop of 4 would send down two clubs the
       real rules only send to a playoff.
     - ru-uefa, Russian clubs are suspended from UEFA's club competitions in
       2026-27: Euronews (2026-06-07,
       https://www.euronews.com/my-europe/2026/06/07/uefa-extends-ban-on-russian-national-teams-and-clubs-from-competitions-for-202627-season)
       and Ukrainska Pravda (2026-06-07,
       https://www.pravda.com.ua/eng/news/2026/06/07/8038150/). So europe is
       null. A fact only: the game says nothing else about it.
     - ru-cup, the Russian Cup is played and the Premier League clubs enter
       it through four groups of four, the top two into the playoffs and the
       third into the lower divisions' knockout path: Sovetsky Sport
       (2026-06-19, https://www.sovsport.ru/football/news/sostoyalas-zherebyovka-puti-rpl-kubka-rossii-sezona-2026-2027)
       and Rossiyskaya Gazeta (2026-07-28, https://rg.ru/2026/07/29/sto-k-odnomu.html).
     - ru-tiebreak, clubs level on points are split by head to head first,
       then by wins: Sports.ru's season guide and Cybersport.ru's 2026-2027
       page (both above, both read again 2026-10-08); the steps after
       those two (goal difference, then goals scored) are on Sports.ru
       alone. The row still takes the gdGfOnly default, for two reasons
       written down so nobody takes it for an oversight: TiebreakRule has
       no wins step (the Brazil row's reason), and a head to head rule
       makes notePair keep a ledger of every Russian league result in
       every save, about 240 pairs a season, which the save size budget
       has no room for today. `simplified` says what the game does. */
  russia: {
    nationId: "russia",
    flag: "Russia",
    cup: "Russian Cup",
    europe: null,
    drop: 2,
    ladder: "top",
    season: "autumnSpring",
    simplified: "The relegation playoffs (thirteenth and fourteenth against the fourth and third of the division below) are not played: finishing in the bottom two is the relegation, and since the division below is not in the game the league keeps its sixteen clubs. Russian clubs are suspended from UEFA competitions, so the table hands out no European places. The Russian Cup, which really starts with groups for the top flight, is played as a straight knockout. Clubs level on points split by goal difference then goals scored, where the real table reads head to head first."
  },
  /* The era leagues. No Conference League existed before 2021, so uecl is 0
     and the board's ladder skips that band; 2005-06 still called the second
     competition the UEFA Cup. */
  premier2010: { nationId: "england", flag: "England", cup: "FA Cup", europe: { ucl: 4, uel: 5, uecl: 0 }, drop: 3, tiebreak: "gdGf", ladder: "top", season: "autumnSpring" },
  laliga2010: { nationId: "spain", flag: "Spain", cup: "Copa del Rey", europe: { ucl: 4, uel: 6, uecl: 0 }, drop: 3, tiebreak: "h2h", ladder: "top", season: "autumnSpring" },
  /* Round 901: the 2010-11 Serie A, Bundesliga and Ligue 1, each fact from
     two sources read 2026-10-03.
     - Europe. ESPN's final standings carry the legend (Serie A: first to
       third Champions League, fourth its qualifying, fifth, sixth and eighth
       Europa League; Bundesliga: first and second Champions League, third its
       qualifying, fourth, fifth and fourteenth Europa League; Ligue 1: first
       and second Champions League, third its qualifying, fourth to sixth
       Europa League), https://www.espn.com/soccer/standings/_/league/ITA.1/season/2010
       and .../GER.1/season/2010 and .../FRA.1/season/2010, and RSSSF's
       2011-12 European cups record shows who entered where (Udinese in the
       Champions League qualifying, lost to Arsenal; Bayern and Lyon through
       qualifying; Lazio, Roma and Palermo, Hannover, Mainz and Schalke, PSG,
       Sochaux and Rennes in the Europa League),
       https://www.rsssf.org/ec/ec201112.html. Italy still had four Champions
       League places that season (three from the next). A qualifying route
       counts as in, as everywhere in this table. The places a CUP handed down
       are not counted, the way premier2015 counts fifth only: Palermo went in
       eighth as the Coppa Italia runners up because Inter, who beat them in
       the final (RSSSF), were already in the Champions League; Schalke went in
       fourteenth as DFB-Pokal winners (5-0 against Duisburg, RSSSF); and
       France's fifth and sixth took the two cup places because Lille won the
       Coupe de France and Marseille the Coupe de la Ligue (RSSSF), both in the
       Champions League.
     - Relegation. Italy: three down (Sampdoria, Brescia, Bari), RSSSF
       https://www.rsssf.org/tablesi/ital2011.html and ESPN's legend. Germany:
       seventeenth and eighteenth down, sixteenth into a playoff against the
       second tier's third (Gladbach beat Bochum), RSSSF
       https://www.rsssf.org/tablesd/duit2011.html; the playoff is not played,
       exactly as on the modern bundesliga row. France: three down (Monaco,
       Lens, Arles-Avignon), RSSSF https://www.rsssf.org/tablesf/fran2011.html
       and ESPN's legend.
     - The cups, one per nation: the Coppa Italia, the DFB-Pokal and the Coupe
       de France. The Coupe de la Ligue is not modelled.
     - Level on points. Serie A split level clubs on head to head first in
       2010-11, the order it brought back in 2005-06 and still used in
       2011-12 (90min, "I criteri per stabilire la classifica in caso di parita
       nella storia della Serie A"), the same h2h rule the seriea2015 and
       modern rows carry; that season's own table cannot tell the two orders
       apart (Udinese above Lazio on 66, and Chievo, Parma and Catania on 46,
       fall the same way on goal difference). The Bundesliga and Ligue 1
       tables split level clubs on goal difference (Freiburg above Koln on 44;
       Auxerre, Saint-Etienne and Lorient on 49); no later step was found in
       two sources FOR THAT SEASON, so neither row claims one: no tiebreak
       field, which reads goal difference then goals scored. */
  seriea2010: { nationId: "italy", flag: "Italy", cup: "Coppa Italia", europe: { ucl: 4, uel: 6, uecl: 0 }, drop: 3, tiebreak: "h2h", ladder: "top", season: "autumnSpring" },
  bundesliga2010: {
    nationId: "germany",
    flag: "Germany",
    cup: "DFB-Pokal",
    europe: { ucl: 3, uel: 5, uecl: 0 },
    drop: 2,
    ladder: "top",
    season: "autumnSpring",
    simplified: "The real relegation playoff (sixteenth against the 2. Bundesliga's third) is not played: two go straight down."
  },
  ligue12010: { nationId: "france", flag: "France", cup: "Coupe de France", europe: { ucl: 3, uel: 4, uecl: 0 }, drop: 3, ladder: "top", season: "autumnSpring" },
  premier2015: { clubCountry: { "Swansea City": "Wales" }, nationId: "england", flag: "England", cup: "FA Cup", europe: { ucl: 4, uel: 5, uecl: 0 }, drop: 3, tiebreak: "gdGf", ladder: "top", season: "autumnSpring" },
  laliga2015: { nationId: "spain", flag: "Spain", cup: "Copa del Rey", europe: { ucl: 4, uel: 6, uecl: 0 }, drop: 3, tiebreak: "h2h", ladder: "top", season: "autumnSpring" },
  seriea2015: { nationId: "italy", flag: "Italy", cup: "Coppa Italia", europe: { ucl: 3, uel: 5, uecl: 0 }, drop: 3, tiebreak: "h2h", ladder: "top", season: "autumnSpring" },
  /* Round 899: the 2015-16 Bundesliga and Ligue 1, each fact from two
     sources read 2026-10-02.
     - Europe. ESPN's final standings carry the legend (Bundesliga: first to
       third Champions League, fourth its qualifying, fifth and sixth Europa
       League, seventh its qualifying; Ligue 1: first and second Champions
       League, third its qualifying, fourth Europa League, fifth and sixth
       its qualifying), https://www.espn.com/soccer/standings/_/league/GER.1/season/2015
       and .../league/FRA.1/season/2015, and RSSSF's 2016-17 European cups
       record shows who entered where (four German clubs in the Champions
       League group stage, Gladbach through the play-off; Hertha in the
       Europa League third qualifying round; Monaco through qualifying),
       https://www.rsssf.org/ec/ec201617.html. A qualifying route counts as
       in, as everywhere in this table. The places a CUP handed down are not
       league places and are not counted, the way premier2015 counts fifth
       only: Germany's seventh got in because the cup winners Bayern were
       already in the Champions League, and France's fifth and sixth took
       the two cup places because PSG won both cups.
     - Relegation. Germany: seventeenth and eighteenth down, sixteenth into
       a playoff against the second tier's third (Frankfurt won it); RSSSF,
       https://www.rsssf.org/tablesd/duit2016.html, and ESPN's legend. The
       playoff is not played, exactly as on the modern bundesliga row. France:
       THREE down in 2015-16 (Reims, GFC Ajaccio, Troyes), RSSSF,
       https://www.rsssf.org/tablesf/fran2016.html, and ESPN's legend
       (positions 18, 19, 20); the league's vote to cut it to two that
       season did not stand.
     - The cups, one per nation: the DFB-Pokal (Bayern beat Dortmund on
       penalties, RSSSF and ESPN's match report) and the Coupe de France (PSG
       4-2 Marseille, RSSSF and Sky Sports). The Coupe de la Ligue, which
       France also played that year, is not modelled.
     - Level on points. Both final tables split level clubs on goal
       difference and then goals scored (Bremen above Darmstadt, both minus
       fifteen; Lyon above Monaco). The step after that was not found in two
       sources FOR THAT SEASON (the DFL's rule book and the league's own
       article are later editions), so neither row claims a third step: no
       tiebreak field, which reads goal difference then goals scored. */
  bundesliga2015: {
    nationId: "germany",
    flag: "Germany",
    cup: "DFB-Pokal",
    europe: { ucl: 4, uel: 6, uecl: 0 },
    drop: 2,
    ladder: "top",
    season: "autumnSpring",
    simplified: "The real relegation playoff (sixteenth against the 2. Bundesliga's third) is not played: two go straight down."
  },
  ligue12015: { nationId: "france", flag: "France", cup: "Coupe de France", europe: { ucl: 3, uel: 4, uecl: 0 }, drop: 3, ladder: "top", season: "autumnSpring" },
  premier2005: { nationId: "england", flag: "England", cup: "FA Cup", europe: { ucl: 4, uel: 5, uecl: 0, uelName: "UEFA Cup" }, drop: 3, tiebreak: "gdGf", ladder: "top", season: "autumnSpring" },
  laliga2005: { nationId: "spain", flag: "Spain", cup: "Copa del Rey", europe: { ucl: 4, uel: 6, uecl: 0, uelName: "UEFA Cup" }, drop: 3, tiebreak: "h2h", ladder: "top", season: "autumnSpring" },
  /* Round 902: the 2005-06 Serie A, Bundesliga and Ligue 1, each fact from
     two sources read 2026-10-03: RSSSF's season records
     (https://www.rsssf.org/tablesi/ital06.html, .../tablesd/duit06.html,
     .../tablesf/fran06.html) and ESPN's final standings with their legend
     (https://www.espn.com/soccer/standings/_/league/ITA.1/season/2005, and
     .../GER.1/season/2005 and .../FRA.1/season/2005).
     - Europe. A qualifying route counts as in, and the places a CUP handed
       down are not league places, the way premier2005 counts fifth only.
       Italy: first and second into the Champions League, third and fourth
       its qualifying, fifth and sixth the UEFA Cup; the seventh place ESPN
       lists was the Coppa Italia's, handed down because Inter, the cup
       winners (RSSSF, https://www.rsssf.org/tablesi/italcup06.html), were
       already in the Champions League. Germany: first and
       second in, third qualifying, fourth and fifth the UEFA Cup (fourteenth
       Frankfurt went in as the beaten DFB-Pokal finalists). France: first
       and second in, third qualifying, fourth the UEFA Cup (ninth PSG and
       twelfth Nancy went in as the winners of the two cups).
     - Relegation. Three down in all three. Germany played no relegation
       playoff that season (RSSSF), so the row needs no simplification.
       Italy's table was rewritten after the season by the Calciopoli
       sentences; the game plays its own season, and the row carries only
       the number that sent clubs down, three, as both sources show.
     - The cups, one per nation: the Coppa Italia, the DFB-Pokal (Bayern
       1-0 Frankfurt, RSSSF) and the Coupe de France (PSG 2-1 Marseille,
       RSSSF). France's Coupe de la Ligue is not modelled.
     - Level on points. No row claims a rule that was not found in two
       sources for that season: the Bundesliga and Ligue 1 tables split
       level clubs on goal difference and then goals scored (Mainz above
       Hannover, PSG above Monaco on goals), and Serie A's switch from
       playoffs to head to head is dated by neither source, so all three
       take the default, goal difference then goals scored. */
  seriea2005: { nationId: "italy", flag: "Italy", cup: "Coppa Italia", europe: { ucl: 4, uel: 6, uecl: 0, uelName: "UEFA Cup" }, drop: 3, ladder: "top", season: "autumnSpring" },
  bundesliga2005: { nationId: "germany", flag: "Germany", cup: "DFB-Pokal", europe: { ucl: 3, uel: 5, uecl: 0, uelName: "UEFA Cup" }, drop: 3, ladder: "top", season: "autumnSpring" },
  ligue12005: { nationId: "france", flag: "France", cup: "Coupe de France", europe: { ucl: 3, uel: 4, uecl: 0, uelName: "UEFA Cup" }, drop: 3, ladder: "top", season: "autumnSpring" },
  /* Round 971: the 2020-21 big five, each fact from two sources read
     2026-10-03: RSSSF's season records (https://www.rsssf.org/tablese/eng2021.html,
     tabless/span2021.html, tablesi/ital2021.html, tablesd/duit2021.html,
     tablesf/fran2021.html) and ESPN's final standings with their legends
     (https://www.espn.com/soccer/standings/_/league/ENG.1/season/2020 and
     ESP.1, ITA.1, GER.1, FRA.1 for the same season), with RSSSF's 2021-22
     European cups record (https://www.rsssf.org/ec/ec202122.html) for who
     entered where.
     - Europe, counted the way the 2015-16 rows count it: league places only,
       a qualifying route counted as in, and a place a CUP handed down not
       counted. England, Spain, Italy and Germany sent four to the Champions
       League and their fifth to the Europa League; the sixth that also went
       (West Ham, Real Betis, Lazio, Leverkusen) took the place of a cup
       winner already qualified by the league (Leicester won the FA Cup and
       finished fifth; Barcelona, Juventus and Dortmund won their cups and
       finished in the top four; RSSSF's season records name each final).
       France sent its first two straight in and
       its third (Monaco) through qualifying, its fourth (Lyon) to the Europa
       League, and its fifth (Marseille) on PSG's Coupe de France place.
     - The Conference League began in 2021-22, the season these tables fed,
       and four leagues' next place went there (Tottenham, Roma, Union
       Berlin, Rennes). Spain's went unused: Villarreal, seventh, won the
       Europa League and took a Champions League place instead (RSSSF's
       ec202122 lists no Spanish club in the Conference League;
       footballtransfers.com, May 2021, has Villarreal as Spain's fifth
       Champions League side; read 2026-10-05). The era's Europe draws
       Champions League fields only, so uecl stays 0, as on every era row,
       and the line below says so on the four rows that really earned one.
     - Relegation: three down in England, Spain and Italy. Germany sent two
       down and its sixteenth (Köln) into a playoff it won; France sent two
       down and its eighteenth (Nantes) into a playoff that finished 2-2 on
       aggregate, Nantes staying up on away goals (RSSSF's fran2021: Toulouse
       1-2 Nantes, Nantes 0-1 Toulouse; France 3 Pays de la Loire, 30 May
       2021, read 2026-10-05). Neither playoff is played, as on the modern rows.
     - The cups: the FA Cup (Leicester), the Copa del Rey (Barcelona), the
       Coppa Italia (Juventus), the DFB-Pokal (Dortmund) and the Coupe de
       France (PSG), each named in RSSSF's record.
     - Level on points: La Liga and Serie A split on head to head (RSSSF
       prints the head to head records; Granada sit above Athletic Club on
       46 points with the worse goal difference in both tables); England
       reads goal difference then goals scored, as its 2015-16 row does; the
       Bundesliga and Ligue 1 tables order their level clubs by goal
       difference (Stuttgart above Freiburg, Reims above Strasbourg above
       Lorient) and no later step was two sourced for that season, so those
       rows claim none. */
  premier2020: {
    nationId: "england",
    flag: "England",
    cup: "FA Cup",
    europe: { ucl: 4, uel: 5, uecl: 0 },
    drop: 3,
    tiebreak: "gdGf",
    ladder: "top",
    season: "autumnSpring",
    lateStart: { kickoff: { y: 2020, m: 9, d: 12 }, summerClose: SUMMER_2020_CLOSE },
    simplified: CONFERENCE_LEAGUE_UNPLAYED
  },
  laliga2020: {
    nationId: "spain",
    flag: "Spain",
    cup: "Copa del Rey",
    europe: { ucl: 4, uel: 5, uecl: 0 },
    drop: 3,
    tiebreak: "h2h",
    ladder: "top",
    season: "autumnSpring",
    lateStart: { kickoff: { y: 2020, m: 9, d: 12 }, summerClose: SUMMER_2020_CLOSE }
  },
  seriea2020: {
    nationId: "italy",
    flag: "Italy",
    cup: "Coppa Italia",
    europe: { ucl: 4, uel: 5, uecl: 0 },
    drop: 3,
    tiebreak: "h2h",
    ladder: "top",
    season: "autumnSpring",
    lateStart: { kickoff: { y: 2020, m: 9, d: 19 }, summerClose: SUMMER_2020_CLOSE },
    simplified: CONFERENCE_LEAGUE_UNPLAYED
  },
  bundesliga2020: {
    nationId: "germany",
    flag: "Germany",
    cup: "DFB-Pokal",
    europe: { ucl: 4, uel: 5, uecl: 0 },
    drop: 2,
    ladder: "top",
    season: "autumnSpring",
    lateStart: { kickoff: { y: 2020, m: 9, d: 19 }, summerClose: SUMMER_2020_CLOSE },
    simplified: `The real relegation playoff (sixteenth against the 2. Bundesliga's third) is not played: two go straight down. ${CONFERENCE_LEAGUE_UNPLAYED}`
  },
  ligue12020: {
    nationId: "france",
    flag: "France",
    cup: "Coupe de France",
    europe: { ucl: 3, uel: 4, uecl: 0 },
    drop: 2,
    ladder: "top",
    season: "autumnSpring",
    lateStart: { kickoff: { y: 2020, m: 8, d: 22 }, summerClose: SUMMER_2020_CLOSE },
    simplified: `The real relegation playoff (eighteenth against Ligue 2's third) is not played: two go straight down. ${CONFERENCE_LEAGUE_UNPLAYED}`
  }
};
var UNKNOWN_LEAGUE_RULES = { nationId: "", flag: "", cup: null, europe: null, drop: 3, ladder: "top", season: "autumnSpring" };
function leagueRulesOf(leagueId) {
  return Object.prototype.hasOwnProperty.call(LEAGUE_RULES, leagueId) ? LEAGUE_RULES[leagueId] : UNKNOWN_LEAGUE_RULES;
}
function leagueFromRow(row) {
  const rules = leagueRulesOf(row.id);
  return { id: row.id, name: row.name, cupName: rules.cup, euro: rules.europe !== null, clubs: row.clubs };
}
var REAL_LEAGUES = [
  {
    id: "premier",
    name: "Premier League",
    // 2026-27: Coventry, Ipswich and Hull came up; Wolves, Burnley and West Ham went down.
    clubs: ["Arsenal", "Aston Villa", "Bournemouth", "Brentford", "Brighton", "Chelsea", "Coventry City", "Crystal Palace", "Everton", "Fulham", "Hull City", "Ipswich Town", "Leeds United", "Liverpool", "Manchester City", "Manchester United", "Newcastle", "Nottingham Forest", "Sunderland", "Tottenham"]
  },
  {
    id: "championship",
    name: "EFL Championship",
    // 2026-27 lineup per the fixture release: the three relegated Premier
    // League sides plus Cardiff, Bolton and Lincoln up from League One.
    clubs: ["Birmingham City", "Blackburn Rovers", "Bolton Wanderers", "Bristol City", "Burnley", "Cardiff City", "Charlton Athletic", "Derby County", "Lincoln City", "Middlesbrough", "Millwall", "Norwich City", "Portsmouth", "Preston North End", "QPR", "Sheffield United", "Southampton", "Stoke City", "Swansea City", "Watford", "West Brom", "West Ham", "Wolves", "Wrexham"]
  },
  {
    id: "laliga",
    name: "La Liga",
    // 2026-27: Racing Santander, Deportivo and Málaga up; Oviedo, Girona and Mallorca down.
    clubs: ["Alav\xE9s", "Athletic Club", "Atl\xE9tico Madrid", "Barcelona", "Real Betis", "Celta Vigo", "Deportivo La Coru\xF1a", "Elche", "Espanyol", "Getafe", "Levante", "M\xE1laga", "Osasuna", "Racing Santander", "Rayo Vallecano", "Real Madrid", "Real Sociedad", "Sevilla", "Valencia", "Villarreal"]
  },
  {
    id: "seriea",
    name: "Serie A",
    // 2026-27: Venezia, Frosinone and Monza up; Cremonese, Verona and Pisa down.
    clubs: ["Atalanta", "Bologna", "Cagliari", "Como", "Fiorentina", "Frosinone", "Genoa", "Inter Milan", "Juventus", "Lazio", "Lecce", "AC Milan", "Monza", "Napoli", "Parma", "Roma", "Sassuolo", "Torino", "Udinese", "Venezia"]
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    // 2026-27: Schalke, Elversberg and Paderborn up; Heidenheim, St. Pauli and Wolfsburg down.
    clubs: ["Augsburg", "Bayer Leverkusen", "Bayern Munich", "Borussia Dortmund", "Gladbach", "Eintracht Frankfurt", "Freiburg", "Hamburg", "Hoffenheim", "K\xF6ln", "Mainz", "RB Leipzig", "Schalke 04", "Elversberg", "Paderborn", "Stuttgart", "Union Berlin", "Werder Bremen"]
  },
  {
    id: "ligue1",
    name: "Ligue 1",
    // 2026-27: Troyes and Le Mans up; Metz and Nantes down.
    clubs: ["Angers", "Auxerre", "Brest", "Le Havre", "Le Mans", "Lens", "Lille", "Lorient", "Lyon", "Marseille", "Monaco", "Nice", "Paris FC", "PSG", "Rennes", "Strasbourg", "Toulouse", "Troyes"]
  },
  {
    id: "eredivisie",
    name: "Eredivisie",
    // 2026-27: ADO Den Haag, Cambuur and Willem II up; Volendam, NAC and Heracles down.
    clubs: ["Ajax", "AZ Alkmaar", "ADO Den Haag", "Cambuur", "Excelsior", "Feyenoord", "Fortuna Sittard", "Go Ahead Eagles", "Groningen", "Heerenveen", "NEC Nijmegen", "PEC Zwolle", "PSV", "Sparta Rotterdam", "Telstar", "Twente", "Utrecht", "Willem II"]
  },
  {
    id: "saudi",
    name: "Saudi Pro League",
    // 2026-27: Abha, Al-Faisaly and Al-Diriyah up; Al-Najma, Al-Okhdood and Damac down.
    clubs: ["Abha", "Al-Ahli", "Al-Diriyah", "Al-Ettifaq", "Al-Faisaly", "Al-Fateh", "Al-Fayha", "Al-Hazem", "Al-Hilal", "Al-Ittihad", "Al-Khaleej", "Al-Kholood", "Al-Nassr", "Al-Qadsiah", "Al-Riyadh", "Al-Shabab", "Al-Taawoun", "NEOM SC"]
  },
  {
    id: "mlsEast",
    name: "MLS Eastern Conference",
    clubs: ["Atlanta United", "Charlotte FC", "Chicago Fire", "FC Cincinnati", "Columbus Crew", "D.C. United", "Inter Miami", "CF Montr\xE9al", "Nashville SC", "New England Revolution", "New York City FC", "New York Red Bulls", "Orlando City", "Philadelphia Union", "Toronto FC"]
  },
  {
    id: "mlsWest",
    name: "MLS Western Conference",
    clubs: ["Austin FC", "Colorado Rapids", "FC Dallas", "Houston Dynamo", "LA Galaxy", "LAFC", "Minnesota United", "Portland Timbers", "Real Salt Lake", "San Diego FC", "San Jose Earthquakes", "Seattle Sounders", "Sporting Kansas City", "St. Louis City", "Vancouver Whitecaps"]
  },
  /* Round 140, from the owner's review: "way way way more leagues... with
     correct data." Memberships verified 2026-08-16 against published season
     coverage: Primeira Liga (Marítimo and Académico de Viseu up, Tondela and
     AVS down, Casa Pia survived the playoff), Scottish Premiership
     (St Johnstone up, Livingston down, St Mirren survived the playoff) and
     the Süper Lig (Erzurumspor, Amedspor and Çorum FK up; Antalyaspor,
     Kayserispor and Fatih Karagümrük down). Rosters come from the same
     Transfermarkt-derived table as every other league; the smallest squads
     sit below that dataset's value floor and are marked in CM_PARTIAL, the
     same honesty rule the Championship has shipped with since Round 72. */
  {
    id: "primeira",
    name: "Primeira Liga",
    clubs: ["Porto", "Benfica", "Sporting CP", "Braga", "Vit\xF3ria Guimar\xE3es", "Famalic\xE3o", "Rio Ave", "Casa Pia", "Estoril", "Moreirense", "Arouca", "Gil Vicente", "Santa Clara", "Nacional", "Estrela Amadora", "Alverca", "Mar\xEDtimo", "Acad\xE9mico de Viseu"]
  },
  {
    id: "scottish",
    name: "Scottish Premiership",
    clubs: ["Celtic", "Rangers", "Aberdeen", "Hearts", "Hibernian", "Dundee United", "Dundee", "Motherwell", "St Mirren", "Kilmarnock", "Falkirk", "St Johnstone"]
  },
  {
    id: "superlig",
    name: "S\xFCper Lig",
    clubs: ["Galatasaray", "Fenerbah\xE7e", "Be\u015Fikta\u015F", "Trabzonspor", "Ba\u015Fak\u015Fehir", "Samsunspor", "Ey\xFCpspor", "G\xF6ztepe", "Kas\u0131mpa\u015Fa", "Alanyaspor", "Konyaspor", "Gaziantep FK", "Gen\xE7lerbirli\u011Fi", "Kocaelispor", "Rizespor", "Erzurumspor", "Amedspor", "\xC7orum FK"]
  },
  /* Round 142: the second division he asked for by name ("some second
     divisions too"). 2026-27 membership from the league's own published
     season preview: Wolfsburg, Heidenheim and St. Pauli down from the
     Bundesliga, Osnabrück and Energie Cottbus up from 3. Liga. */
  {
    id: "bundesliga2",
    name: "2. Bundesliga",
    clubs: ["Wolfsburg", "Heidenheim", "St. Pauli", "Bochum", "Hertha BSC", "Magdeburg", "Kaiserslautern", "Holstein Kiel", "Hannover 96", "Dynamo Dresden", "Braunschweig", "Greuther F\xFCrth", "N\xFCrnberg", "Darmstadt", "Arminia Bielefeld", "Karlsruhe", "Osnabr\xFCck", "Energie Cottbus"]
  },
  /* Round 143: Belgium's reformed top flight. 2026-27 is the expansion
     season: 18 clubs, straight round robin, no playoffs, which happens to be
     exactly the shape this engine plays. Beveren, Kortrijk and Lommel came
     up, Dender went down via the playoff Lommel won. */
  {
    id: "proleague",
    name: "Belgian Pro League",
    clubs: ["Club Brugge", "Union Saint-Gilloise", "Anderlecht", "Genk", "Gent", "Antwerp", "Standard Li\xE8ge", "Mechelen", "Charleroi", "Westerlo", "Sint-Truiden", "OH Leuven", "Cercle Brugge", "La Louvi\xE8re", "Zulte Waregem", "Beveren", "Kortrijk", "Lommel"]
  },
  /* Round 177: wave three, first pair. Memberships verified 2026-08-19
     against two agreeing sources each (worldfootball's live table plus
     Soccerway fixtures for Austria; Soccerway plus the season records for
     Greece: Iraklis and Kalamata up, AEL and Panserraikos down). Both play
     split-format seasons in real life; the engine plays them as straight
     double round robins, the same simplification the Belgian league shipped
     with. Salzburg and Olympiacos were already in the game as continental
     flavor clubs and simply gained their home leagues. The thin tails are
     marked in CM_PARTIAL per the standing honesty rule, and five verified
     members with no dataset rows at all (Lustenau, Iraklis, Kalamata,
     Kifisia, Volos) ship as fully youth-padded squads that say so. */
  {
    id: "austria",
    name: "Austrian Bundesliga",
    clubs: ["RB Salzburg", "Sturm Graz", "Rapid Wien", "LASK", "Wolfsberger AC", "Austria Wien", "Grazer AK", "Hartberg", "Ried", "Altach", "WSG Tirol", "Austria Lustenau"]
  },
  {
    id: "greece",
    name: "Super League Greece",
    clubs: ["Olympiacos", "Panathinaikos", "AEK Athens", "PAOK", "Aris", "Asteras Tripolis", "Atromitos", "Iraklis", "Kalamata", "Kifisia", "Levadiakos", "OFI", "Panetolikos", "Volos"]
  },
  /* Round 185: wave three, second pair. Memberships verified 2026-08-19
     against two agreeing sources each (the Wikipedia season page plus
     worldfootball's live table for Denmark: Lyngby and AC Horsens up,
     Fredericia and Vejle down, AGF the reigning champions; the Wikipedia
     season page plus Swiss press coverage for Switzerland: Vaduz up after
     five years, Winterthur down, Thun the reigning champions). Both play
     split-format seasons in real life; the engine plays them as straight
     round robins, the same simplification Austria and Greece shipped with.
     Vaduz are the Swiss league's Liechtenstein guests exactly as in real
     life; the engine treats them as a league member like any other, and
     does not model their real-world cup-only European route. Two verified
     members with zero usable dataset rows (AC Horsens, SønderjyskE) ship
     as fully youth-padded squads that say so. */
  {
    id: "denmark",
    name: "Danish Superliga",
    clubs: ["FC Copenhagen", "FC Midtjylland", "Br\xF8ndby IF", "AGF", "FC Nordsj\xE6lland", "Viborg FF", "Randers FC", "OB", "Silkeborg IF", "Lyngby", "AC Horsens", "S\xF8nderjyskE"]
  },
  {
    id: "switzerland",
    name: "Swiss Super League",
    clubs: ["Basel", "Young Boys", "Thun", "St. Gallen", "Lugano", "Servette", "Luzern", "Lausanne-Sport", "FC Z\xFCrich", "Grasshopper", "Sion", "Vaduz"]
  },
  /* Round 189: wave three, last verifiable candidate. Membership verified
     2026-08-19 against two agreeing sources: rezultati.com's live 2026-27
     fixture list names exactly these ten, matching the season math
     (Vukovar 1991 relegated 10th of 10 per their own Wikipedia page;
     Rudeš promoted per Index.hr and Vrisak.info, both dated 2026-05-23;
     Dinamo Zagreb the reigning champions, their 26th title, per the
     Croatian league's Wikipedia overview and the April 2026 press). The
     real HNL plays each other four times over 36 rounds and settles 9th
     place in a barrage; the engine plays a straight double round robin
     and sends one straight down, the same simplification Switzerland
     shipped with. */
  {
    id: "croatia",
    name: "SuperSport HNL",
    clubs: ["Dinamo Zagreb", "Hajduk Split", "Rijeka", "Osijek", "Vara\u017Edin", "Slaven Belupo", "Istra 1961", "Lokomotiva Zagreb", "Gorica", "Rude\u0161"]
  },
  /* Round 876: Brazil's Serie A 2026. Membership read 2026-10-02 off two
     agreeing tables, the CBF's own
     (https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/2026)
     and ESPN's (https://www.espn.com/soccer/standings/_/league/bra.1): the
     same twenty clubs, Remo and Chapecoense among them. Rosters from the same
     value table as every other league; Chapecoense have no usable rows and
     ship as a youth padded squad that says so. */
  {
    id: "brasileirao",
    name: "Brasileir\xE3o S\xE9rie A",
    clubs: ["Flamengo", "Palmeiras", "Athletico Paranaense", "Fluminense", "Bahia", "Cruzeiro", "Atl\xE9tico Mineiro", "Santos", "Coritiba", "Red Bull Bragantino", "S\xE3o Paulo", "Botafogo", "Vit\xF3ria", "Corinthians", "Mirassol", "Vasco da Gama", "Gr\xEAmio", "Internacional", "Remo", "Chapecoense"]
  },
  /* Round 883: Liga MX 2026-27. Membership read 2026-10-02 off two agreeing
     lists, Liga MX's own site (https://ligamx.net/, the Apertura 2026 club
     menus and table) and ESPN's 2026-27 standings
     (https://www.espn.com/soccer/standings/_/league/mex.1): the same
     eighteen clubs. Atlante are back in place of Mazatlan, whose top flight
     certificate their owner bought (Telemundo, "Atlante esta de regreso",
     and Mediotiempo, "Liga MX recibe a Atlante"). Atlante have no usable
     rows in the value table and ship as a youth padded squad that says so. */
  {
    id: "ligamx",
    name: "Liga MX",
    clubs: ["Am\xE9rica", "Guadalajara", "Cruz Azul", "Monterrey", "Tigres UANL", "Toluca", "Pumas UNAM", "Pachuca", "Le\xF3n", "Santos Laguna", "Atlas", "Necaxa", "Puebla", "Quer\xE9taro", "Tijuana", "FC Ju\xE1rez", "Atl\xE9tico San Luis", "Atlante"]
  },
  /* Round 1035: the A-League Men 2026-27, exactly the twelve clubs of
     scripts/data/gatheredSquads/aleague2026/_membership.json (the league's
     own 2026/2027 ladder and ESPN's 2026-27 standings, read 2026-10-06).
     Squads from src/data/clubManagerALeague2026.ts, generated offline from
     the Round 1034 ledgers. */
  {
    id: "aleague",
    name: "A-League Men",
    clubs: ["Adelaide United", "Auckland FC", "Brisbane Roar", "Central Coast Mariners", "Macarthur FC", "Melbourne City", "Melbourne Victory", "Newcastle Jets", "Perth Glory", "Sydney FC", "Wellington Phoenix", "Western Sydney Wanderers"]
  },
  /* Round 1040: Serie B 2026-27, the twenty clubs ESPN's table and Sky Sport
     Italia (2026-06-07) agree on, read 2026-10-06 (sources beside its
     LEAGUE_RULES row). Cremonese, Pisa and Verona came down from Serie A;
     Vicenza, Arezzo, Benevento and Ascoli came up from Serie C. Appended
     after every older row, so no older list changes its order. */
  {
    id: "serieb",
    name: "Serie B",
    clubs: ["Cremonese", "Verona", "Pisa", "Avellino", "Carrarese", "Catanzaro", "Cesena", "Empoli", "Entella", "Juve Stabia", "Mantova", "Modena", "Padova", "Palermo", "Sampdoria", "S\xFCdtirol", "Vicenza", "Arezzo", "Benevento", "Ascoli"]
  },
  /* Round 1040: Ligue 2 2026-27, the eighteen clubs ESPN's table and
     Saint-Étienne's own Ligue 2 BKT table agree on, read 2026-10-06 (sources
     beside its LEAGUE_RULES row). Metz and Nantes came down from Ligue 1;
     Saint-Étienne lost the barrage to Nice and stayed. The Paris club is
     'Red Star FC', never 'Red Star', which reads as Belgrade. Appended after
     every older row. */
  {
    id: "ligue2",
    name: "Ligue 2",
    clubs: ["Metz", "Nantes", "Saint-\xC9tienne", "Red Star FC", "Reims", "Montpellier", "Nancy", "Annecy", "Sochaux", "Dijon", "Pau", "Guingamp", "Dunkerque", "Grenoble", "Rodez", "Clermont", "Boulogne", "Laval"]
  },
  /* Round 1040: the Segunda División 2026-27, the twenty clubs of the real
     twenty two that ESPN's table and LaLiga's own agree on, less the two
     reserve sides, Real Sociedad B and Celta Fortuna (sources beside its
     LEAGUE_RULES row). Real Oviedo, Girona and Mallorca came down from La
     Liga. FC Andorra are the Andorran club that plays in Spain's league.
     Valladolid keeps the spelling the era leagues already use. Appended
     after every older row. */
  {
    id: "segunda",
    name: "Segunda Divisi\xF3n",
    clubs: ["Real Oviedo", "Girona", "Mallorca", "Eibar", "Castell\xF3n", "Almer\xEDa", "Burgos", "Sabadell", "Sporting Gij\xF3n", "Granada", "Las Palmas", "Tenerife", "Legan\xE9s", "Valladolid", "C\xF3rdoba", "Eldense", "C\xE1diz", "FC Andorra", "Ceuta", "Albacete"]
  },
  /* Round 1052: the Russian Premier League 2026-27. The same sixteen clubs
     on three independent tables read 2026-10-08 (ESPN's standings, the
     Transfermarkt competition page and FotMob's table, all recorded in
     scripts/data/gatheredSquads/russia2026/research.json under
     `membership`) and in Sport-Express's list of the participants
     (2026-07-23, the address is in the rules row's comment): Fakel Voronezh
     and Rodina Moscow came up, Pari Nizhny Novgorod and Sochi went down.
     Zenit, Krasnodar, Spartak Moscow, CSKA Moscow, Lokomotiv Moscow and
     Rubin Kazan keep the spellings the past seasons' Champions League
     fields already use for them (ERA_UCL_FIELDS); the rest are the short
     English names. Squads: src/data/clubManagerRussia2026.ts, generated.
     Appended after every older row. */
  {
    id: "russia",
    name: "Russian Premier League",
    clubs: ["Zenit", "Krasnodar", "Spartak Moscow", "CSKA Moscow", "Lokomotiv Moscow", "Rubin Kazan", "Dynamo Moscow", "Rostov", "Akhmat Grozny", "Krylia Sovetov", "Baltika", "Orenburg", "Akron Tolyatti", "Dynamo Makhachkala", "Rodina Moscow", "Fakel Voronezh"]
  }
].map(leagueFromRow);
var PYRAMIDS = REAL_LEAGUES.filter((l) => leagueRulesOf(l.id).secondTier).map((l) => ({ top: l.id, second: leagueRulesOf(l.id).secondTier, count: leagueRulesOf(l.id).drop }));
var LEAGUE_NATIONS = Object.fromEntries(
  Object.entries(LEAGUE_RULES).map(([id, rules]) => [id, rules.flag])
);
var ERA_LEAGUES = {
  era2010: [
    {
      id: "premier2010",
      name: "Premier League",
      clubs: ["Arsenal", "Aston Villa", "Birmingham City", "Blackburn Rovers", "Blackpool", "Bolton Wanderers", "Chelsea", "Everton", "Fulham", "Liverpool", "Manchester City", "Manchester United", "Newcastle", "Stoke City", "Sunderland", "Tottenham", "West Brom", "West Ham", "Wigan Athletic", "Wolves"]
    },
    {
      id: "laliga2010",
      name: "La Liga",
      clubs: ["Almer\xEDa", "Athletic Club", "Atl\xE9tico Madrid", "Barcelona", "Deportivo La Coru\xF1a", "Espanyol", "Getafe", "H\xE9rcules", "Levante", "M\xE1laga", "Mallorca", "Osasuna", "Racing Santander", "Real Madrid", "Real Sociedad", "Sevilla", "Sporting Gij\xF3n", "Valencia", "Villarreal", "Zaragoza"]
    },
    /* Round 901: the era becomes a full big five. Membership of all three
       leagues from two publishers that agree on every club, read 2026-10-03:
       RSSSF's season records (https://www.rsssf.org/tablesi/ital2011.html,
       https://www.rsssf.org/tablesd/duit2011.html and
       https://www.rsssf.org/tablesf/fran2011.html) and ESPN's final standings
       (https://www.espn.com/soccer/standings/_/league/ITA.1/season/2010 and
       .../GER.1/season/2010 and .../FRA.1/season/2010), AND against the market
       values table itself. In final table order. Names reuse the 2026 and
       2015 spellings wherever the club exists there, so colours and
       rivalries carry over, and the era's Champions League field already
       used them. Cesena is the one thin squad of the three leagues and the
       picker says so. */
    {
      id: "seriea2010",
      name: "Serie A",
      clubs: ["AC Milan", "Inter Milan", "Napoli", "Udinese", "Lazio", "Roma", "Juventus", "Palermo", "Fiorentina", "Genoa", "Chievo Verona", "Parma", "Catania", "Cagliari", "Cesena", "Bologna", "Lecce", "Sampdoria", "Brescia", "Bari"]
    },
    {
      id: "bundesliga2010",
      name: "Bundesliga",
      clubs: ["Borussia Dortmund", "Bayer Leverkusen", "Bayern Munich", "Hannover 96", "Mainz", "N\xFCrnberg", "Kaiserslautern", "Hamburg", "Freiburg", "K\xF6ln", "Hoffenheim", "Stuttgart", "Werder Bremen", "Schalke 04", "Wolfsburg", "Gladbach", "Eintracht Frankfurt", "St. Pauli"]
    },
    {
      id: "ligue12010",
      name: "Ligue 1",
      clubs: ["Lille", "Marseille", "Lyon", "PSG", "Sochaux", "Rennes", "Bordeaux", "Toulouse", "Auxerre", "Saint-\xC9tienne", "Lorient", "Valenciennes", "Nancy", "Montpellier", "Caen", "Brest", "Nice", "Monaco", "Lens", "Arles-Avignon"]
    }
  ].map(leagueFromRow),
  /* Round 175: the 2015-16 season, memberships verified against the season
     records (Wikipedia and worldfootball final tables, checked 2026-08-18)
     AND against the market values table itself (every club dense with real
     year-2015 players; Las Palmas is the one thin squad and the picker says
     so). Names reuse the 2026 and 2010 spellings where the club exists
     there, so colors and rivalries carry over. */
  era2015: [
    {
      id: "premier2015",
      name: "Premier League",
      clubs: ["Arsenal", "Aston Villa", "Bournemouth", "Chelsea", "Crystal Palace", "Everton", "Leicester City", "Liverpool", "Manchester City", "Manchester United", "Newcastle", "Norwich City", "Southampton", "Stoke City", "Sunderland", "Swansea City", "Tottenham", "Watford", "West Brom", "West Ham"]
    },
    {
      id: "laliga2015",
      name: "La Liga",
      clubs: ["Athletic Club", "Atl\xE9tico Madrid", "Barcelona", "Celta Vigo", "Deportivo La Coru\xF1a", "Eibar", "Espanyol", "Getafe", "Granada", "Las Palmas", "Levante", "M\xE1laga", "Rayo Vallecano", "Real Betis", "Real Madrid", "Real Sociedad", "Sevilla", "Sporting Gij\xF3n", "Valencia", "Villarreal"]
    },
    /* Round 191: the era's third league, by the same recipe. Membership
       verified 2026-08-20 against the Wikipedia season page (Juventus the
       champions, their fifth straight; Carpi, Frosinone and Bologna up)
       and worldfootball's fixture list, which names exactly these twenty,
       AND against the market values table itself (Frosinone is the one
       thin squad and the picker says so). */
    {
      id: "seriea2015",
      name: "Serie A",
      clubs: ["Juventus", "Napoli", "Roma", "Inter Milan", "AC Milan", "Fiorentina", "Lazio", "Torino", "Genoa", "Sampdoria", "Sassuolo", "Udinese", "Empoli", "Chievo Verona", "Palermo", "Atalanta", "Bologna", "Hellas Verona", "Carpi", "Frosinone"]
    },
    /* Round 899: the era becomes a full big five. Membership of both
       leagues from two publishers that agree on every club, read
       2026-10-02: RSSSF's season records
       (https://www.rsssf.org/tablesd/duit2016.html and
       https://www.rsssf.org/tablesf/fran2016.html) and ESPN's final
       standings (https://www.espn.com/soccer/standings/_/league/GER.1/season/2015
       and .../league/FRA.1/season/2015), AND against the market values
       table itself. In final table order. Names reuse the 2026 spelling
       wherever the club exists there (Gladbach, Köln, Hamburg, Hertha BSC,
       Hannover 96, PSG), so colours and rivalries carry over. Ingolstadt
       and Darmstadt, Angers and GFC Ajaccio, all four promoted that summer,
       are the thin squads and the picker says so. */
    {
      id: "bundesliga2015",
      name: "Bundesliga",
      clubs: ["Bayern Munich", "Borussia Dortmund", "Bayer Leverkusen", "Gladbach", "Schalke 04", "Mainz", "Hertha BSC", "Wolfsburg", "K\xF6ln", "Hamburg", "Ingolstadt", "Augsburg", "Werder Bremen", "Darmstadt", "Hoffenheim", "Eintracht Frankfurt", "Stuttgart", "Hannover 96"]
    },
    {
      id: "ligue12015",
      name: "Ligue 1",
      clubs: ["PSG", "Lyon", "Monaco", "Nice", "Lille", "Saint-\xC9tienne", "Caen", "Rennes", "Angers", "Bastia", "Bordeaux", "Montpellier", "Marseille", "Nantes", "Lorient", "Guingamp", "Toulouse", "Reims", "GFC Ajaccio", "Troyes"]
    }
  ].map(leagueFromRow),
  /* Round 176: the 2005-06 season, memberships verified against the season
     records (Wikipedia and worldfootball plus RSSSF final tables, checked
     2026-08-19) AND against the market values table itself. Cadiz and
     Alaves are the two thin squads and the picker says so. */
  era2005: [
    {
      id: "premier2005",
      name: "Premier League",
      clubs: ["Arsenal", "Aston Villa", "Birmingham City", "Blackburn Rovers", "Bolton Wanderers", "Charlton Athletic", "Chelsea", "Everton", "Fulham", "Liverpool", "Manchester City", "Manchester United", "Middlesbrough", "Newcastle", "Portsmouth", "Sunderland", "Tottenham", "West Brom", "West Ham", "Wigan Athletic"]
    },
    {
      id: "laliga2005",
      name: "La Liga",
      clubs: ["Alav\xE9s", "Athletic Club", "Atl\xE9tico Madrid", "Barcelona", "C\xE1diz", "Celta Vigo", "Deportivo La Coru\xF1a", "Espanyol", "Getafe", "M\xE1laga", "Mallorca", "Osasuna", "Racing Santander", "Real Betis", "Real Madrid", "Real Sociedad", "Sevilla", "Valencia", "Villarreal", "Zaragoza"]
    },
    /* Round 902: the era becomes a full big five. Membership of all three
       from two publishers that agree on every club, read 2026-10-03:
       RSSSF's season records (https://www.rsssf.org/tablesi/ital06.html,
       .../tablesd/duit06.html, .../tablesf/fran06.html) and ESPN's final
       standings (https://www.espn.com/soccer/standings/_/league/ITA.1/season/2005,
       .../GER.1/season/2005, .../FRA.1/season/2005), AND against the market
       values table itself. Listed alphabetically, like the two leagues above,
       so no list here reads as a final table (Serie A's was rewritten after
       the season). Names reuse the 2026 spelling, or the 2015-16 era's,
       wherever the club exists there, so colours and rivalries carry over.
       Nancy, Troyes and Treviso, all promoted that summer, are the thin
       squads and the picker says so. */
    {
      id: "seriea2005",
      name: "Serie A",
      clubs: ["AC Milan", "Ascoli", "Cagliari", "Chievo Verona", "Empoli", "Fiorentina", "Inter Milan", "Juventus", "Lazio", "Lecce", "Livorno", "Messina", "Palermo", "Parma", "Reggina", "Roma", "Sampdoria", "Siena", "Treviso", "Udinese"]
    },
    {
      id: "bundesliga2005",
      name: "Bundesliga",
      clubs: ["Arminia Bielefeld", "Bayer Leverkusen", "Bayern Munich", "Borussia Dortmund", "Duisburg", "Eintracht Frankfurt", "Gladbach", "Hamburg", "Hannover 96", "Hertha BSC", "Kaiserslautern", "K\xF6ln", "Mainz", "N\xFCrnberg", "Schalke 04", "Stuttgart", "Werder Bremen", "Wolfsburg"]
    },
    {
      id: "ligue12005",
      name: "Ligue 1",
      clubs: ["AC Ajaccio", "Auxerre", "Bordeaux", "Le Mans", "Lens", "Lille", "Lyon", "Marseille", "Metz", "Monaco", "Nancy", "Nantes", "Nice", "PSG", "Rennes", "Saint-\xC9tienne", "Sochaux", "Strasbourg", "Toulouse", "Troyes"]
    }
  ].map(leagueFromRow),
  /* Round 971: the 2020-21 season, a full big five from the start. Every
     membership is the final table of that season from two publishers that
     agree on every club, read 2026-10-03: RSSSF's season records and ESPN's
     final standings (the URLs are on the premier2020 rules row), AND the
     market values table itself (scripts/bakeEra2020.mjs reads each club's
     year-2020 rows). In final table order. Names reuse the 2026 spelling
     wherever the club exists there and an earlier era's spelling where only
     an era has it, so colours and rivalries carry over. Crotone, Elche,
     Arminia Bielefeld, Benevento and Cádiz, all promoted in 2020, are the
     thin squads and the picker says so. */
  era2020: [
    {
      id: "premier2020",
      name: "Premier League",
      clubs: ["Manchester City", "Manchester United", "Liverpool", "Chelsea", "Leicester City", "West Ham", "Tottenham", "Arsenal", "Leeds United", "Everton", "Aston Villa", "Newcastle", "Wolves", "Crystal Palace", "Southampton", "Brighton", "Burnley", "Fulham", "West Brom", "Sheffield United"]
    },
    {
      id: "laliga2020",
      name: "La Liga",
      clubs: ["Atl\xE9tico Madrid", "Real Madrid", "Barcelona", "Sevilla", "Real Sociedad", "Real Betis", "Villarreal", "Celta Vigo", "Granada", "Athletic Club", "Osasuna", "C\xE1diz", "Valencia", "Levante", "Getafe", "Alav\xE9s", "Elche", "Huesca", "Valladolid", "Eibar"]
    },
    {
      id: "seriea2020",
      name: "Serie A",
      clubs: ["Inter Milan", "AC Milan", "Atalanta", "Juventus", "Napoli", "Lazio", "Roma", "Sassuolo", "Sampdoria", "Verona", "Genoa", "Bologna", "Fiorentina", "Udinese", "Spezia", "Cagliari", "Torino", "Benevento", "Crotone", "Parma"]
    },
    {
      id: "bundesliga2020",
      name: "Bundesliga",
      clubs: ["Bayern Munich", "RB Leipzig", "Borussia Dortmund", "Wolfsburg", "Eintracht Frankfurt", "Bayer Leverkusen", "Union Berlin", "Gladbach", "Stuttgart", "Freiburg", "Hoffenheim", "Mainz", "Augsburg", "Hertha BSC", "Arminia Bielefeld", "K\xF6ln", "Werder Bremen", "Schalke 04"]
    },
    {
      id: "ligue12020",
      name: "Ligue 1",
      clubs: ["Lille", "PSG", "Monaco", "Lyon", "Marseille", "Rennes", "Lens", "Montpellier", "Nice", "Metz", "Saint-\xC9tienne", "Bordeaux", "Angers", "Reims", "Strasbourg", "Lorient", "Brest", "Nantes", "N\xEEmes", "Dijon"]
    }
  ].map(leagueFromRow)
};
var IMPORT_CAPS = {
  "saudi|Saudi Arabia": [25, 10],
  "mlsEast|United States": [30, 241 / 30],
  "mlsWest|United States": [30, 241 / 30]
};
var NATIONS = [
  { id: "england", name: "England", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}" },
  { id: "spain", name: "Spain", flag: "\u{1F1EA}\u{1F1F8}" },
  { id: "italy", name: "Italy", flag: "\u{1F1EE}\u{1F1F9}" },
  { id: "germany", name: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  { id: "france", name: "France", flag: "\u{1F1EB}\u{1F1F7}" },
  { id: "netherlands", name: "Netherlands", flag: "\u{1F1F3}\u{1F1F1}" },
  { id: "saudi", name: "Saudi Arabia", flag: "\u{1F1F8}\u{1F1E6}" },
  { id: "usa", name: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  // Round 140
  { id: "portugal", name: "Portugal", flag: "\u{1F1F5}\u{1F1F9}" },
  { id: "scotland", name: "Scotland", flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}" },
  { id: "turkey", name: "Turkey", flag: "\u{1F1F9}\u{1F1F7}" },
  { id: "belgium", name: "Belgium", flag: "\u{1F1E7}\u{1F1EA}" },
  // Round 177
  { id: "austria", name: "Austria", flag: "\u{1F1E6}\u{1F1F9}" },
  { id: "greece", name: "Greece", flag: "\u{1F1EC}\u{1F1F7}" },
  // Round 185
  { id: "denmark", name: "Denmark", flag: "\u{1F1E9}\u{1F1F0}" },
  { id: "switzerland", name: "Switzerland", flag: "\u{1F1E8}\u{1F1ED}" },
  // Round 189
  { id: "croatia", name: "Croatia", flag: "\u{1F1ED}\u{1F1F7}" },
  // Round 876
  { id: "brazil", name: "Brazil", flag: "\u{1F1E7}\u{1F1F7}" },
  // Round 883
  { id: "mexico", name: "Mexico", flag: "\u{1F1F2}\u{1F1FD}" },
  // Round 1035
  { id: "australia", name: "Australia", flag: "\u{1F1E6}\u{1F1FA}" },
  // Round 1052
  { id: "russia", name: "Russia", flag: "\u{1F1F7}\u{1F1FA}" }
].map((n) => ({ ...n, leagueIds: REAL_LEAGUES.filter((l) => leagueRulesOf(l.id).nationId === n.id).map((l) => l.id) }));
function money(n, career) {
  const S = career ? currencySymbol(career) : "\xA3";
  if (n >= 1e3) {
    const bn = n / 1e3;
    return `${S}${Number.isInteger(bn) ? bn : bn.toFixed(1)}bn`;
  }
  if (n >= 1) {
    const m = Math.round(n * 10) / 10;
    return `${S}${Number.isInteger(m) ? m : m.toFixed(1)}m`;
  }
  return `${S}${Math.max(0, Math.round(n * 1e3))}k`;
}
var HOMELAND_ENGINE_NAME = { "United States": "USA" };
var HOMELAND_STORED_NAME = Object.fromEntries(
  Object.entries(HOMELAND_ENGINE_NAME).map(([stored, engine]) => [engine, stored])
);
var CUSTOM_SQUAD_PER_BUDGET = 1 / 0.16;
var LEAGUE_TIEBREAKS = Object.fromEntries(
  Object.entries(LEAGUE_RULES).filter(([, rules]) => rules.tiebreak !== void 0).map(([id, rules]) => [id, rules.tiebreak])
);
var EURO_SLOTS = Object.fromEntries(
  Object.entries(LEAGUE_RULES).filter(([, rules]) => rules.europe !== null).map(([id, rules]) => [id, rules.europe])
);

// src/lib/clubManagerDecisions.ts
var DESK_CAP = 6;
var APPEAL_ODDS = [40, 25, 15];
var APPEAL_LOSS_EXTRA = 1;
var SITUATION_RATE = 0.3;
function isValidEffect(e) {
  if (!e || typeof e !== "object") return false;
  const o = e;
  if (o.kind === "appeal" || o.kind === "acceptBan" || o.kind === "none") return true;
  return o.kind === "move" && ["board", "press", "morale", "budget"].includes(o.meter) && typeof o.delta === "number" && Number.isFinite(o.delta);
}
function isValidVerdictKey(value, item) {
  if (typeof value !== "string") return false;
  try {
    const key = JSON.parse(value);
    return Array.isArray(key) && key.length === 7 && key[0] === 1 && Number.isSafeInteger(key[1]) && key[1] >= 1 && Number.isSafeInteger(key[2]) && key[2] >= 0 && typeof key[3] === "string" && key[3].length > 0 && ALL_POSITIONS.includes(key[4]) && Number.isSafeInteger(key[5]) && key[5] >= 0 && Number.isSafeInteger(key[6]) && key[6] >= 0 && key[1] === item.season && key[2] === item.week && key[3] === item.playerName && typeof item.playerId === "string" && item.playerId.startsWith("youth-") && JSON.stringify(key) === value;
  } catch {
    return false;
  }
}
function isValidDeskItem(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return false;
  const o = x;
  return typeof o.id === "string" && o.id.startsWith("desk-") && (o.kind === "appeal" || o.kind === "situation") && Number.isInteger(o.season) && Number.isInteger(o.week) && typeof o.from === "string" && typeof o.text === "string" && Array.isArray(o.options) && o.options.every((op) => !!op && typeof op === "object" && typeof op.label === "string" && isValidEffect(op.effect)) && (o.resolved === void 0 || typeof o.resolved === "string") && (o.verdictKey === void 0 || o.kind === "appeal" && isValidVerdictKey(o.verdictKey, o)) && (o.kind !== "appeal" || typeof o.playerId === "string" && Number.isInteger(o.ban) && Number.isInteger(o.odds));
}
function deskOf(state) {
  const d = state.decisions;
  return Array.isArray(d) && d.every(isValidDeskItem) ? d : [];
}
function pendingDecisions(state) {
  return deskOf(state).filter((d) => !d.resolved);
}
function deskRoll(key) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let t = h + 1831565813 | 0;
  t = Math.imul(t ^ t >>> 15, 1 | t);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function saveKey(state) {
  return `${state.clubName}|${state.manager?.name ?? ""}`;
}
function appealOddsFor(seasonReds) {
  const n = Math.max(1, Math.floor(seasonReds || 1));
  return APPEAL_ODDS[Math.min(n, APPEAL_ODDS.length) - 1];
}
function appealWins(item, state) {
  return deskRoll(`${item.verdictKey ?? item.id}|${saveKey(state)}|verdict`) < (item.odds ?? 0) / 100;
}
var plural = (n, one) => `${n} ${one}${n === 1 ? "" : "es"}`;
var signed = (n) => n > 0 ? `+${n}` : `${n}`;
function effectWords(effect, state) {
  if (effect.kind !== "move") return "nothing changes";
  switch (effect.meter) {
    case "board":
      return `board patience ${signed(effect.delta)}`;
    case "press":
      return `press mood ${signed(effect.delta)}`;
    case "morale":
      return `his morale ${signed(effect.delta)}`;
    case "budget":
      return effect.delta >= 0 ? `${money(effect.delta, state)} into the transfer budget` : `${money(-effect.delta, state)} out of the transfer budget`;
  }
}
var hasPress = (s2) => !!s2.press && typeof s2.press.mood === "number" && Number.isFinite(s2.press.mood);
var move = (meter, delta) => ({ kind: "move", meter, delta });
var NONE = { kind: "none" };
function deskPlayer(s2, fits) {
  return s2.squad.filter(fits).sort((a, b) => a.morale - b.morale || a.id.localeCompare(b.id))[0] ?? null;
}
var injuredPlayer = (s2) => deskPlayer(s2, (p) => p.injuryWeeks > 0 && p.morale < 75);
var newGraduate = (s2) => deskPlayer(s2, (p) => p.academyGrad === true && p.apps >= 1 && p.apps <= 3);
var limitedPlayer = (s2) => deskPlayer(s2, (p) => !p.isYouth && !p.onLoan && p.injuryWeeks === 0 && p.suspendedMatches === 0 && p.morale < 70 && (p.lastTen?.length ?? 0) >= 5 && p.lastTen.reduce((sum, share) => sum + share, 0) / p.lastTen.length < 0.3);
function lowestMorale(s2) {
  const p = s2.squad.filter((x) => !x.isYouth && x.morale < 55).sort((a, b) => a.morale - b.morale || a.id.localeCompare(b.id))[0];
  return p ? { id: p.id, name: p.name, morale: Math.round(p.morale) } : null;
}
var DECK = [
  {
    id: "promoShoot",
    from: "The commercial team",
    fits: hasPress,
    text: (s2) => `A sponsor wants the squad at a photo shoot on the day off and will pay ${money(0.2, s2)} for the afternoon. The supporters trust has asked for the same afternoon for an open day at the training ground, and the local paper wants to cover it.`,
    options: [
      { verb: "Do the shoot", effect: move("budget", 0.2) },
      { verb: "Give the afternoon to the fans", effect: move("press", 3) },
      { verb: "Give the squad the day off", effect: NONE }
    ]
  },
  {
    id: "investorsNight",
    from: "The board",
    fits: hasPress,
    text: () => "The board want you at an investors dinner on Thursday. A paper has asked for a long sit down interview the same evening.",
    options: [
      { verb: "Go to the dinner", effect: move("board", 3) },
      { verb: "Do the interview", effect: move("press", 4) },
      { verb: "Do neither", effect: NONE }
    ]
  },
  {
    id: "quietWord",
    from: "The head coach",
    fits: () => true,
    who: lowestMorale,
    text: (_s, who) => `The head coach flags ${who?.name ?? "one of the squad"}: his morale is down at ${who?.morale ?? 0}, the lowest in the first team squad, and a word from the manager would help.`,
    options: [
      { verb: "Take him for a coffee", effect: move("morale", 6) },
      { verb: "Leave it to the coach", effect: NONE }
    ]
  },
  {
    id: "schoolVisit",
    from: "The community department",
    fits: () => true,
    text: () => "A local school has asked for a first team visit, and the community department would like the manager to front it. The board like to see the manager doing this sort of thing.",
    options: [
      { verb: "Go yourself", effect: move("board", 2) },
      { verb: "Send a signed shirt instead", effect: NONE }
    ]
  },
  {
    id: "columnist",
    from: "The press officer",
    fits: hasPress,
    text: () => "A columnist has written that your side has no plan. The press officer wants to know whether you will answer it.",
    options: [
      { verb: "Answer it calmly at the next presser", effect: move("press", 3) },
      { verb: "Say nothing", effect: NONE }
    ]
  },
  {
    id: "spareFunds",
    from: "The board",
    fits: () => true,
    text: (s2) => `The board have ${money(0.2, s2)} spare this quarter and want to know where you want it. They will put it in the transfer pot if you ask, and they would read holding it back as a careful manager.`,
    options: [
      { verb: "Put it in the transfer pot", effect: move("budget", 0.2) },
      { verb: "Let them hold it back", effect: move("board", 2) },
      { verb: "Tell them it is their call", effect: NONE }
    ]
  },
  {
    id: "finesKitty",
    from: "The head coach",
    fits: hasPress,
    text: (s2) => `The squad's fines kitty has ${money(0.1, s2)} in it from late arrivals and phones in meetings. The head coach asks where it should go. The local paper always runs it when it goes to charity.`,
    options: [
      { verb: "Give it to the club's community partner", effect: move("press", 2) },
      { verb: "Put it in the transfer pot", effect: move("budget", 0.1) },
      { verb: "Leave it in the kitty", effect: NONE }
    ]
  },
  {
    id: "poorRun",
    from: "The head coach",
    fits: (s2) => hasPress(s2) && s2.form.length >= 3 && s2.form.slice(-3).filter((result) => result === "L").length >= 2,
    text: () => "Two or more losses in the last three matches. Staff want a review; the press officer offers a public update.",
    options: [
      { verb: "Give the board your review", effect: move("board", 3) },
      { verb: "Give a calm public update", effect: move("press", 3) },
      { verb: "Leave it with staff", effect: NONE }
    ]
  },
  {
    id: "boardPressure",
    from: "The board",
    fits: (s2) => hasPress(s2) && Number.isFinite(s2.boardConfidence) && s2.boardConfidence < 35,
    text: (s2) => `Board patience was ${Math.round(s2.boardConfidence * 10) / 10} when this note was written. They want a progress review; the press officer offers an update too.`,
    options: [
      { verb: "Meet the board", effect: move("board", 3) },
      { verb: "Give the public update", effect: move("press", 3) },
      { verb: "Delegate the review", effect: NONE }
    ]
  },
  {
    id: "pressPressure",
    from: "The press officer",
    fits: (s2) => hasPress(s2) && s2.press.mood < 35,
    text: (s2) => `Press mood was ${s2.press.mood} when this note was written. The press officer suggests a calm briefing, or a private review with the board.`,
    options: [
      { verb: "Hold the calm briefing", effect: move("press", 4) },
      { verb: "Review it with the board", effect: move("board", 3) },
      { verb: "Leave it with the press officer", effect: NONE }
    ]
  },
  {
    id: "injurySupport",
    from: "The medical team",
    fits: () => true,
    who: injuredPlayer,
    text: (s2) => {
      const p = injuredPlayer(s2);
      return `${p.name} had ${p.injuryWeeks} injury week${p.injuryWeeks === 1 ? "" : "s"} left when this note was written. Staff suggest a check in or a board update. Neither changes the recovery time.`;
    },
    options: [
      { verb: "Check in with him", effect: move("morale", 6) },
      { verb: "Update the board", effect: move("board", 2) },
      { verb: "Leave it with medical staff", effect: NONE }
    ]
  },
  {
    id: "academyStepUp",
    from: "The academy staff",
    fits: () => true,
    who: newGraduate,
    text: (s2) => {
      const p = newGraduate(s2);
      return `${p.name} has made ${p.apps} first team appearance${p.apps === 1 ? "" : "s"}. Staff suggest a check in or a progress note to the board.`;
    },
    options: [
      { verb: "Recognise his progress", effect: move("morale", 6) },
      { verb: "Send the progress note", effect: move("board", 2) },
      { verb: "Leave it with academy staff", effect: NONE }
    ]
  },
  {
    id: "minutesCheck",
    from: "The head coach",
    fits: () => true,
    who: limitedPlayer,
    text: (s2) => {
      const p = limitedPlayer(s2);
      return `${p.name} has a low playing share across ${p.lastTen.length} recorded matches and low morale. Staff suggest a conversation, with no promise of a start.`;
    },
    options: [
      { verb: "Hear him out", effect: move("morale", 6) },
      { verb: "Explain the situation to the board", effect: move("board", 2) },
      { verb: "Leave it with the coach", effect: NONE }
    ]
  }
];
function optionLabel(verb, effect, state) {
  return `${verb} (${effectWords(effect, state)})`;
}
function capDesk(desk) {
  if (desk.length <= DESK_CAP) return desk;
  const keep = new Set(desk.filter((d) => !d.resolved).map((d) => d.id));
  for (const d of desk) {
    if (keep.size >= DESK_CAP) break;
    keep.add(d.id);
  }
  return desk.filter((d) => keep.has(d.id));
}
function appealCard(state, playerId, opponent) {
  const p = state.squad.find((x) => x.id === playerId);
  if (!p || p.suspendedMatches <= 0) return null;
  const ban = p.suspendedMatches;
  const odds = appealOddsFor(p.seasonReds ?? 1);
  const worse = ban + APPEAL_LOSS_EXTRA;
  const record = (p.seasonReds ?? 1) > 1 ? ` It is his ${ordinal(p.seasonReds ?? 1)} red of the season, which the panel will not ignore.` : "";
  const verdictKey = p.isYouth === true && p.id.startsWith("youth-") ? JSON.stringify([
    1,
    state.season,
    state.week,
    p.name,
    p.position,
    p.age,
    state.squad.slice(0, state.squad.indexOf(p)).filter((other) => other.name === p.name && other.position === p.position && other.age === p.age).length
  ]) : void 0;
  return {
    id: `desk-${state.season}-${state.week}-appeal-${p.id}`,
    kind: "appeal",
    season: state.season,
    week: state.week,
    from: "The club secretary",
    text: `${p.name} was shown a straight red against ${opponent} and is banned for ${plural(ban, "match")}. The club secretary rates an appeal at ${odds} percent.${record} Win and the ban is wiped. Lose and the panel makes it ${plural(worse, "match")}. It has to go in before the next match.`,
    options: [
      { label: `Appeal (${odds}% to wipe the ban, or it becomes ${plural(worse, "match")})`, effect: { kind: "appeal" } },
      { label: `Accept the ban (${plural(ban, "match")}, nothing changes)`, effect: { kind: "acceptBan" } }
    ],
    playerId: p.id,
    playerName: p.name,
    ban,
    odds,
    ...verdictKey === void 0 ? {} : { verdictKey }
  };
}
function ordinal(n) {
  return n === 2 ? "second" : n === 3 ? "third" : `${n}th`;
}
function situationCard(state, desk) {
  const key = `${saveKey(state)}|${state.season}|${state.week}`;
  if (deskRoll(`${key}|offer`) >= SITUATION_RATE) return null;
  const last = desk.find((d) => d.kind === "situation")?.deckId;
  const open = DECK.filter((c) => c.id !== last && c.fits(state) && (!c.who || !!c.who(state)));
  if (!open.length) return null;
  return buildSituation(state, open[Math.floor(deskRoll(`${key}|pick`) * open.length)]);
}
function buildSituation(state, card) {
  const who = card.who ? card.who(state) : null;
  return {
    id: `desk-${state.season}-${state.week}-${card.id}`,
    kind: "situation",
    season: state.season,
    week: state.week,
    from: card.from,
    text: card.text(state, who),
    options: card.options.map((o) => ({ label: optionLabel(o.verb, o.effect, state), effect: o.effect })),
    deckId: card.id,
    ...who ? { playerId: who.id, playerName: who.name } : {}
  };
}
function settleDecisionDesk(state, straightReds, opponent) {
  const before = deskOf(state);
  let desk = before.map((d) => {
    if (d.resolved) return d;
    return d.kind === "appeal" ? { ...d, options: [], outcome: "expired", resolved: `No appeal went in before the next match, so the ${plural(d.ban ?? 0, "match")} ban stood.` } : { ...d, options: [], resolved: "Nobody answered before the next match, so nothing changed." };
  });
  const fresh = [];
  for (const id of straightReds) {
    const card = appealCard(state, id, opponent);
    if (card && !desk.some((d) => d.id === card.id)) fresh.push(card);
  }
  const situation = situationCard(state, desk);
  if (situation && !desk.some((d) => d.id === situation.id)) fresh.push(situation);
  desk = capDesk([...fresh, ...desk]);
  if (desk.length || state.decisions !== void 0) state.decisions = desk;
}
var clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var round1 = (n) => Math.round(n * 10) / 10;
function answerDecision(career, id, optionIdx) {
  const desk = deskOf(career);
  const item = desk.find((d) => d.id === id);
  if (!item || item.resolved) return career;
  const opt = item.options[optionIdx];
  if (!opt) return career;
  const close = (resolved, outcome, extra = {}) => ({
    ...career,
    ...extra,
    decisions: desk.map((d) => d.id === id ? { ...d, options: [], resolved, ...outcome ? { outcome } : {} } : d)
  });
  if (item.kind === "situation" && career.live) {
    return close("The next match has already kicked off, so the reply window closed. Nothing changed.");
  }
  const effect = opt.effect;
  if (effect.kind === "acceptBan") {
    return close(`Accepted. ${item.playerName ?? "He"} serves the ${plural(item.ban ?? 0, "match")} ban.`, "accepted");
  }
  if (effect.kind === "appeal") {
    if (career.live) return close("The next match has already kicked off, so the appeal window closed. The ban stands.", "expired");
    const p = career.squad.find((x) => x.id === item.playerId);
    if (!p || p.suspendedMatches !== item.ban) {
      return close("Too late to appeal. The ban stands as it was.", "expired");
    }
    const won = appealWins(item, career);
    const next = won ? 0 : p.suspendedMatches + APPEAL_LOSS_EXTRA;
    const squad = career.squad.map((x) => x.id === p.id ? { ...x, suspendedMatches: next } : x);
    return won ? close(`Appeal won. The ban is wiped and ${p.name} is available for the next match.`, "won", { squad }) : close(`Appeal lost. The panel made it ${plural(next, "match")}.`, "lost", { squad });
  }
  if (effect.kind === "none") return close("Noted. Nothing changed.");
  const { meter, delta } = effect;
  if (meter === "board") {
    const boardConfidence = clamp(career.boardConfidence + delta, 1, 100);
    return close(`Done. Board patience ${signed(round1(boardConfidence - career.boardConfidence))}.`, void 0, { boardConfidence });
  }
  if (meter === "press") {
    if (!career.press) return close("Noted. Nothing changed.");
    const mood = clamp(career.press.mood + delta, 0, 100);
    return close(`Done. Press mood ${signed(round1(mood - career.press.mood))}.`, void 0, { press: { ...career.press, mood } });
  }
  if (meter === "morale") {
    const p = career.squad.find((x) => x.id === item.playerId);
    if (!p) return close("He has moved on, so nothing changed.");
    const morale = clamp(p.morale + delta, 5, 99);
    const squad = career.squad.map((x) => x.id === p.id ? { ...x, morale } : x);
    return close(`Done. ${p.name}'s morale ${signed(round1(morale - p.morale))}.`, void 0, { squad });
  }
  const budget = Math.round((career.budget + delta) * 1e3) / 1e3;
  return close(`Done. ${effectWords({ kind: "move", meter: "budget", delta: round1(budget - career.budget) }, career)}.`, void 0, { budget });
}
export {
  APPEAL_LOSS_EXTRA,
  APPEAL_ODDS,
  DECK,
  DESK_CAP,
  SITUATION_RATE,
  answerDecision,
  appealCard,
  appealOddsFor,
  appealWins,
  buildSituation,
  deskOf,
  deskRoll,
  effectWords,
  isValidDeskItem,
  optionLabel,
  pendingDecisions,
  settleDecisionDesk,
  situationCard
};
