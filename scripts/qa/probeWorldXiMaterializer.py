"""Probe only the fixed held World XI input materializer in an isolated copy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import time
import traceback

PREFIX = ".qa-inputs/world-xi-held-archive-v1"
MATERIALIZER_BYTES = 6647
MATERIALIZER_SHA = "6e14e947e667921ab0e3f84b6940765a3b636e0b5704a807951479cce17c7b6f"
CARRIER_BYTES = 13270
CARRIER_SHA = "e13ce518fb7f2d59b0a2c4732d625f79f0ff57c851c1149b92d61e194ca41d24"
PASS_LINE = "WORLD_XI_INPUT PASS: 8 parts, 61 exact members, 5729392 raw bytes, outside checkout"
HEADLINE = re.compile(
    r"^(?:[A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception)|KeyboardInterrupt|SystemExit)(?::[^\r\n]*)?$",
    re.MULTILINE,
)


def require(condition, message):
    if not condition:
        raise AssertionError("WORLD_XI_MATERIALIZER_PROBE " + message)


def pin(body):
    return {
        "bytes": len(body),
        "sha256": hashlib.sha256(body).hexdigest(),
        "gitBlob": hashlib.sha1(("blob " + str(len(body)) + "\0").encode() + body).hexdigest(),
    }


def under(path, root):
    return path == root or root in path.parents


def regular(path):
    require(
        path.is_file() and not path.is_symlink() and path.resolve(strict=True) == path,
        "regular exact input path: " + str(path),
    )
    return path.read_bytes()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--materializer", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()
    root = args.source_root.resolve(strict=True)
    materializer = args.materializer.absolute()
    out = args.out.absolute()
    require(root.is_dir(), "source root directory")
    require(materializer == materializer.resolve(strict=True), "materializer exact resolved path")
    require(under(materializer, root), "held materializer belongs to source checkout")
    require(not args.out.is_symlink() and not out.exists(), "fresh output")
    require(out == out.resolve() and out.parent.is_dir(), "existing resolved output parent")
    require(not under(out, root), "output outside source checkout")
    out.mkdir()
    copy_root = out / "copy-root"
    summary = {
        "schemaVersion": 1,
        "status": "FAIL",
        "scope": "Fixed held input materialization only. No App, game, live roster or network proof.",
        "python": sys.version,
        "sourceRoot": str(root),
        "output": str(out),
        "children": [],
        "controls": [],
        "expected": {"children": 3, "ownedRefusals": 2, "healthyMaterializations": 1},
        "primaryError": None,
        "cleanupError": None,
        "sourceInputsHeld": False,
        "copyRootRemoved": False,
    }
    primary = None
    originals = {}
    source_inputs = []
    copied_before = None
    part = None
    part_body = None
    part_mode = None

    def retain(relative, body):
        target = out / relative
        require(under(target, out), "evidence path confinement")
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(body)
        require(target.read_bytes() == body, "retained evidence readback")
        return {"file": relative, **pin(body)}

    def retain_json(relative, value):
        return retain(relative, (json.dumps(value, indent=2, ensure_ascii=False) + "\n").encode())

    def first_error(error):
        nonlocal primary
        if primary is None:
            primary = error
            summary["primaryError"] = {
                "type": type(error).__name__,
                "message": str(error),
                "stack": "".join(traceback.format_exception(error)),
            }
            summary["primaryErrorEvidence"] = retain_json("primary-error.json", summary["primaryError"])

    def describe(path):
        info = path.lstat()
        result = {
            "kind": "symlink" if stat.S_ISLNK(info.st_mode) else "regular" if stat.S_ISREG(info.st_mode) else "other",
            "mode": stat.S_IMODE(info.st_mode),
        }
        if stat.S_ISLNK(info.st_mode):
            result["linkTarget"] = os.readlink(path)
        return result

    def copy_census():
        names = sorted(path.relative_to(copy_root).as_posix() for path in copy_root.rglob("*") if path.is_file())
        require(names == sorted(originals), "copy contains only nine carrier files")
        rows = []
        for name in names:
            path = copy_root / name
            rows.append({"file": name, **describe(path), **pin(regular(path))})
        return rows

    def restore_part():
        require(part.parent.resolve(strict=True) == part.parent, "restore parent exact")
        if part.is_symlink() or part.exists():
            require(part.is_symlink() or part.is_file(), "restore only owned part leaf")
            part.unlink()
        with part.open("xb") as stream:
            stream.write(part_body)
        part.chmod(part_mode)
        require(regular(part) == part_body, "exact part body restored")
        require(describe(part) == {"kind": "regular", "mode": part_mode}, "exact regular part type restored")

    def child(label, expected, destination, receipt):
        directory = out / "children" / label
        directory.mkdir(parents=True)
        argv = [
            sys.executable, str(materializer),
            "--carrier", str(copy_root / PREFIX / "carrier.json"),
            "--dest", str(destination),
            "--receipt", str(receipt),
        ]
        invocation = {"argv": argv, "cwd": str(copy_root), "expected": expected}
        invocation_pin = retain_json("children/" + label + "/argv.json", invocation)
        started = time.perf_counter()
        try:
            result = subprocess.run(argv, cwd=copy_root, capture_output=True, check=False)
        except BaseException as error:
            retain_json("children/" + label + "/spawn-error.json", {
                "type": type(error).__name__, "message": str(error),
                "stack": "".join(traceback.format_exception(error)),
            })
            raise
        duration = (time.perf_counter() - started) * 1000
        stdout_pin = retain("children/" + label + "/stdout.log", result.stdout)
        stderr_pin = retain("children/" + label + "/stderr.log", result.stderr)
        process_record = {"returncode": result.returncode, "durationMilliseconds": duration}
        process_pin = retain_json("children/" + label + "/process.json", process_record)
        text = result.stderr.decode("utf-8", errors="strict")
        headlines = HEADLINE.findall(text)
        record = {
            "label": label, "expected": expected, "argv": invocation_pin,
            "process": process_pin, **process_record,
            "stdout": stdout_pin, "stderr": stderr_pin,
            "nativeHeadlines": headlines,
            "firstNativeHeadline": headlines[0] if headlines else None,
            "destination": str(destination), "receipt": str(receipt),
            "destinationExists": destination.exists(), "receiptExists": receipt.exists(),
        }
        summary["children"].append(record)
        retain_json("children/" + label + "/retained-before-classification.json", record)
        return record, result

    def owned(record, result, marker):
        expected = "AssertionError: WORLD_XI_INPUT " + marker
        require(result.returncode == 1, "owned input refusal exit1")
        require(record["nativeHeadlines"] == [expected], "first and sole native refusal headline: " + marker)
        require(result.stdout == b"", "refusal has no healthy stdout")
        require(not record["destinationExists"] and not record["receiptExists"], "refused before output creation")
        record["primaryOwned"] = True
        record["ownedHeadline"] = expected

    try:
        materializer_body = regular(materializer)
        require(len(materializer_body) == MATERIALIZER_BYTES and pin(materializer_body)["sha256"] == MATERIALIZER_SHA, "exact V2 materializer source")
        controller_path = Path(__file__).absolute()
        controller_body = regular(controller_path)
        source_inputs.extend([
            (materializer, materializer_body, "materializer"),
            (controller_path, controller_body, "controller"),
        ])
        summary["materializer"] = {"path": str(materializer), **pin(materializer_body)}
        summary["controller"] = {"path": str(controller_path), **pin(controller_body)}
        retain("inputs/materializeWorldXiArchive.py", materializer_body)
        retain("inputs/probeWorldXiMaterializer.py", controller_body)
        carrier_path = root / PREFIX / "carrier.json"
        carrier_body = regular(carrier_path)
        require(len(carrier_body) == CARRIER_BYTES and pin(carrier_body)["sha256"] == CARRIER_SHA, "fixed carrier source")
        carrier = json.loads(carrier_body)
        require(carrier["schemaVersion"] == 1 and len(carrier["parts"]) == 8 and len(carrier["members"]) == 61, "fixed carrier counts")
        require(carrier["archive"] == {
            "bytes": 1440813,
            "sha256": "0b7be9cdaaf631ee3b76cef6eed3e9f74c51a9b1a1b4b70f797f71dd7a66acac",
            "members": 61, "rawBytes": 5729392,
        }, "fixed archive identity")
        originals[PREFIX + "/carrier.json"] = carrier_body
        for index, row in enumerate(carrier["parts"]):
            name = PREFIX + "/part-" + str(index).zfill(2) + ".b64"
            require(row["path"] == name and row["mode"] == "100644" and row["type"] == "blob", "ordered carrier part")
            body = regular(root / name)
            require(len(body) == row["chars"] and pin(body)["gitBlob"] == row["sha"], "source part exact bytes and Git")
            originals[name] = body
        require(len(originals) == 9, "only nine carrier source files")
        for name, body in originals.items():
            source_inputs.append((root / name, body, name))
            retain("inputs/" + Path(name).name, body)
        summary["inputPinsBefore"] = [
            {"label": label, "path": str(path), **pin(body), **describe(path)}
            for path, body, label in source_inputs
        ]
        retain_json("input-pins.before.json", summary["inputPinsBefore"])
        copy_root.mkdir()
        for name, body in originals.items():
            target = copy_root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("xb") as stream:
                stream.write(body)
        copied_before = copy_census()
        retain_json("copy.before.json", copied_before)
        part = copy_root / PREFIX / "part-00.b64"
        part_body = regular(part)
        part_mode = describe(part)["mode"]

        # Byte fault: keep length and structure, require the actual Git/byte guard.
        control = {"id": "part00-byte", "before": pin(part_body)}
        summary["controls"].append(control)
        retain("controls/part00-byte/before.b64", part_body)
        try:
            changed = bytes([part_body[0] ^ 1]) + part_body[1:]
            with part.open("wb") as stream:
                stream.write(changed)
            actual_changed = regular(part)
            control["changed"] = pin(actual_changed)
            control["changedBody"] = retain("controls/part00-byte/changed.b64", actual_changed)
            require(len(actual_changed) == len(part_body) and actual_changed != part_body, "byte control actually changed only payload")
            require(control["changed"]["gitBlob"] != control["before"]["gitBlob"], "byte control changed Git identity")
            record, result = child("part00-byte", "owned-refusal", out / "byte-destination", out / "byte-receipt.json")
            owned(record, result, "part bytes and Git identity")
            control["ownedHeadline"] = record["ownedHeadline"]
        except BaseException as error:
            first_error(error)
            raise
        finally:
            restore_part()
            control["restored"] = pin(regular(part))
            control["restoredBody"] = retain("controls/part00-byte/restored.b64", regular(part))
            control["fullByteInverse"] = control["restored"] == control["before"]
            require(control["fullByteInverse"] and copy_census() == copied_before, "byte control whole copy restored")
            retain_json("controls/part00-byte/control.json", control)

        # Structural fault: retain identical bytes behind a real symlink.
        control = {"id": "part00-symlink", "before": {**describe(part), **pin(regular(part))}}
        summary["controls"].append(control)
        target = out / "controls" / "part00-symlink" / "same-pinned-payload.b64"
        retain("controls/part00-symlink/same-pinned-payload.b64", part_body)
        try:
            part.unlink()
            part.symlink_to(target)
            control["changedLeaf"] = describe(part)
            control["target"] = {"path": str(target), **pin(regular(target))}
            control["followedBytes"] = pin(part.read_bytes())
            require(part.is_symlink() and control["changedLeaf"]["kind"] == "symlink", "structural control actually changed leaf type")
            require(control["followedBytes"] == pin(part_body), "structural fault keeps exact pinned payload")
            retain_json("controls/part00-symlink/changed-before-call.json", control)
            record, result = child("part00-symlink", "owned-refusal", out / "link-destination", out / "link-receipt.json")
            owned(record, result, "regular part path without symlink")
            control["ownedHeadline"] = record["ownedHeadline"]
        except BaseException as error:
            first_error(error)
            raise
        finally:
            restore_part()
            control["restored"] = {**describe(part), **pin(regular(part))}
            control["restoredBody"] = retain("controls/part00-symlink/restored.b64", regular(part))
            control["fullTypeAndByteInverse"] = control["restored"] == control["before"]
            require(control["fullTypeAndByteInverse"] and copy_census() == copied_before, "structural control whole copy restored")
            retain_json("controls/part00-symlink/control.json", control)

        destination, receipt = out / "healthy-destination", out / "healthy-receipt.json"
        record, result = child("restored-healthy", "healthy-materialization", destination, receipt)
        require(result.returncode == 0 and result.stderr == b"", "restored actual materializer healthy process")
        require(result.stdout.decode("utf-8").splitlines() == [PASS_LINE], "restored healthy actual output")
        require(record["nativeHeadlines"] == [], "healthy has no native exception")
        materialized_receipt = json.loads(regular(receipt))
        require(materialized_receipt["status"] == "PASS" and materialized_receipt["all61DecodedAndMaterializedBodiesExact"] is True, "actual materializer healthy receipt")
        require(materialized_receipt["archive"] == carrier["archive"] and materialized_receipt["members"] == carrier["members"], "actual healthy receipt fixed identities")
        expected = {row["path"]: row for row in carrier["members"]}
        require(len(expected) == 61, "unique fixed healthy member list")
        paths = list(destination.rglob("*"))
        require(all(not path.is_symlink() and (path.is_file() or path.is_dir()) for path in paths), "healthy output only regular files/directories")
        names = sorted(path.relative_to(destination).as_posix() for path in paths if path.is_file())
        require(names == sorted(expected), "independent exact healthy61 file census")
        rows = []
        for name in names:
            body = regular(destination / name)
            require(len(body) == expected[name]["bytes"] and pin(body)["sha256"] == expected[name]["sha256"], "independent healthy body hash: " + name)
            rows.append({"file": name, **pin(body)})
        require(sum(row["bytes"] for row in rows) == 5729392, "independent healthy raw census")
        summary["healthy"] = {
            "receipt": {"file": "healthy-receipt.json", **pin(regular(receipt))},
            "members": rows, "rawBytes": 5729392,
            "all61IndependentBodyHashesExact": True,
        }
        retain_json("healthy-independent-verification.json", summary["healthy"])
        require(copy_census() == copied_before, "healthy materializer leaves carrier copy exact")
        summary["actual"] = {
            "children": len(summary["children"]),
            "ownedRefusals": sum(row.get("primaryOwned") is True for row in summary["children"]),
            "healthyMaterializations": sum(row["expected"] == "healthy-materialization" and row["returncode"] == 0 for row in summary["children"]),
        }
        require(summary["actual"] == summary["expected"], "actual three subprocess outcomes")
        summary["status"] = "PASS"
    except BaseException as error:
        first_error(error)
    finally:
        try:
            if part is not None and part_body is not None and copy_root.exists():
                restore_part()
            if copied_before is not None and copy_root.exists():
                require(copy_census() == copied_before, "final copy restored before cleanup")
                summary["copyFinalBeforeCleanup"] = retain_json("copy.final-before-cleanup.json", copy_census())
            after = []
            for path, body, label in source_inputs:
                actual = regular(path)
                require(actual == body, "original input source held: " + label)
                after.append({"label": label, "path": str(path), **pin(actual), **describe(path)})
            if source_inputs:
                summary["inputPinsAfter"] = after
                summary["sourceInputCensusComplete"] = "inputPinsBefore" in summary
                if summary["sourceInputCensusComplete"]:
                    require(after == summary["inputPinsBefore"], "all source input bytes/type pins held")
                    summary["sourceInputsHeld"] = True
                retain_json("input-pins.after.json", after)
            if copy_root.exists():
                require(copy_root == copy_root.resolve(strict=True) and copy_root == out / "copy-root" and under(copy_root, out), "owned cleanup target confinement")
                shutil.rmtree(copy_root)
            require(not copy_root.exists() and not copy_root.is_symlink(), "owned copy root absent")
            summary["copyRootRemoved"] = True
        except BaseException as error:
            if primary is None:
                first_error(error)
            else:
                summary["cleanupError"] = {
                    "type": type(error).__name__, "message": str(error),
                    "stack": "".join(traceback.format_exception(error)),
                }
        if primary is not None:
            summary["status"] = "FAIL"
        retain_json("summary.json", summary)
    if primary is not None:
        raise primary
    print("WORLD_XI_MATERIALIZER_PROBE PASS: 3 children, 2 owned input refusals, 1 restored healthy materialization")


if __name__ == "__main__":
    main()
