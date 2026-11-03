"""Materialize only the held World XI QA archive outside the checkout."""
import argparse
import base64
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import stat
import sys
import zipfile

def require(condition, message):
    if not condition:
        raise AssertionError("WORLD_XI_INPUT " + message)

def sha(data):
    return hashlib.sha256(data).hexdigest()

def git_blob(data):
    return hashlib.sha1(("blob " + str(len(data)) + "\0").encode() + data).hexdigest()

def under(path, root):
    return path == root or root in path.parents

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--carrier", required=True, type=Path)
    parser.add_argument("--dest", required=True, type=Path)
    parser.add_argument("--receipt", required=True, type=Path)
    args = parser.parse_args()
    root = Path.cwd().resolve()
    carrier = args.carrier.resolve(strict=True)
    destination = args.dest.resolve()
    receipt = args.receipt.resolve()
    require(carrier == root / ".qa-inputs/world-xi-held-archive-v1/carrier.json", "exact carrier path")
    require(not under(destination, root), "destination outside checkout")
    require(not under(receipt, root), "receipt outside checkout")
    require(not destination.exists() and not args.dest.is_symlink(), "fresh destination")
    require(not receipt.exists() and not args.receipt.is_symlink(), "fresh receipt")
    require(destination.parent.is_dir() and receipt.parent.is_dir(), "existing output parents")
    carrier_bytes = carrier.read_bytes()
    require(len(carrier_bytes) == 13270, "carrier length")
    require(sha(carrier_bytes) == "e13ce518fb7f2d59b0a2c4732d625f79f0ff57c851c1149b92d61e194ca41d24", "carrier hash")
    manifest = json.loads(carrier_bytes)
    require(manifest["schemaVersion"] == 1, "carrier schema")
    require(manifest["archive"] == {
        "bytes": 1440813,
        "sha256": "0b7be9cdaaf631ee3b76cef6eed3e9f74c51a9b1a1b4b70f797f71dd7a66acac",
        "members": 61,
        "rawBytes": 5729392
    }, "fixed archive identity")
    require(len(manifest["parts"]) == 8 and len(manifest["members"]) == 61, "part/member count")
    encoded_parts = []
    actual_parts = []
    for index, part in enumerate(manifest["parts"]):
        relative = ".qa-inputs/world-xi-held-archive-v1/part-" + str(index).zfill(2) + ".b64"
        require(part["path"] == relative and part["mode"] == "100644" and part["type"] == "blob", "ordered part contract")
        part_path = root / relative
        require(part_path.is_file() and not part_path.is_symlink() and part_path.resolve(strict=True) == part_path, "regular part path without symlink")
        body = part_path.read_bytes()
        require(len(body) == part["chars"] and git_blob(body) == part["sha"], "part bytes and Git identity")
        require(body.isascii() and b"\n" not in body and b"\r" not in body, "raw single-line base64")
        encoded_parts.append(body)
        actual_parts.append({"path": relative, "bytes": len(body), "sha256": sha(body), "gitBlob": git_blob(body)})
    archive_bytes = base64.b64decode(b"".join(encoded_parts), validate=True)
    require(len(archive_bytes) == manifest["archive"]["bytes"], "decoded archive length")
    require(sha(archive_bytes) == manifest["archive"]["sha256"], "decoded archive hash")
    expected = {row["path"]: row for row in manifest["members"]}
    require(len(expected) == 61 and list(expected) == sorted(expected), "unique sorted expected members")
    bodies = {}
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        entries = archive.infolist()
        names = [entry.filename for entry in entries]
        require(len(entries) == 61 and sorted(names) == list(expected), "exact archive member census")
        require(len({name.casefold() for name in names}) == 61, "no case-fold collisions")
        for entry in entries:
            relative = PurePosixPath(entry.filename)
            require(not relative.is_absolute() and ".." not in relative.parts and "\\" not in entry.filename, "safe member path")
            require(not entry.is_dir() and not stat.S_ISLNK(entry.external_attr >> 16), "regular archive member")
            row = expected[entry.filename]
            require(entry.file_size == row["bytes"], "declared member length")
            body = archive.read(entry)
            require(len(body) == row["bytes"] and sha(body) == row["sha256"], "retained member exact bytes")
            bodies[entry.filename] = body
    require(sum(len(body) for body in bodies.values()) == 5729392, "raw byte census")
    require(sha(bodies["manifest.json"]) == "93075e1a52b07446145b459987ba51f636adb9078265442d8e3049447ba14ebf", "original response manifest")
    require(sha(bodies["font-cache/manifest.json"]) == "3171c3241bbb489c22f51489f8b2cd94c880f071dfe9760a5c9aabdf48363d82", "original font manifest")
    destination.mkdir()
    for name, body in bodies.items():
        target = destination.joinpath(*PurePosixPath(name).parts)
        require(under(target, destination), "materialized path confinement")
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open("xb") as stream:
            stream.write(body)
    actual_names = sorted(path.relative_to(destination).as_posix() for path in destination.rglob("*") if path.is_file())
    require(actual_names == list(expected), "materialized member census")
    for name, row in expected.items():
        target = destination.joinpath(*PurePosixPath(name).parts)
        require(not target.is_symlink(), "materialized member no symlink")
        body = target.read_bytes()
        require(len(body) == row["bytes"] and sha(body) == row["sha256"], "materialized readback exact bytes")
    result = {
        "schemaVersion": 1,
        "status": "PASS",
        "python": sys.version,
        "checkout": str(root),
        "destination": str(destination),
        "carrier": {"bytes": len(carrier_bytes), "sha256": sha(carrier_bytes), "gitBlob": git_blob(carrier_bytes)},
        "archive": manifest["archive"],
        "parts": actual_parts,
        "members": manifest["members"],
        "originalArtifact": manifest["origin"],
        "all61DecodedAndMaterializedBodiesExact": True,
        "scope": "Existing archived responses and fonts only. No network, current live roster, production persistence or sports field update.",
    }
    with receipt.open("x", encoding="utf-8") as stream:
        json.dump(result, stream, indent=2)
        stream.write("\n")
    print("WORLD_XI_INPUT PASS: 8 parts, 61 exact members, 5729392 raw bytes, outside checkout")

if __name__ == "__main__":
    main()
