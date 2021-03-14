# PIFFERO  [![Build Status](https://travis-ci.com/gfiorentino/piffero.svg?branch=master)](https://travis-ci.com/github/gfiorentino/piffero) [![Coverage Status](https://coveralls.io/repos/github/gfiorentino/piffero/badge.svg?branch=master)](https://coveralls.io/github/gfiorentino/piffero?branch=master) [![NPM version](https://img.shields.io/npm/v/piffero.svg)](https://www.npmjs.com/package/piffero)
The ultimate JSON SAX parser 

Piffero is an open source SAX parser who work directely on the streams to get parts of big JSON files.

Piffero can load big files larger than memory used and return the required content in a stream.

``` 
  ______________________________ . 
=(____|_o_o_o_o_|_o_o_o_o_|*____| |
                                 '
```
# Description

The version 1.0.0 only support the full qualified JSONpath

example: `$.father.son.array[:index].attribute`

The sintax that will be implemented in the next future and the examples from [Stefan Goessner's post](http://goessner.net/articles/JsonPath/) 

JSONPath           | Description                                                          |Implemented
-------------------|----------------------------------------------------------------------|------------
`$`                | The root object/element                                              | ✅
`@`                | The current object/element                                           | 
`.`                | Child member operator                                                | ✅
`..`	             | Recursive descendant operator; JSONPath borrows this syntax from E4X | 
`*`	             | Wildcard matching all objects/elements regardless their names        | 
`[]`	             | Subscript operator                                                   | ✅ 
`[,]`	             | Union operator for alternate names or array indices as a set         | 
`[start:end:step]` | Array slice operator borrowed from ES4 / Python                      | 
`?()`              | Applies a filter (script) expression via static evaluation           |  
`()`	             | Script expression via static evaluation                              |  


# Get Started

*Step 1*: install `piffero`

```bash
npm i piffero
```

*Step 2*: use `piffero`

Piffero is easy to use, you only need to call one of the methods:

`findByPath(inputStream: Stream, jsonpath: string): Stream`

or

`findAsString(callback: (result: any, err?: any) => void, inputStream: Stream, jsonpath: string)`

## Examples

For example, if you have this json:

#### empoyees.json
```js
{
   "employees":[
      {
         "name":"John",
         "surname":"Doe",
         "phoneNumbers":[
            {
               "type":"iPhone",
               "number":"0123-4567-8888",
               "test":false
            },
            {
               "type":"home",
               "number":"0123-4567-8910",
               "test":true
            }
         ]
      },
      {
         "name":"Joe",
         "surname":"Black",
         "phoneNumbers":[
         ]
      }
   ]
}
```

and you want extract the second employees "Joe Black", you need to call `findByPath` with the json path `$.employees[1]`, eg:

```js
const piffero = require('piffero');
const fs = require('fs');

// create read stream of json
const inputStream = fs.createReadStream('employees.json');
// pass the stream to Piffero with the json path
const resultStream = piffero.Piffero.findByPath(inputStream, "$.employees[1]");

// trasform the stream to string and print into console
const chunks = [];
resultStream.on('data', chunk => chunks.push(chunk));
resultStream.on('end', () => console.log(Buffer.concat(chunks).toString('utf8'));
```
#### console result 
```js
[{"name":"Joe","surname":"Black","phoneNumbers":[]}]
```

Otherwise, if you want the second phone number of tje first employees, you need to call `findByPath` with the json path `$.employees[0].phoneNumbers[1]`, eg:

```js
const piffero = require('piffero');
const fs = require('fs');

// create read stream of json
const inputStream = fs.createReadStream('employees.json');
// pass the stream to Piffero with the json path
const resultStream = piffero.Piffero.findPath(inputStream, '$.employees[0].phoneNumbers[1]');

// trasform the stream to string and print into console
const chunks = [];
resultStream.on('data', chunk => chunks.push(chunk));
resultStream.on('end', () => console.log(Buffer.concat(chunks).toString('utf8'));
```
#### console result 
```js
[{"type":"home","number":"0123-4567-8910","test":true}]
```
## Other tools
* Piffero is built on [Clarinet](https://github.com/dscape/clarinet) 
* You can try [Oboe](https://github.com/jimhigson/oboe.js)  
* You can also try [JSONPath Online Evaluator](https://jsonpath.com/)

enjoy piffero!!
