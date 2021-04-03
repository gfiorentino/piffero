import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";
import { PifferoError } from "../../src/pifferoerror";

describe("piffero Error", function() {
    const fs  =  require('fs');


    it("error two dots", async function(done) {
        const stream = fs.createReadStream('spec/jsonFiles/error-two-dots.json');
        const callback = (json, error) => {
            expect(error).toEqual(new PifferoError( "Invalid number has two dots\nLine: 3\nColumn: 16\nChar: 46"));
            done();
          };
        const result  = Piffero.findAsString(callback, stream ,'$.error.number');
    });

    it("error", async function(done) {
        const stream = fs.createReadStream('spec/jsonFiles/error.json');
        const callback = (json, error) => {
            expect(error).toEqual(new PifferoError( "Unexpected end\nLine: 5\nColumn: 1\nChar: NaN"));
            done();
          };
        const result  = Piffero.findAsString(callback, stream ,'$.error.number');
    });

});