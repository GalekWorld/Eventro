import { runAppUrlTests } from "./app-url.test.ts";
import { runAccessControlTests } from "./access-control.test.ts";
import { runCsvTests } from "./csv.test.ts";
import { runRequestSecurityTests } from "./request-security.test.ts";
import { runUploadTests } from "./upload.test.ts";

const suites: Array<{ name: string; run: () => void | Promise<void> }> = [
  { name: "access-control", run: runAccessControlTests },
  { name: "app-url", run: runAppUrlTests },
  { name: "csv", run: runCsvTests },
  { name: "request-security", run: runRequestSecurityTests },
  { name: "upload", run: runUploadTests },
];

let failures = 0;

for (const suite of suites) {
  try {
    await suite.run();
    console.log(`PASS ${suite.name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${suite.name}`);
    console.error(error);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`PASS ${suites.length} suites`);
}
