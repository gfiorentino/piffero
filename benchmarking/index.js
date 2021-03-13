/**
 * RUN TEST: node index.js
 */

var fs = require("fs");
var performance = require('perf_hooks').performance;

// JsonPath streaming libs
var oboe = require('./oboe-node.js');
var Piffero = require('../dist/index.js').Piffero;

// config
var JSON_FILE = '../spec/jsonFiles/large.json';
var JSON_PATH = '[2].tags[2]';

// test library ...

function oboeTest() {
    var t0 = performance.now();
    oboe(fs.createReadStream(JSON_FILE)).node(JSON_PATH, function (result) {
        this.abort();
        console.log('oboe time', performance.now() - t0, 'result', result);
    });
}

function pifferoTest() {
    var t0 = performance.now();
    Piffero.findAsString(function (result) {
            console.log('Piffero time', performance.now() - t0, 'result', result);
        },  
        fs.createReadStream(JSON_FILE), 
        '$' + JSON_PATH
    );
}

// run test ...

var testMethods = [oboeTest, pifferoTest];

testMethods.forEach(function(method) {
    method();
});