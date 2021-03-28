# PIFFERO  [![Build Status](https://travis-ci.com/gfiorentino/piffero.svg?branch=master)](https://travis-ci.com/github/gfiorentino/piffero) [![Coverage Status](https://coveralls.io/repos/github/gfiorentino/piffero/badge.svg?branch=master)](https://coveralls.io/github/gfiorentino/piffero?branch=master) [![NPM version](https://img.shields.io/npm/v/piffero.svg)](https://www.npmjs.com/package/piffero)
The ultimate JSON SAX parser 

Piffero is an open source SAX parser who work directely on the streams to get parts of big JSON files.

Piffero can load big files larger than memory used and return the required content in a stream.

```
  ______________________________ .  ♪
=(____|_o_o_o_o_|_o_o_o_o_|*____| |   ♫
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

See the [replit.com demo](https://replit.com/@nigrosimone/Piffero#index.js).
# Get Started

*Step 1*: install Piffero

```bash
npm i piffero
```

*Step 2*: use Piffero

Piffero is easy to use, you only need to call one of the methods:

`findByPath(inputStream: Stream, jsonpath: string): Stream`

or

`findAsString(callback: (result: any, err?: any) => void, inputStream: Stream, jsonpath: string): void`

or

`findAsPromise(stream: Readable, jsonPath: string): Promise<string>`

## Examples

Below there are some examples of use case based on this json file:

#### employees.json
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

### Example: Extract with findByPath()

For example, if you want extract the second employees "Joe Black", you need to call `findByPath` with the json path `$.employees[1]`, eg:

```js
const piffero = require('piffero');
const fs = require('fs');

// create read stream of json
const inputStream = fs.createReadStream('./employees.json');
// pass the stream to Piffero with the json path
const resultStream = piffero.Piffero.findByPath(inputStream, "$.employees[1]");

// trasform the stream to string and print into console
const resultString = '';
resultStream.on('data', chunk => resultString += chunk.toString());
resultStream.on('end', () => console.log(resultString));
```
#### console result 
```js
[{"name":"Joe","surname":"Black","phoneNumbers":[]}]
```

### Example: Extract with findByString()

Otherwise, if you want the second phone number of the first employees, you need to call `findByPath` with the json path `$.employees[0].phoneNumbers[1]`, eg:

```js
const piffero = require('piffero');
const fs = require('fs');

// create read stream of json
const inputStream = fs.createReadStream('./employees.json');
// pass the stream to Piffero with the json path
piffero.Piffero.findAsString((result, err) => console.log(result), inputStream, '$.employees[0].phoneNumbers[1]');
```
#### console result 
```js
[{"type":"home","number":"0123-4567-8910","test":true}]
```

### Example: Extract with findByPath() in Express.js with Typescript

```ts
import * as fs from "fs";
import * as express from "express";
import { Piffero } from "piffero";

const app: express.Application = express();

app.get("/api/:jsonPath", (req, res) => {
  
  const jsonPath: string = req.params.jsonPath;
  const inputStream: fs.ReadStream = fs.createReadStream('./employees.json');
  const resultStream = Piffero.findByPath(inputStream, jsonPath);
  
  res.setHeader("Content-Type", "application/json");
  resultStream.pipe(res);
});

app.listen(3000, () => {
  console.log("Open your browser at: http://localhost:3000/api/$.employees[0].phoneNumbers[1]");
});
```

## PERFORMANCE
benchmarck tests was done to compare piffero with [Oboe](https://github.com/jimhigson/oboe.js)  
using [benchmark](https://www.npmjs.com/package/benchmark)
Hardware: i7-4510U 12GB RAM

### jsonpath in the end of a 38 MB file 

parser             | ops/secc                                                      |runs sampled
-------------------|---------------------------------------------------------------|------------
Piffero (stream)   |  1.0186262222075857 ops/sec                                   | 10 
Piffero (string)   |  1.1235041104521386 ops/sec                                   | 10 
Oboe               |  0.4287069078285109 ops/sec                                   | 7 

### jsonpath in the midle of the 38 MB file

parser             | ops/secc                                                      |runs sampled
-------------------|---------------------------------------------------------------|------------
Piffero (stream)   |  2.192788691917704 ops/sec                                    | 17 
Piffero (string)   |  2.4804025718178084 ops/sec                                   | 16 
Oboe               |  0.5590235602555842 ops/sec                                   | 7 

### jsonpath in the first part of the 38 MB file
                 
parser             | ops/secc                                                      |runs sampled
-------------------|---------------------------------------------------------------|------------
Piffero (stream)   |  206.17873294205398 ops/sec                                   | 68 
Piffero (string)   |  652.333851058612 ops/sec                                     | 42 
Oboe               |  7.3452430736806225 ops/sec                                   | 7 


## Other tools
* Piffero is built on [Clarinet](https://github.com/dscape/clarinet) 
* You can try [Oboe](https://github.com/jimhigson/oboe.js)  
* You can also try [JSONPath Online Evaluator](https://jsonpath.com/)

enjoy Piffero!!
