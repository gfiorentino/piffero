import { streamToString } from "../utils";

describe("piffero john-doe", function() {
  const Piffero = require('../../src/piffero').Piffero;
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/john-doe.json','utf8');
    });

    it("simple jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.firstName')
      const string: string = await streamToString(result);
      expect(string).toBe('"John"');
      JSON.parse(string)
    
    }); 

    it("simple jsonpath lastname", async function() {
      
      const result = Piffero.findByPath(stream, '$.lastName')
      const string = await streamToString(result);
      expect(string).toBe('"doe"');
      JSON.parse(string)
    }); 

    it("simple jsonpath diacriticals", async function() {
      const result = Piffero.findByPath(stream, '$.diacriticals')
      const string = await streamToString(result);
      expect(string).toBe('"áÇÂôÜ"');
      JSON.parse(string)
    });
  

    it("simple jsonpath character", async function() {
      const result = Piffero.findByPath(stream, '$.character')
      const string = await streamToString(result);
      expect(string).toBe('"£$%&/()"');
      JSON.parse(string)
    }); 

    
    it("array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers')
      const string = await streamToString(result);
      expect(string).toBe(JSON.stringify([{"type":"\"iPhone\"","number":"0123-4567-8888","test":false},{"type":"home","number":"0123-4567-8910","test":true}]));
      JSON.parse(string);
    }); 

    it("element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1]')
      const string = await streamToString(result);
      expect(string).toBe('{"type":"home","number":"0123-4567-8910","test":true}');
      JSON.parse(string);
    });

    it("element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.type==="home")]')
      const string = await streamToString(result);
      expect(string).toBe('{"type":"home","number":"0123-4567-8910","test":true}');
      JSON.parse(string);
    });

    it("simple jsonpath chinese chinese", async function() {
      const result = Piffero.findByPath(stream, '$.普派')
      const string = await streamToString(result);
      expect(string).toBe('"普派"');
      JSON.parse(string)
    }); 

    it("simple jsonpath chinese", async function() {
      const result = Piffero.findByPath(stream, '$.chinese')
      const string = await streamToString(result);
      expect(string).toBe('"普派是"');
      JSON.parse(string)
    }); 

    it("element in an array jsonpath 2", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[0]')
      const string = await streamToString(result);
      expect(string).toBe(JSON.stringify({"type":"\"iPhone\"","number":"0123-4567-8888","test":false}));
      JSON.parse(string);
    });
 
    it("attribute element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1].number')
      const string = await streamToString(result);
      expect(string).toBe('"0123-4567-8910"');
      JSON.parse(string);
    });

    it("attribute boolean element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1].test')
      const string = await streamToString(result);
      expect(string).toBe('true');
      JSON.parse(string);
    });

    it("array in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array')
      const string = await streamToString(result);
      expect(string).toBe('[[1,2],[3,4]]');
      JSON.parse(string);
    });

    it("array element in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array[0]')
      const string = await streamToString(result);
      expect(string).toBe('[1,2]');
      JSON.parse(string);
    });

    it("array element in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array[1]')
      const string = await streamToString(result);
      expect(string).toBe('[3,4]');
      JSON.parse(string);
    });
}); 

