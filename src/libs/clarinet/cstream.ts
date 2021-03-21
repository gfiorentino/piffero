import { MasterHandler } from "./../../handler/mastehandler";
import { Writable } from "stream";
import { EVENTS } from "./const";
import { CParser, S } from "./cparser";

export const streamWraps = EVENTS.filter(function (ev) {
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
        this.string = '' + tbbis;
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
          this.string = '' + data.slice(i, bytes_in_sequence_i);
          i = bytes_in_sequence_i - 1;

          this._parser.write(this.string);
          continue;
        }
      }

      // is there a range of characters that are immediately parsable?
      for (var p = i; p < l; p++) {
        if (data[p] >= 128) break;
      }
      this.string = '' + data.slice(i, p);
      this._parser.write(this.string);
      i = p - 1;
    }
  }

  end(chunk) {
    if (chunk) this._parser.write('' + chunk);
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
