import { PATH_ERROR_MESSAGE, PifferoJsonPathError } from './../../src/handler/mastehandler';



describe("JsonPath", function() {
    const parse = require('../../src/handler/mastehandler').parse;

    it("simple jsonpath", function() {
      const result = parse('$.first.second')
      //demonstrates use of custom matcher
      expect(result.value).toBe('"$"');
      let next = result.next;
      expect(next.value).toBe('"first"');
      let next2 = next.next;
      expect(next2.value).toBe('"second"'); 
    });

    it("simple jsonpath exception", function() {
      const jsonPath = '$.second]';
      expect(function() {parse(jsonPath)})
        .toThrow(new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`));
    });

    it("simple jsonpath exception", function() {
      const jsonPath = 'second';
      expect(function() {parse(jsonPath)})
        .toThrow(new PifferoJsonPathError(`${PATH_ERROR_MESSAGE}: ${jsonPath}`));
    });

   it("simple jsonpath with index", function() {
      const result = parse('$.first[1].second[2]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('"$"');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('"first"');
        expect(next.range.start).toBe(1);
 
        expect(next2.value).toBe('"second"'); 
        expect(next2.range.start).toBe(2);
    })


    it("simple jsonpath wiith index", function() {
      const result = parse('$.first[1].second[?(@.attribute==="asd")]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('"$"');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('"first"');
        expect(next.range.start).toBe(1);
        
        expect(next2.value).toBe('"second"'); 
        expect(next2.condition).toEqual({key:`"attribute"`, value:'"asd"'});
    })


    it("simple jsonpath wiith index", function() {
      
      const result = parse('$.first[?(@.att===21)].second[?(@.attribute==="asd")]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('"$"');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('"first"');
        expect(next.condition).toEqual({key:`"att"`, value:'21'});
 
        expect(next2.value).toBe('"second"'); 
        expect(next2.condition).toEqual({key:`"attribute"`, value:'"asd"'});
    })


    it("simple jsonpath wiith expression eval ", function() {
      
      const result = parse('$.first[?(@.att===21+3*2)].second[?(@.attribute==="asd")]')
        //demonstrates use of custom matcher
        expect(result.value).toBe('"$"');
        let next = result.next;
        let next2 = next.next;
        expect(next.value).toBe('"first"');
        expect(next.condition).toEqual({key:`"att"`, value:'27'});
 
        expect(next2.value).toBe('"second"'); 
        expect(next2.condition).toEqual({key:`"attribute"`, value:'"asd"'});
    })
  
 });
  