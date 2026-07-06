const { execSync } = require('child_process');
const fs = require('fs');

const commands = {
  'status': 'git status',
  'diff': 'git diff HEAD -- index.html',
  'add': 'git add index.html',
  'commit': `git commit -m "Fix CSS mask compatibility warning in index.html"`,
  'push': 'git push origin main 2>&1'
};

const results = {};

for (const [key, cmd] of Object.entries(commands)) {
  try {
    const output = execSync(cmd, { cwd: __dirname, encoding: 'utf8', timeout: 30000 });
    results[key] = { status: 'ok', output: output };
  } catch (e) {
    results[key] = { status: 'error', output: e.stderr || e.message };
  }
}

fs.writeFileSync(__dirname + '/git_deploy_result.json', JSON.stringify(results, null, 2));
console.log('Results written to git_deploy_result.json');
