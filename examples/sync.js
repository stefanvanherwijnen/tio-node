const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');

const log = (object) => {
  logUpdate(util.inspect(object, {showHidden: false, depth: null}))
}


const session = new TIOSession({ streamingDevices: ['0', '1']})
session.connect()
session.on('data', log)
process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  session.end()

  process.exit();
});