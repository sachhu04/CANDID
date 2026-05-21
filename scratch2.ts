const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getKeywordRegex = (k: string) => {
  let p = escapeRegex(k);
  if (/^[a-z0-9_]/i.test(k)) p = "\\b" + p;
  if (/[a-z0-9_]$/i.test(k)) p = p + "\\b";
  return new RegExp(p, "i");
};

console.log("c++ developer matches c++:", getKeywordRegex("c++").test("c++ developer"));
console.log("abc++ matches c++:", getKeywordRegex("c++").test("abc++"));
console.log("next.js matches next.js:", getKeywordRegex("next.js").test("next.js"));
console.log("next.json matches next.js:", getKeywordRegex("next.js").test("next.json"));
console.log("scalable matches scala:", getKeywordRegex("scala").test("scalable"));
console.log("scala matches scala:", getKeywordRegex("scala").test("scala"));
