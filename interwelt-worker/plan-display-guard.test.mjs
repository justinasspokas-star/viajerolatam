import test from "node:test";
import assert from "node:assert/strict";
import { approvedForDisplay, PLAN_DISPLAY_RULES } from "./plan-display-guard.mjs";

const trip=(age, days) => ({ages: Array.isArray(age)?age:[age], days});
const allowed=(id,name,age,days) => approvedForDisplay({id,name},trip(age,days));

test("all seven confirmed plans have documented upper age and duration limits",()=>{
  assert.equal(Object.keys(PLAN_DISPLAY_RULES).length,7);
  for(const [id,rule] of Object.entries(PLAN_DISPLAY_RULES)){
    assert.equal(allowed(Number(id),rule.name,rule.maxAge,rule.maxDays),true,rule.name);
    assert.equal(allowed(Number(id),rule.name,rule.maxAge+1,rule.maxDays),false,rule.name+" age");
    assert.equal(allowed(Number(id),rule.name,rule.maxAge,rule.maxDays+1),false,rule.name+" duration");
    assert.equal(allowed(Number(id),rule.name,rule.maxAge,rule.minDays),true,rule.name+" start");
    if(rule.minDays>1)assert.equal(allowed(Number(id),rule.name,30,rule.minDays-1),false,rule.name+" minimum stay");
  }
});

test("entire party must comply: an older traveler cannot inherit the younger person's plan",()=>{
  assert.equal(allowed(209,"INTERWELT 100",[30,74],15),true);
  assert.equal(allowed(209,"INTERWELT 100",[30,75],15),false);
  assert.equal(allowed(207,"INTERWELT 40",[30,85],120),true);
  assert.equal(allowed(207,"INTERWELT 40",[30,86],120),false);
  assert.equal(allowed(206,"SOMOS EUROPA*",[20,99],365),true);
  assert.equal(allowed(206,"SOMOS EUROPA*",[20,100],365),false);
});

test("long-trip products only begin at day 30 even when overall search supports 365 days",()=>{
  for(const id of [221,225]){
    const name=PLAN_DISPLAY_RULES[id].name;
    assert.equal(allowed(id,name,30,29),false);
    assert.equal(allowed(id,name,30,30),true);
    assert.equal(allowed(id,name,30,365),true);
    assert.equal(allowed(id,name,30,366),false);
  }
  assert.equal(allowed(205,"ESTELAR",30,90),true);
  assert.equal(allowed(205,"ESTELAR",30,91),false);
  assert.equal(allowed(208,"INTERWELT 60",74,120),true);
  assert.equal(allowed(208,"INTERWELT 60",75,120),false);
});

test("unknown plans or mismatched names are not published until reviewed",()=>{
  assert.equal(allowed(205,"ANOTHER PRODUCT",30,14),false);
  assert.equal(allowed(9999,"NEW EXPERIMENTAL PLAN",30,14),false);
  assert.equal(allowed(206,"  somos   europa*  ",30,14),true);
  assert.equal(allowed(206,"SOMOS EUROPA X",30,14),false);
  assert.equal(approvedForDisplay(null,trip(30,14)),false);
  assert.equal(approvedForDisplay({id:206,name:"SOMOS EUROPA*"},{days:14,ages:[]}),false);
});

test("the guard never adds a 75+ surcharge; live API price must remain untouched",()=>{
  const p={id:206,name:"SOMOS EUROPA*",total:123.45};
  assert.equal(approvedForDisplay(p,trip(75,20)),true);
  assert.equal(p.total,123.45);
});
