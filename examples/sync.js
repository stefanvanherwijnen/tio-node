const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');

const log = (object) => {
  logUpdate(util.inspect(object, {showHidden: false, depth: null}))
}

let session
const connect = async () => {
  session = new TIOSession({ streamingDevices: ['0', '1']})
  await session.connect()
  await session.start()

  session.on('data', log)
}

connect()

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  session.end()

  process.exit();
});