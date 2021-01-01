import { ConditionEval } from "../../src/conditioneval/conditioneval";

describe("ConditionEval", function () {
  it("simple condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd")');
    // TODO assert
  });

  it("and condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd" && !.check===false)');
    // TODO assert
  });

  it("or condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd" || !.check===true)');
    // TODO assert
  });

  it("or condition", function () {
    const result = ConditionEval.createCondition('?(!.attribute===1+2 || !.check===true)');
    console.log(result)
  });
})
