/**
 * RUN TEST: node index.js
 */

var fs = require("fs");
var performance = require('perf_hooks').performance;
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite;


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

// run test ...

suite.add('oboe', {
    defer: true,
    fn: function (deferred) {
      
        oboe(fs.createReadStream(JSON_FILE)).node(JSON_PATH, function (result) {
            this.abort();
            deferred.resolve();
        });

    }
})
.add('Piffero', {
    defer: true,
    fn: function (deferred) {
      
        Piffero.findAsString(function (result) {
                deferred.resolve();
            },  
            fs.createReadStream(JSON_FILE), 
            '$' + JSON_PATH
        );

    }
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.on('complete', function () {
    // console.log(this[0].stats)
    console.log('Fastest is ' + this.filter('fastest').map('name'));
})
.run()
