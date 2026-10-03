# Shot lab source scanner repair

2026-10-03. PR115 accepted and merged as
`5b254e19702b672381815009b0d26e858b5f233a`, from
`899466b4acf8affab833784b1ffa3fc4a2429766`.

The Release Z scanner finding was real, but its reported cause was incomplete.
The Shot lab mutation read already normalizes CRLF. The scanner conservatively
treated two raw Buffer reads, used only to preserve original file bytes, as
possible mutation source. Keeping each Buffer inside its verifier closure uses
the established harness pattern while retaining the exact byte comparison.
No app code, scanner rule, outcome assertion or mutation anchor changed.

## Accepted proof

Targeted [run37127167421](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37127167421)
passed with an independently reviewed artifact:

- The actual pinned original harness reproduces exactly two raw-read findings.
- The fixed scanner passes612 parse checks,150 anchor harnesses and162 normalized reads.
- Removing only the actual mutation normalizer produces exactly one intended
  raw-read finding and161 normalized reads. The guard still detects the defect.
- Eight real source inputs were converted to CRLF in the disposable remote
  checkout. All eight LF/CRLF hash pairs were independently checked and differ.
- All15 normal outcomes pass. The16 controls produce17 mapped assertion
  failures and32 passing original-mode baselines. The duplicate-release control
  intentionally checks two cases, reduced motion false and true; the other15
  controls each check one failing case. There are no unexpected failures.
- All eight raw inputs stay byte-identical through each of17 modes. Original
  checkout bytes are restored by the proof's finally block; the successful run
  independently confirms that restoration.

Artifact11275012718 was downloaded and SHA256 verified:
`7f6cfbab2d8fc7ec15b0c348faaecbb45835a6919434e9835fff9e96e958d8fb`.
Evidence: `C:/Users/antho/AppData/Local/Temp/dukb-shot-lab-windows-ci-2026-10-03/899466b4/evidence/`.
This is execution on Ubuntu with real CRLF inputs, not a native Windows run.

The existing full [Shot lab run37127167384](https://github.com/PapiSalgueroM/ballpark-hero/actions/runs/37127167384)
also passed types/build, the mounted cases and controls, original arcade modes,
all built readers and native phone/keyboard play. Both workflows checked
`b8cbc105fa27d6f4b754c6efe6e956a5401598a7`, tree
`822c185805cf2e55fe0c4cdb05232edf8f03f9e4`, with parents accepted mainb1b8a289
and repair899466b4. The later accepted rugby mainba7708f8 changes no Shot lab
runtime input, harness, scanner, workflow or native script. Its changes do not
overlap this repair's three files. The actual final merge adds only those three
verification files over the accepted product tree; app source is unchanged.

Full workflow artifact11275628654 metadata reports SHA256
`13e077499a5bb2221f675e63f5d556b0e8acffa02849f11d9a96d76d0413328c`.
That duplicate product artifact was not downloaded or newly visually reviewed;
the targeted proof artifact was independently audited. No local runtime gates
or production database probes were performed.
