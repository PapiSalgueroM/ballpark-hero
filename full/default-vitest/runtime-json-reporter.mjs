import { JsonReporter } from "file:///home/runner/work/ballpark-hero/ballpark-hero/node_modules/vitest/dist/reporters.js";
import fs from 'node:fs'; import assert from 'node:assert/strict';
export default class extends JsonReporter { async onFinished(files, errors, coverage) {
assert(Array.isArray(files) && Array.isArray(errors), 'CM_BASELINE_ACTUAL_ERROR_ARRAY');
const clean = error => ({name:error?.name??null,message:error?.message??String(error),stack:error?.stack??null});
const fileErrors=files.flatMap(file=>(file.result?.errors??[]).map(error=>({file:file.filepath,...clean(error)})));
fs.writeFileSync(process.env.CM_BASELINE_RUNTIME_JSON, JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors},null,2)+'\n',{flag:'wx'});
await super.onFinished(files, errors, coverage); } }
