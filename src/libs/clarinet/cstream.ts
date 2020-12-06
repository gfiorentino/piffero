import { Stream } from "stream";
import { Char, EVENTS, STATE } from "./const";
import { clearBuffers, closeValue, CParser, emit, error, S } from "./Cparser";
// non node-js needs to set clarinet debug on root

export const streamWraps = EVENTS.filter(function (ev) {
    return ev !== "error" && ev !== "end";
});


export function createStream(opt?) {
  return new CStream(opt);
}

export class CStream extends Stream  {
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
    super(opt);
    this._parser = new CParser(opt);
    //  me = this;
    // Stream.apply(this);
    clearBuffers(this._parser);

    this._parser.onend = function () {
     this.emit("end");
    };

    this._parser.onerror = function (er) {
      this.emit("error", er);
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


  end(chunk) {
    if (chunk && chunk.length) this._parser.write(chunk.toString());
    //this._parser.end();
    this.endParser(this._parser);
  }

  endParser(parser) {
    if (parser.state !== S.VALUE || parser.depth !== 0)
      error(parser, "Unexpected end");
  
    closeValue(parser, "onvalue");
    parser.c = "";
    parser.closed = true;
    emit(parser, "onend");
    this._parser, parser.opt;
    return parser;
  }
  

  on (ev, handler) {
    console.log(ev);
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





