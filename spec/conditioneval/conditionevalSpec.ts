import { ConditionEval } from "../../src/conditioneval/conditioneval";

describe("ConditionEval", function () {
  it("simple condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd")');
  });

  it("and condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd" && !.check===false)');
  });

  it("or condition", function () {
    ConditionEval.createCondition('?(!.attribute==="asd" || !.check===true)');
  });
});
