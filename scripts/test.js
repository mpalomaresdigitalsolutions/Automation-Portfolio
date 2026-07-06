const fs = require('fs');
fs.writeFileSync(__dirname + '/test_output.txt', 'node works: ' + new Date().toISOString());
console.log('done');
