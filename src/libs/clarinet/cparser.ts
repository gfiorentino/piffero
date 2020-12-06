import { Char, MAX_BUFFER_LENGTH, STATE, stringTokenPattern } from "./const";

var buffers = {
    textNode: undefined,
    numberNode: "",
  };

  // switcharoo
export let S = STATE;


function isWhitespace(c) {
    return (
      c === Char.space ||
      c === Char.carriageReturn ||
      c === Char.lineFeed ||
      c === Char.tab
    );
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
    onend;
    onerror;
    numberNode;
    textNode;
  
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
    }
  
  
  }
  export function error(parser, er) {
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

  

export function clearBuffers(parser) {
    for (var buffer in buffers) {
      parser[buffer] = buffers[buffer];
    }
  }

  
export function closeValue(parser, event) {
    if (parser.textNode !== undefined) {
      emit(parser, event, `"${parser.textNode}"`);
    }
    parser.textNode = undefined;
  }
  export function closeNumber(parser) {
    if (parser.numberNode) emit(parser, "onvalue", "" + parser.numberNode);
    parser.numberNode = "";
  }
  
  export function emit(parser, event?, data?) {
    if (parser.hasOwnProperty(event)) {
      parser[event](data)
    }
  }
  
  
  function emitNode(parser?, event?, data?) {
    closeValue(parser, "onvalue");
    emit(parser, event, data);
  }
  
  
 