import { runNexusSelfTests } from "../lib/nexus/self-test";

const results = runNexusSelfTests();
for (const row of results) {
  console.log(`${row.pass ? "PASS" : "FAIL"}  ${row.name}  ${row.detail}`);
}
if (results.some((row) => !row.pass)) process.exit(1);
