# Fetch the twelve retained ceremony saves for scripts/qa/soccerCareerSaveTails.mjs, exactly as
# .github/workflows/soccer-career-save-tails.yml does: the repo's own artifact, its zip hash and every
# input's length and hash checked against scripts/qa/soccerCareerSaveTailInputs.json. Runner only.
import os, sys, json, hashlib, pathlib, urllib.request, urllib.error, zipfile

inputs = pathlib.Path(sys.argv[1]); inputs.mkdir(parents=True, exist_ok=True)
spec = json.loads(pathlib.Path('scripts/qa/soccerCareerSaveTailInputs.json').read_text())
api = 'https://api.github.com/repos/PapiSalgueroM/ballpark-hero/actions/artifacts/' + str(spec['artifact'])
headers = {'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'User-Agent': 'career-tail-proof'}
try:
    meta = json.load(urllib.request.urlopen(urllib.request.Request(api, headers=headers)))
except urllib.error.HTTPError as e:
    print('artifact metadata refused:', e.code, e.read()[:300]); sys.exit(3)
print('artifact', meta.get('id'), 'run', meta['workflow_run']['id'], 'head', meta['workflow_run']['head_sha'], 'expired', meta['expired'], 'expires_at', meta.get('expires_at'))
assert meta['workflow_run']['id'] == spec['run'] and meta['workflow_run']['head_sha'] == spec['source'] and not meta['expired']

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, hdrs, newurl): return None
try:
    urllib.request.build_opener(NoRedirect).open(urllib.request.Request(api + '/zip', headers=headers))
    raise AssertionError('expected signed artifact redirect')
except urllib.error.HTTPError as response:
    if response.code != 302:
        print('artifact zip refused:', response.code, response.read()[:300]); sys.exit(4)
    location = response.headers['Location']
data = urllib.request.urlopen(urllib.request.Request(location, headers={'User-Agent': 'career-tail-proof'})).read()
assert hashlib.sha256(data).hexdigest() == spec['zipSha256'], 'zip hash'
archive_path = inputs / '_artifact.zip'; archive_path.write_bytes(data)
with zipfile.ZipFile(archive_path) as archive:
    names = archive.namelist()
    for item in spec['inputs']:
        assert names.count(item['name']) == 1
        body = archive.read(item['name'])
        assert len(body) == item['bytes'] and hashlib.sha256(body).hexdigest() == item['sha256']
        (inputs / item['name']).write_bytes(body)
print('Twelve retained career inputs held from the artifact, every hash checked.')
