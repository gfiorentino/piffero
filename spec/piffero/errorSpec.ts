import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";

describe("piffero error", function() {
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/error.json');
    });
 
    it("attribute element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1].number')
      expect(async() => {await streamToString(result);}).toThrow(new Error('Malformed object key should start with "'));
    });

}); 

