import { PifferoError } from "../../src/handler/mastehandler";
import { Piffero } from "../../src/piffero";

describe("piffero Error", function() {
    const fs  =  require('fs');


    it("error two dots", function(done) {
        const stream = fs.createReadStream('spec/jsonFiles/error/error-two-dots.json');
        const callback = (json, error) => {
            expect(error).toEqual(new PifferoError( "Invalid number has two dots\nLine: 3\nColumn: 16\nChar: 46"));
            done();
          };
        Piffero.findAsString(callback, stream ,'$.error.number');
    });

    it("error end", function(done) {
        const stream = fs.createReadStream('spec/jsonFiles/error/error.json');
        const callback = (json, error) => {
            expect(error).toEqual(new PifferoError( "Unexpected end\nLine: 5\nColumn: 1\nChar: NaN"));
            done();
          };
        Piffero.findAsString(callback, stream ,'$.error.number');
    });

    it("error", function(done) {
        const stream = fs.createReadStream('spec/jsonFiles/error/error.json');
        const callback = (json, error) => {
            expect(error).toEqual(new PifferoError( "Unexpected end\nLine: 5\nColumn: 1\nChar: NaN"));
            done();
          };
        Piffero.findAsString(callback, stream ,'$.error.number');
    });

});