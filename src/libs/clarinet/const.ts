export var env =
  typeof process === "object" && process.env ? process.env : self;

// export const MAX_BUFFER_LENGTH = 10 * 1024 * 1024;
export const EVENTS = [
  "value",
  "string",
  "key",
  "openobject",
  "closeobject",
  "openarray",
  "closearray",
  "error",
  "end",
  "ready",
];

export const stringTokenPattern = /[\\"\n]/g;

export const Char = {
  tab: 0x09, // \t
  lineFeed: 0x0a, // \n
  carriageReturn: 0x0d, // \r
  space: 0x20, // " "

  doubleQuote: 0x22, // "
  plus: 0x2b, // +
  comma: 0x2c, // ,
  minus: 0x2d, // -
  period: 0x2e, // .

  _0: 0x30, // 0
  _9: 0x39, // 9

  colon: 0x3a, // :

  E: 0x45, // E

  openBracket: 0x5b, // [
  backslash: 0x5c, // \
  closeBracket: 0x5d, // ]

  a: 0x61, // a
  b: 0x62, // b
  e: 0x65, // e
  f: 0x66, // f
  l: 0x6c, // l
  n: 0x6e, // n
  r: 0x72, // r
  s: 0x73, // s
  t: 0x74, // t
  u: 0x75, // u

  openBrace: 0x7b, // {
  closeBrace: 0x7d, // }
};

let S: any = 0;

export const STATE = {
  BEGIN: S++,
  VALUE: S++, // general stuff
  OPEN_OBJECT: S++, // {
  CLOSE_OBJECT: S++, // }
  OPEN_ARRAY: S++, // [
  CLOSE_ARRAY: S++, // ]
  TEXT_ESCAPE: S++, // \ stuff
  STRING: S++, // ""
  BACKSLASH: S++,
  END: S++, // No more stack
  OPEN_KEY: S++, // , "a"
  CLOSE_KEY: S++, // :
  TRUE: S++, // r
  TRUE2: S++, // u
  TRUE3: S++, // e
  FALSE: S++, // a
  FALSE2: S++, // l
  FALSE3: S++, // s
  FALSE4: S++, // e
  NULL: S++, // u
  NULL2: S++, // l
  NULL3: S++, // l
  NUMBER_DECIMAL_POINT: S++, // .
  NUMBER_DIGIT: S++, // [0-9]
};

for (var s_ in STATE) STATE[STATE[s_]] = s_;
