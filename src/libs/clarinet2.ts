import { Stream } from "stream";
// non node-js needs to set clarinet debug on root
var env = typeof process === "object" && process.env ? process.env : self;

const MAX_BUFFER_LENGTH = 10 * 1024 * 1024;
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

var buffers = {
    textNode: undefined,
    numberNode: "",
  };
const streamWraps = EVENTS.filter(function (ev) {
    return ev !== "error" && ev !== "end";
});

let S: any = 0;

const STATE = {
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

// switcharoo
S = STATE;

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

function isWhitespace(c) {
  return (
    c === Char.space ||
    c === Char.carriageReturn ||
    c === Char.lineFeed ||
    c === Char.tab
  );
}

if (!Object.create) {
  Object.create = function (o) {
    function f() {
      this["__proto__"] = o;
    }
    f.prototype = o;
    return new f();
  };
}

if (!Object.getPrototypeOf) {
  Object.getPrototypeOf = function (o) {
    return o["__proto__"];
  };
}

if (!Object.keys) {
  Object.keys = function (o) {
    var a = [];
    for (var i in o) if (o.hasOwnProperty(i)) a.push(i);
    return a;
  };
}

function checkBufferLength(parser) {
  var maxAllowed = Math.max(MAX_BUFFER_LENGTH, 10),
    maxActual = 0;
  for (var buffer in buffers) {
    var len = parser[buffer] === undefined ? 0 : parser[buffer].length;
    if (len > maxAllowed) {
      switch (buffer) {
        case "text":
          //   questa funzione non esiste :(
          //   closeText(parser);
          break;

        default:
          error(parser, "Max buffer length exceeded: " + buffer);
      }
    }
    maxActual = Math.max(maxActual, len);
  }
  parser.bufferCheckPosition = MAX_BUFFER_LENGTH - maxActual + parser.position;
}

var stringTokenPattern = /[\\"\n]/g;


function clearBuffers(parser) {
  for (var buffer in buffers) {
    parser[buffer] = buffers[buffer];
  }
}

function emit(parser, event?, data?) {
  if (parser.hasOwnProperty(event)) {
    console.log(parser, event);
    parser[event](data)};
}


function emitNode(parser?, event?, data?) {
  closeValue(parser, "onvalue");
  emit(parser, event, data);
}

function closeValue(parser, event) {
  if (parser.textNode !== undefined) {
    emit(parser, event, `"${parser.textNode}"`);
  }
  parser.textNode = undefined;
}

function closeNumber(parser) {
  if (parser.numberNode) emit(parser, "onvalue", "" + parser.numberNode);
  parser.numberNode = "";
}

function error(parser, er) {
  closeValue(parser, "onvalue");
  er +=
    "\nLine: " +
    parser.line +
    "\nColumn: " +
    parser.column +
    "\nChar: " +
    parser.c;
  er = new Error(er);
  parser.error = er;
  emit(parser, "onerror", er);
  return parser;
}





export class CParser {
  opt;
  bufferCheckPosition = MAX_BUFFER_LENGTH;
  q = "";
  c = "";
  p = "";
  closed = false;
  closedRoot = false;
  sawRoot = false;
  tag = null;
  error = null;
  state = S.BEGIN;
  stack = new Array();
  // mostly just for error reporting
  position = 0;
  column = 0;
  line = 1;
  slashed = false;
  unicodeI = 0;
  unicodeS = null;
  depth = 0;
  numberNode = "";
  textNode = "";
  onend;
  onerror;

  constructor(_opt) {
    this.opt = _opt ? _opt : {};
    emit(this, "onready");
  }


  resume() {
    this.error = null;
    return this;
  }


  close() {
    return this.write(null);
  }

  write(chunk) {
    if (this.error) throw this.error;
    if (this.closed)
      return error(
        this,
        "Cannot write after close. Assign an onready handler."
      );
    if (chunk === null) return this.end();
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
      if (p !== c) this.p = p;
      else p = this.p;
  
      if (!c) break;
      this.position++;
      if (c === Char.lineFeed) {
        this.line++;
        this.column = 0;
      } else this.column++;
      switch (this.state) {
        case S.BEGIN:
          if (c === Char.openBrace) this.state = S.OPEN_OBJECT;
          else if (c === Char.openBracket) this.state = S.OPEN_ARRAY;
          else if (!isWhitespace(c)) error(this, "Non-whitespace before {[.");
          continue;
  
        case S.OPEN_KEY:
        case S.OPEN_OBJECT:
          if (isWhitespace(c)) continue;
          if (this.state === S.OPEN_KEY) this.stack.push(S.CLOSE_KEY);
          else {
            if (c === Char.closeBrace) {
              emit(this, "onopenobject");
              this.depth++;
              emit(this, "oncloseobject");
              this.depth--;
              this.state = this.stack.pop() || S.VALUE;
              continue;
            } else this.stack.push(S.CLOSE_OBJECT);
          }
          if (c === Char.doubleQuote) this.state = S.STRING;
          else error(this, 'Malformed object key should start with "');
          continue;
  
        case S.CLOSE_KEY:
        case S.CLOSE_OBJECT:
          if (isWhitespace(c)) continue;
          var event = this.state === S.CLOSE_KEY ? "key" : "object";
          if (c === Char.colon) {
            if (this.state === S.CLOSE_OBJECT) {
              this.stack.push(S.CLOSE_OBJECT);
              closeValue(this, "onopenobject");
              this.depth++;
            } else closeValue(this, "onkey");
            this.state = S.VALUE;
          } else if (c === Char.closeBrace) {
            emitNode(this, "oncloseobject");
            this.depth--;
            this.state = this.stack.pop() || S.VALUE;
          } else if (c === Char.comma) {
            if (this.state === S.CLOSE_OBJECT)
              this.stack.push(S.CLOSE_OBJECT);
            closeValue(this, "onvalue");
            this.state = S.OPEN_KEY;
          } else error(this, "Bad object");
          continue;
  
        case S.OPEN_ARRAY: // after an array there always a value
  
        case S.VALUE:
          if (isWhitespace(c)) continue;
          if (this.state === S.OPEN_ARRAY) {
            emit(this, "onopenarray");
            this.depth++;
            this.state = S.VALUE;
            if (c === Char.closeBracket) {
              emit(this, "onclosearray");
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
          } else error(this, "Bad value");
          continue;
  
        case S.CLOSE_ARRAY:
          if (c === Char.comma) {
            this.stack.push(S.CLOSE_ARRAY);
            closeValue(this, "onvalue");
            this.state = S.VALUE;
          } else if (c === Char.closeBracket) {
            emitNode(this, "onclosearray");
            this.depth--;
            this.state = this.stack.pop() || S.VALUE;
          } else if (isWhitespace(c)) continue;
          else error(this, "Bad array");
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
              this.position++;
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
              this.position += i - 1 - starti;
              break;
            }
            if (c === Char.backslash && !slashed) {
              slashed = true;
              this.textNode += chunk.substring(starti, i - 1);
              this.position += i - 1 - starti;
              c = chunk.charCodeAt(i++);
              this.position++;
              if (!c) break;
            }
            if (slashed) {
              slashed = false;
              if (c === Char.n) {
                this.textNode += "\n";
              } else if (c === Char.r) {
                this.textNode += "\r";
              } else if (c === Char.t) {
                this.textNode += "\t";
              } else if (c === Char.f) {
                this.textNode += "\f";
              } else if (c === Char.b) {
                this.textNode += "\b";
              } else if (c === Char.u) {
                // \uxxxx. meh!
                unicodeI = 1;
                this.unicodeS = "";
              } else {
                this.textNode += String.fromCharCode(c);
              }
              c = chunk.charCodeAt(i++);
              this.position++;
              starti = i - 1;
              if (!c) break;
              else continue;
            }
  
            stringTokenPattern.lastIndex = i;
            var reResult = stringTokenPattern.exec(chunk);
            if (reResult === null) {
              i = chunk.length + 1;
              this.textNode += chunk.substring(starti, i - 1);
              this.position += i - 1 - starti;
              break;
            }
            i = reResult.index + 1;
            c = chunk.charCodeAt(reResult.index);
            if (!c) {
              this.textNode += chunk.substring(starti, i - 1);
              this.position += i - 1 - starti;
              break;
            }
          }
          this.slashed = slashed;
          this.unicodeI = unicodeI;
          continue;
  
        case S.TRUE:
          if (c === Char.r) this.state = S.TRUE2;
          else error(this, "Invalid true started with t" + c);
          continue;
  
        case S.TRUE2:
          if (c === Char.u) this.state = S.TRUE3;
          else error(this, "Invalid true started with tr" + c);
          continue;
  
        case S.TRUE3:
          if (c === Char.e) {
            emit(this, "onvalue", "true");
            this.state = this.stack.pop() || S.VALUE;
          } else error(this, "Invalid true started with tru" + c);
          continue;
  
        case S.FALSE:
          if (c === Char.a) this.state = S.FALSE2;
          else error(this, "Invalid false started with f" + c);
          continue;
  
        case S.FALSE2:
          if (c === Char.l) this.state = S.FALSE3;
          else error(this, "Invalid false started with fa" + c);
          continue;
  
        case S.FALSE3:
          if (c === Char.s) this.state = S.FALSE4;
          else error(this, "Invalid false started with fal" + c);
          continue;
  
        case S.FALSE4:
          if (c === Char.e) {
            emit(this, "onvalue", "false");
            this.state = this.stack.pop() || S.VALUE;
          } else error(this, "Invalid false started with fals" + c);
          continue;
  
        case S.NULL:
          if (c === Char.u) this.state = S.NULL2;
          else error(this, "Invalid null started with n" + c);
          continue;
  
        case S.NULL2:
          if (c === Char.l) this.state = S.NULL3;
          else error(this, "Invalid null started with nu" + c);
          continue;
  
        case S.NULL3:
          if (c === Char.l) {
            emit(this, "onvalue", "null");
            this.state = this.stack.pop() || S.VALUE;
          } else error(this, "Invalid null started with nul" + c);
          continue;
  
        case S.NUMBER_DECIMAL_POINT:
          if (c === Char.period) {
            this.numberNode += ".";
            this.state = S.NUMBER_DIGIT;
          } else error(this, "Leading zero not followed by .");
          continue;
  
        case S.NUMBER_DIGIT:
          if (Char._0 <= c && c <= Char._9)
            this.numberNode += String.fromCharCode(c);
          else if (c === Char.period) {
            if (this.numberNode.indexOf(".") !== -1)
              error(this, "Invalid number has two dots");
            this.numberNode += ".";
          } else if (c === Char.e || c === Char.E) {
            if (
              this.numberNode.indexOf("e") !== -1 ||
              this.numberNode.indexOf("E") !== -1
            )
              error(this, "Invalid number has two exponential");
            this.numberNode += "e";
          } else if (c === Char.plus || c === Char.minus) {
            if (!(p === Char.e || p === Char.E))
              error(this, "Invalid symbol in number");
            this.numberNode += String.fromCharCode(c);
          } else {
            closeNumber(this);
            i--; // go back one
            this.state = this.stack.pop() || S.VALUE;
          }
          continue;
  
        default:
          error(this, "Unknown state: " + this.state);
      }
    }
    if (this.position >= this.bufferCheckPosition) checkBufferLength(this);
    return this;
  }

  end() {
    if (this.state !== S.VALUE || this.depth !== 0)
      error(this, "Unexpected end");
  
    closeValue(this, "onvalue");
    this.c = "";
    this.closed = true;
    emit(this, "onend");
    CParser.call(this, this.opt);
    return this;
  }
  
}





export function createStream(opt?) {
  return new CStream(opt);
}

class CStream extends Stream {
  _parser: CParser;
  readable = true;
  bytes_remaining = 0; // number of bytes remaining in multi byte utf8 char to read after split boundary
  bytes_in_sequence = 0; // bytes in multi byte utf8 char to read
  temp_buffs = {
    2: Buffer.alloc(2),
    3: Buffer.alloc(3),
    4: Buffer.alloc(4),
  }; // for rebuilding chars split before boundary is reached
  string = "";

  constructor(opt) {
    super();
    this._parser = new CParser(opt);
    //    me = this;
    Stream.apply(this);

    this._parser.onend = function () {
      emit("end");
    };

    this._parser.onerror = function (er) {
      emit("error", er);
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
    data = Buffer.from(data);
    for (var i = 0; i < data.length; i++) {
      var n = data[i];

      // check for carry over of a multi byte char split between data chunks
      // & fill temp buffer it with start of this data chunk up to the boundary limit set in the last iteration
      if (this.bytes_remaining > 0) {
        for (var j = 0; j < this.bytes_remaining; j++) {
          this.temp_buffs[this.bytes_in_sequence][
            this.bytes_in_sequence - this.bytes_remaining + j
          ] = data[j];
        }
        this.string = this.temp_buffs[this.bytes_in_sequence].toString();
        this.bytes_in_sequence = this.bytes_remaining = 0;

        // move iterator forward by number of byte read during sequencing
        i = i + j - 1;

        // pass data to parser and move forward to parse rest of data
        this._parser.write(this.string);
        emit("data", this.string);
        continue;
      }

      // if no remainder bytes carried over, parse multi byte (>=128) chars one at a time
      if (this.bytes_remaining === 0 && n >= 128) {
        if (n >= 194 && n <= 223) this.bytes_in_sequence = 2;
        if (n >= 224 && n <= 239) this.bytes_in_sequence = 3;
        if (n >= 240 && n <= 244) this.bytes_in_sequence = 4;
        if (this.bytes_in_sequence + i > data.length) {
          // if bytes needed to complete char fall outside data length, we have a boundary split

          for (var k = 0; k <= data.length - 1 - i; k++) {
            this.temp_buffs[this.bytes_in_sequence][k] = data[i + k]; // fill temp data of correct size with bytes available in this chunk
          }
          this.bytes_remaining = i + this.bytes_in_sequence - data.length;

          // immediately return as we need another chunk to sequence the character
          return true;
        } else {
          this.string = data.slice(i, i + this.bytes_in_sequence).toString();
          i = i + this.bytes_in_sequence - 1;

          this._parser.write(this.string);
          emit("data", this.string);
          continue;
        }
      }

      // is there a range of characters that are immediately parsable?
      for (var p = i; p < data.length; p++) {
        if (data[p] >= 128) break;
      }
      this.string = data.slice(i, p).toString();
      this._parser.write(this.string);
      emit("data", this.string);
      i = p - 1;

      // handle any remaining characters using multibyte logic
      continue;
    }
  }

  //    CStream.prototype = Object.create(Stream.prototype, {
  //   constructor: { value: CStream },
  // });

  end(chunk) {
    if (chunk && chunk.length) this._parser.write(chunk.toString());
    this._parser.end();
    return true;
  }

  on (ev, handler) {
    if (!this._parser["on" + ev] && streamWraps.indexOf(ev) !== -1) {
      this._parser["on" + ev] = function () {
        var args =
          arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
        args.splice(0, 0, ev);
        emit.apply(this, args);
      };
    }
    return Stream.prototype.on.call(this, ev, handler);
  }

  destroy() {
    clearBuffers(this._parser);
    emit("close");
  };
}





