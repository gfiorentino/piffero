import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";

describe("piffero john-doe", function() {
    const fs  =  require('fs');
    let stream
    beforeEach( function() {   
      stream = fs.createReadStream('spec/jsonFiles/john-doe.json');
    });

    it("simple jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.firstName')
      const string: string = await streamToString(result);
      expect(string).toBe('["John"]');
      JSON.parse(string)
    
    }); 

    it("simple jsonpath lastname", async function() {
      
      const result = Piffero.findByPath(stream, '$.lastName')
      const string = await streamToString(result);
      expect(string).toBe('["doe"]');
      JSON.parse(string)
    }); 

    it("simple jsonpath diacriticals", async function() {
      const result = Piffero.findByPath(stream, '$.diacriticals')
      const string = await streamToString(result);
      expect(string).toBe('["áÇÂôÜ"]');
      JSON.parse(string)
    });
  

    it("simple jsonpath character", async function() {
      const result = Piffero.findByPath(stream, '$.character')
      const string = await streamToString(result);
      expect(string).toBe('["£$%&/()"]');
      JSON.parse(string)
    }); 

    
    it("array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers')
      const string = await streamToString(result);
      expect(string).toBe(JSON.stringify([[{"id":1,"type":"\"iPhone\"","number":"0123-4567-8888","test":false},{"id":3,"type":"home","number":"0123-4567-8910","test":true}]]));
      JSON.parse(string);
    }); 

    it("element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1]')
      const string = await streamToString(result);
      expect(string).toBe('[{"id":3,"type":"home","number":"0123-4567-8910","test":true}]');
      JSON.parse(string);
    });

    it("element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.type==="home")]')
      const string = await streamToString(result);
      expect(string).toBe('[{"id":3,"type":"home","number":"0123-4567-8910","test":true}]');
      JSON.parse(string);
    });


    it("element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.type==="home")].number')
      const string = await streamToString(result);
      expect(string).toBe('["0123-4567-8910"]');
      JSON.parse(string);
    });

    it("simple jsonpath chinese chinese", async function() {
      const result = Piffero.findByPath(stream, '$.普派')
      const string = await streamToString(result);
      expect(string).toBe('["普派"]');
      JSON.parse(string)
    }); 

    it("simple jsonpath chinese", async function() {
      const result = Piffero.findByPath(stream, '$.chinese')
      const string = await streamToString(result);
      expect(string).toBe('["普派是"]');
      JSON.parse(string)
    }); 

    it("element in an array jsonpath 2", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[0]')
      const string = await streamToString(result);
      expect(string).toBe(JSON.stringify([{"id":1,"type":"\"iPhone\"","number":"0123-4567-8888","test":false}]));
      JSON.parse(string);
    });
 
    it("attribute element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1].number')
      const string = await streamToString(result);
      expect(string).toBe('["0123-4567-8910"]');
      JSON.parse(string);
    });

    it("attribute boolean element in an array jsonpath", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[1].test')
      const string = await streamToString(result);
      expect(string).toBe('[true]');
      JSON.parse(string);
    });

    it("array in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array')
      const string = await streamToString(result);
      expect(string).toBe('[[[1,2],[3,4]]]');
      JSON.parse(string);
    });

    it("array element in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array[0]')
      const string = await streamToString(result);
      expect(string).toBe('[[1,2]]');
      JSON.parse(string);
    });

    it("array element in an array ", async function() {
      const result = Piffero.findByPath(stream, '$.array[1]')
      const string = await streamToString(result);
      expect(string).toBe('[[3,4]]');
      JSON.parse(string);
    });


    it("element in an array jsonpath with eval", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.id===3)]')
      const string = await streamToString(result);
      expect(string).toBe('[{"id":3,"type":"home","number":"0123-4567-8910","test":true}]');
      JSON.parse(string);
    });

    it("element in an array jsonpath with eval", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.id===1+2)]')
      const string = await streamToString(result);
      expect(string).toBe('[{"id":3,"type":"home","number":"0123-4567-8910","test":true}]');
      JSON.parse(string);
    });

    it("element in an array jsonpath with eval2", async function() {
      const result = Piffero.findByPath(stream, '$.phoneNumbers[?(@.id===1*3-2)]')
      const string = await streamToString(result);
      expect(string).toBe(JSON.stringify([{"id":1,"type":"\"iPhone\"","number":"0123-4567-8888","test":false}]));
      JSON.parse(string);
    });

}); 

