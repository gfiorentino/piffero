import { MasterHandler } from "./../../handler/mastehandler";
import { Char, STATE, stringTokenPattern } from "./const";

// switcharoo
export let S = STATE;

export class CParser {
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
    // this.emit("onready");  not needed
    this.clearBuffers();
  }

  clearBuffers() {
    this.textNode = undefined;
    this.numberNode = "";
  }

  /*resume() {
    this.errorString = null;
    return this;
  }

  close() {
    return this.write(null);
  } */

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
      // this.position++;
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
          } else this.error("Bad value");
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
            //this.emit("onvalue", "true");
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
    er = new Error(er);
    throw er;
  }
}
