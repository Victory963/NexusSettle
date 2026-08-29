import { runClearingSelfTests } from "../lib/clearing/self-test";

const results = runClearingSelfTests();
for (const row of results) {
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.name}  ${row.detail}`);
}
if (results.some((row) => !row.pass)) process.exit(1);
