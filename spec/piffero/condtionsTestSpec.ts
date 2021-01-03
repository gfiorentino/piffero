import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";

describe("piffero john-doe", function() {
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/test.json');
    });

    it("simple jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.array[?(@.a===2)]')
      const string: string = await streamToString(result);
      expect(string).toBe(JSON.stringify([{"id":1,"type":"\"iPhone\"","number":"0123-4567-8888","test":false,"a":2}]));
      JSON.parse(string)
    }); 

    
}); 

