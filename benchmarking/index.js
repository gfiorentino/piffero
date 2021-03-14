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
var JSON_PATH = '[5].tags[2]';

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
.on('complete', function () {
    console.log('###########################################');
    for (var i = 0; i < this.length; i++) {
        console.log(this[i].name + " " + this[i].hz + " ops/sec ("+ this[i].stats.sample.length +" runs sampled)");
    }
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    console.log('Slowest is ' + this.filter('slowest').map('name'));
})
.run()
