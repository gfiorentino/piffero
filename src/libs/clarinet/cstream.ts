import { MasterHandler } from "./../../handler/mastehandler";
import { Writable } from "stream";

const Char = {
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

 let _S: any = 0;

const STATE = {
  BEGIN: _S++,
  VALUE: _S++, // general stuff
  OPEN_OBJECT: _S++, // {
  CLOSE_OBJECT: _S++, // }
  OPEN_ARRAY: _S++, // [
  CLOSE_ARRAY: _S++, // ]
  TEXT_ESCAPE: _S++, // \ stuff
  STRING: _S++, // ""
  BACKSLASH: _S++,
  END: _S++, // No more stack
  OPEN_KEY: _S++, // , "a"
  CLOSE_KEY: _S++, // :
  TRUE: _S++, // r
  TRUE2: _S++, // u
  TRUE3: _S++, // e
  FALSE: _S++, // a
  FALSE2: _S++, // l
  FALSE3: _S++, // s
  FALSE4: _S++, // e
  NULL: _S++, // u
  NULL2: _S++, // l
  NULL3: _S++, // l
  NUMBER_DECIMAL_POINT: _S++, // .
  NUMBER_DIGIT: _S++, // [0-9]
};

for (var s_ in STATE) STATE[STATE[s_]] = s_;


const stringTokenPattern = /[\\"\n]/g;

// switcharoo
let S = STATE;

class CParser {
  opt;
  handler: MasterHandler;
  q = "";
  c = "";
  p = "";
  closed = false;
  closedRoot = false;
  sawRoot = false;
  tag = null;
  errorString = null;
  state = S.BEGIN;
  stack = new Array();
  column = 0;
  line = 1;
  slashed = false;
  unicodeI = 0;
  unicodeS = null;
  depth = 0;
  onerror;
  numberNode: string;
  textNode: string;

  constructor(handler, opt?) {
    this.handler = handler;
    this.opt = opt ? opt : {};
    this.clearBuffers();
  }

  clearBuffers() {
    this.textNode = undefined;
    this.numberNode = "";
  }

  isWhitespace(c) {
    return (
      c === Char.space ||
      c === Char.carriageReturn ||
      c === Char.lineFeed ||
      c === Char.tab
    );
  }

  write(chunk) {
    if (this.errorString) throw this.errorString;
    if (this.closed)
      return this.error("Cannot write after close. Assign an onready handler.");
    if (chunk === null) {
      return this.end();
    }
    var i: any = 0;
    let c: any = chunk.charCodeAt(0);
    let p: any = this.p;
    while (c) {
      p = c;
      this.c = c = chunk.charCodeAt(i++);
      // if chunk doesnt have next, like streaming char by char
      // this way we need to check if previous is really previous
      // if not we need to reset to what the parser says is the previous
      // from buffer
      if (p !== c) {
        this.p = p;
      } else {
        p = this.p;
      }

      if (!c) break;
      if (c === Char.lineFeed) {
        this.line++;
        this.column = 0;
      } else {
        this.column++;
      }
      switch (this.state) {
        case S.BEGIN:
          if (c === Char.openBrace) this.state = S.OPEN_OBJECT;
          else if (c === Char.openBracket) this.state = S.OPEN_ARRAY;
          else if (!this.isWhitespace(c)) {
            this.error("Non-whitespace before {[.");
          }
          continue;
        case S.OPEN_KEY:
        case S.OPEN_OBJECT:
          if (this.isWhitespace(c)) continue;
          if (this.state === S.OPEN_KEY) {
            this.stack.push(S.CLOSE_KEY);
          } else {
            if (c === Char.closeBrace) {
              this.handler.onopenobject(undefined);
              this.depth++;
              this.handler.oncloseobject();
              this.depth--;
              this.state = this.stack.pop() || S.VALUE;
              continue;
            } else this.stack.push(S.CLOSE_OBJECT);
          }
          if (c === Char.doubleQuote) this.state = S.STRING;
          else this.error('Malformed object key should start with "');
          continue;

        case S.CLOSE_KEY:
        case S.CLOSE_OBJECT:
          if (this.isWhitespace(c)) continue;
          var event = this.state === S.CLOSE_KEY ? "key" : "object";
          if (c === Char.colon) {
            if (this.state === S.CLOSE_OBJECT) {
              this.stack.push(S.CLOSE_OBJECT);
              this.closeValue("onopenobject");
              this.depth++;
            } else this.closeValue("onkey");
            this.state = S.VALUE;
          } else if (c === Char.closeBrace) {
            this.closeValue("onvalue");

            this.handler.oncloseobject();
            this.depth--;
            this.state = this.stack.pop() || S.VALUE;
          } else if (c === Char.comma) {
            if (this.state === S.CLOSE_OBJECT) {
              this.stack.push(S.CLOSE_OBJECT);
            }
            this.closeValue("onvalue");
            this.state = S.OPEN_KEY;
          } else this.error("Bad object");
          continue;

        case S.OPEN_ARRAY: // after an array there always a value
        case S.VALUE:
          if (this.isWhitespace(c)) continue;
          if (this.state === S.OPEN_ARRAY) {
            this.handler.onopenarray();
            this.depth++;
            this.state = S.VALUE;
            if (c === Char.closeBracket) {
              this.handler.onclosearray();
              this.depth--;
              this.state = this.stack.pop() || S.VALUE;
              continue;
            } else {
              this.stack.push(S.CLOSE_ARRAY);
            }
          }
          if (c === Char.doubleQuote) this.state = S.STRING;
          else if (c === Char.openBrace) this.state = S.OPEN_OBJECT;
          else if (c === Char.openBracket) this.state = S.OPEN_ARRAY;
          else if (c === Char.t) this.state = S.TRUE;
          else if (c === Char.f) this.state = S.FALSE;
          else if (c === Char.n) this.state = S.NULL;
          else if (c === Char.minus) {
            // keep and continue
            this.numberNode += "-";
          } else if (Char._0 <= c && c <= Char._9) {
            this.numberNode += String.fromCharCode(c);
            this.state = S.NUMBER_DIGIT;
          } // else this.error("Bad value"); // removed not needed for nested stream
          continue;

        case S.CLOSE_ARRAY:
          if (c === Char.comma) {
            this.closeValue("onvalue");
            this.stack.push(S.CLOSE_ARRAY);
            this.state = S.VALUE;
          } else if (c === Char.closeBracket) {
            this.closeValue("onvalue");
            this.handler.onclosearray();
            this.depth--;
            this.state = this.stack.pop() || S.VALUE;
          } else if (this.isWhitespace(c)) continue;
          else this.error("Bad array");
          continue;

        case S.STRING:
          if (this.textNode === undefined) {
            this.textNode = "";
          }

          // thanks thejh, this is an about 50% performance improvement.
          var starti = i - 1,
            slashed = this.slashed,
            unicodeI = this.unicodeI;
          STRING_BIGLOOP: while (true) {
            // zero means "no unicode active". 1-4 mean "parse some more". end after 4.
            while (unicodeI > 0) {
              this.unicodeS += String.fromCharCode(c);
              c = chunk.charCodeAt(i++);
              // this.position++;
              if (unicodeI === 4) {
                // TODO this might be slow? well, probably not used too often anyway
                this.textNode += String.fromCharCode(
                  parseInt(this.unicodeS, 16)
                );
                unicodeI = 0;
                starti = i - 1;
              } else {
                unicodeI++;
              }
              // we can just break here: no stuff we skipped that still has to be sliced out or so
              if (!c) break STRING_BIGLOOP;
            }
            if (c === Char.doubleQuote && !slashed) {
              this.state = this.stack.pop() || S.VALUE;
              this.textNode += chunk.substring(starti, i - 1);
              break;
            }
            if (c === Char.backslash && !slashed) {
              slashed = true;
              this.textNode += chunk.substring(starti, i - 1);
              c = chunk.charCodeAt(i++);
              if (!c) break;
            }
            if (slashed) {
              this.textNode += "\\";
              slashed = false;

              this.textNode += String.fromCharCode(c);

              c = chunk.charCodeAt(i++);
              starti = i - 1;
              if (!c) break;
              else continue;
            }

            stringTokenPattern.lastIndex = i;
            var reResult = stringTokenPattern.exec(chunk);
            if (reResult === null) {
              i = chunk.length + 1;
              this.textNode += chunk.substring(starti, i - 1);
              break;
            }
            i = reResult.index + 1;
            c = chunk.charCodeAt(reResult.index);
            if (!c) {
              this.textNode += chunk.substring(starti, i - 1);
              break;
            }
          }
          this.slashed = slashed;
          this.unicodeI = unicodeI;
          continue;

        case S.TRUE:
          if (c === Char.r) this.state = S.TRUE2;
          else this.error("Invalid true started with t" + c);
          continue;

        case S.TRUE2:
          if (c === Char.u) this.state = S.TRUE3;
          else this.error("Invalid true started with tr" + c);
          continue;

        case S.TRUE3:
          if (c === Char.e) {
            this.handler.onvalue("true");
            this.state = this.stack.pop() || S.VALUE;
          } else this.error("Invalid true started with tru" + c);
          continue;

        case S.FALSE:
          if (c === Char.a) this.state = S.FALSE2;
          else this.error("Invalid false started with f" + c);
          continue;

        case S.FALSE2:
          if (c === Char.l) this.state = S.FALSE3;
          else this.error("Invalid false started with fa" + c);
          continue;

        case S.FALSE3:
          if (c === Char.s) this.state = S.FALSE4;
          else this.error("Invalid false started with fal" + c);
          continue;

        case S.FALSE4:
          if (c === Char.e) {
            this.handler.onvalue("false");
            this.state = this.stack.pop() || S.VALUE;
          } else this.error("Invalid false started with fals" + c);
          continue;

        case S.NULL:
          if (c === Char.u) this.state = S.NULL2;
          else this.error("Invalid null started with n" + c);
          continue;

        case S.NULL2:
          if (c === Char.l) this.state = S.NULL3;
          else this.error("Invalid null started with nu" + c);
          continue;

        case S.NULL3:
          if (c === Char.l) {
            this.handler.onvalue("null");
            this.state = this.stack.pop() || S.VALUE;
          } else this.error("Invalid null started with nul" + c);
          continue;

        case S.NUMBER_DECIMAL_POINT:
          if (c === Char.period) {
            this.numberNode += ".";
            this.state = S.NUMBER_DIGIT;
          } else this.error("Leading zero not followed by .");
          continue;

        case S.NUMBER_DIGIT:
          if (Char._0 <= c && c <= Char._9)
            this.numberNode += String.fromCharCode(c);
          else if (c === Char.period) {
            if (this.numberNode.indexOf(".") !== -1)
              this.error("Invalid number has two dots");
            this.numberNode += ".";
          } else if (c === Char.e || c === Char.E) {
            if (
              this.numberNode.indexOf("e") !== -1 ||
              this.numberNode.indexOf("E") !== -1
            )
              this.error("Invalid number has two exponential");
            this.numberNode += "e";
          } else if (c === Char.plus || c === Char.minus) {
            if (!(p === Char.e || p === Char.E))
              this.error("Invalid symbol in number");
            this.numberNode += String.fromCharCode(c);
          } else {
            this.closeNumber();
            i--; // go back one
            this.state = this.stack.pop() || S.VALUE;
          }
          continue;

        default:
          this.error("Unknown state: " + this.state);
      }
    }
    return this;
  }

  end() {
    if (this.state !== S.VALUE || this.depth !== 0)
      this.error("Unexpected end");

    this.closeValue("onvalue");
    this.c = "";
    this.closed = true;
    this.handler.onend();
    return this;
  }

  closeValue(event) {
    if (this.textNode !== undefined) {
      this.handler[event](`"${this.textNode}"`);
      this.textNode = undefined;
    }
  }

  closeNumber() {
    if (this.numberNode) {
      this.handler.onvalue("" + this.numberNode);
      this.numberNode = "";
    }
  }

  error(er) {
    this.closeValue("onvalue");
    er +=
      "\nLine: " + this.line + "\nColumn: " + this.column + "\nChar: " + this.c;
    this.handler.onerror(er);
  }
}


// export const MAX_BUFFER_LENGTH = 10 * 1024 * 1024;
const EVENTS = [
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

const streamWraps = EVENTS.filter(function (ev) {
  return ev !== "error" && ev !== "end";
});

export class CStream extends Writable {
  _parser: CParser;
  readable = true;
  handler: MasterHandler;
  bytes_remaining = 0; // number of bytes remaining in multi byte utf8 char to read after split boundary
  bytes_in_sequence = 0; // bytes in multi byte utf8 char to read
  temp_buffs = {
    2: Buffer.alloc(2),
    3: Buffer.alloc(3),
    4: Buffer.alloc(4),
  }; // for rebuilding chars split before boundary is reached
  string = "";

  constructor(handler: MasterHandler, opt?) {
    super(opt);
    this.handler = handler;
    this._parser = new CParser(handler, opt);

    this._parser.onerror = (er) => {
      this.handler.onerror(er);
      this._parser.error = null;

      streamWraps.forEach(function (ev) {
        Object.defineProperty(this, "on" + ev, {
          get: function () {
            return this._parser["on" + ev];
          },
          set: function (h) {
            if (!h) {
              this.removeAllListeners(ev);
              this._parser["on" + ev] = h;
              return h;
            }
            this.on(ev, h);
          },
          enumerable: true,
          configurable: false,
        });
      });
    };
  }

  write(data) {
    const l = data.length;
    const tbbis = this.temp_buffs[this.bytes_in_sequence];
    for (let i = 0; i < l; i++) {
      let n = data[i];
      // check for carry over of a multi byte char split between data chunks
      // & fill temp buffer it with start of this data chunk up to the boundary limit set in the last iteration
      if (this.bytes_remaining > 0) {
        const diffBytes = this.bytes_in_sequence - this.bytes_remaining;
        for (var j = 0, e = this.bytes_remaining; j < e; j++) {
          tbbis[diffBytes + j] = data[j];
        }
        this.string = "" + tbbis;
        this.bytes_in_sequence = this.bytes_remaining = 0;

        // move iterator forward by number of byte read during sequencing
        i = i + j - 1;

        // pass data to parser and move forward to parse rest of data
        this._parser.write(this.string);
        continue;
      }

      // if no remainder bytes carried over, parse multi byte (>=128) chars one at a time
      if (this.bytes_remaining === 0 && n >= 128) {
        if (n <= 223 && n >= 194) {
          this.bytes_in_sequence = 2;
        } else if (n <= 239 && n >= 224) {
          this.bytes_in_sequence = 3;
        } else if (n <= 244 && n >= 240) {
          this.bytes_in_sequence = 4;
        }
        const bytes_in_sequence_i = this.bytes_in_sequence + i;
        if (bytes_in_sequence_i > data.length) {
          // if bytes needed to complete char fall outside data length, we have a boundary split
          for (var k = 0, length = l - 1 - i; k <= length; k++) {
            tbbis[k] = data[i + k]; // fill temp data of correct size with bytes available in this chunk
          }

          this.bytes_remaining = bytes_in_sequence_i - data.length;

          // immediately return as we need another chunk to sequence the character
          return true;
        } else {
          this.string = "" + data.slice(i, bytes_in_sequence_i);
          i = bytes_in_sequence_i - 1;

          this._parser.write(this.string);
          continue;
        }
      }

      // is there a range of characters that are immediately parsable?
      for (var p = i; p < l; p++) {
        if (data[p] >= 128) break;
      }
      this.string = "" + data.slice(i, p);
      this._parser.write(this.string);
      i = p - 1;
    }
  }

  end(chunk) {
    if (chunk) this._parser.write("" + chunk);
    this._parser.end();
    this.endParser();
  }

  endParser() {
    if (this._parser.state !== S.VALUE || this._parser.depth !== 0) {
      this._parser.error("Unexpected end");
    }
    this._parser.closeValue("onvalue");
    this._parser.c = "";
    this._parser.closed = true;
    this.handler.onend();
    // this._parser.onend();
  }

  destroy() {
    this._parser.clearBuffers();
    this.handler.onclose();
  }
}
