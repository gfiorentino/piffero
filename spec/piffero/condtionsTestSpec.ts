import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";

describe("piffero array", function() {
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/test.json');
    });

    it("simple jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.array[?(@.a===2)]')
      const string: string = await streamToString(result);
      expect(string).toBe(JSON.stringify([{"id":1,"type":"iPhone","a":2},{"id":3,"type":"home","a":2,"b":3}]));
      JSON.parse(string);
    }); 

    it("simple jsonpath 2", async function() {
      const result = Piffero.findByPath(stream, '$.array[?(@.a===2)].type')
      const string: string = await streamToString(result);
      expect(string).toBe(JSON.stringify(["iPhone","home"]));
      JSON.parse(string);
    });     
}); 

