import { streamToString } from "../utils";
import { Piffero } from "../../src/piffero";

describe("piffero large", function () {
  const results = require("./results");
  const fs = require("fs");
  let stream;
  beforeEach(function () {
    stream = fs.createReadStream("spec/jsonFiles/large.json");
  });

  it("no jsonpath", async function (done) {
    const result = Piffero.findByPath(stream);
    const string = await streamToString(result);
    expect(JSON.stringify(JSON.parse(string))).toBe(results.SIMPLE_JSON_LARGE);
    done();
  });

  it("no jsonpath as string", async function (done) {
    const callback = (json) => {
      expect(JSON.stringify(JSON.parse(json))).toBe(results.SIMPLE_JSON_LARGE);
      done();
    };
    Piffero.findAsString(callback, stream);
  });

  
  it("simple jsonpath", async function (done) {
    const result = Piffero.findByPath(stream, "$");
    const string = await streamToString(result);
    expect(JSON.stringify(JSON.parse(string))).toBe(results.SIMPLE_JSON_LARGE);
    done();
  });

  it("simple jsonpath as string", async function (done) {
    const callback = (json) => {
      expect(JSON.stringify(JSON.parse(json))).toBe(results.SIMPLE_JSON_LARGE);
      done();
    };
    Piffero.findAsString(callback, stream, "$");
  });

  it("simple jsonpath array", async function (done) {
    const callback = (json) => {
      expect(JSON.stringify(JSON.parse(json))).toBe(results.SIMPLE_JSON_ARRAY);
      done();
    };
    Piffero.findAsString(callback, stream, "$[1]");
  });

  it("simple jsonpath array as string", async function (done) {
    const result = Piffero.findByPath(stream, "$[1]");
    const string = await streamToString(result);
    expect(string).toBe(results.SIMPLE_JSON_ARRAY);
    done();
  });

  it("simple jsonpath array", async function () {
    const result = Piffero.findByPath(stream, "$[2].tags");
    const string = await streamToString(result);
    expect(string).toBe('[["cillum","fugiat","ad","cillum","eu"]]');
  });

  it("simple jsonpath array primitive", async function () {
    const result = Piffero.findByPath(stream, "$[2].tags[1:2]");
    const string = await streamToString(result);
    expect(string).toBe('["fugiat"]');
  });
});
