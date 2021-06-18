const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');

const log = (object) => {
  logUpdate(util.inspect(object, {showHidden: false, depth: null}))
}
let offset = {
  x: 0,
  y: 0,
  z: 0
}
let acceleration = {
  x: [],
  y: [],
  z: []
}
let position = {
  x: 0,
  y: 0,
  z: 0
}
const dt = 5000

const avgAcceleration = (accel) => {
  acceleration.x.push(accel.x)
  acceleration.y.push(accel.y)
  acceleration.z.push(accel.z)
}

const getAcceleration = () => {
  const accel = {
    x: acceleration.x.reduce((a, b) => a + b, 0)/acceleration.x.length - offset.x,
    y: acceleration.y.reduce((a, b) => a + b, 0)/acceleration.y.length - offset.y,
    z: acceleration.z.reduce((a, b) => a + b, 0)/acceleration.z.length - offset.z
  }
  acceleration = {
    x: [],
    y: [],
    z: []
  }
  return accel
}
let session
const connect = async () => {
  session = new TIOSession({ streamingDevices: ['0', '1']})
  await session.connect()
  await session.start()
  let init = true
  session.on('data', (data) => {
    if (init) {
      // offset = data[0].accel
    }
    avgAcceleration(data[1].accel)
  })
  setInterval(() => {
    const accel = getAcceleration()
    position = {
      x: position.x + 1/2 * accel.x * Math.pow(dt/1000, 2),
      y: position.y + 1/2 * accel.y * Math.pow(dt/1000, 2),
      z: position.z + 1/2 * accel.z * Math.pow(dt/1000, 2)
    }
    console.log(accel)
  }, dt)
}

connect()

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  session.end()

  process.exit();
});