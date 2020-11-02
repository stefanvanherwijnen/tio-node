const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');
const fs = require('fs')

const nrOfSamples = 20*120

console.log('Reset the calibration on the sensors before measuring the raw calibration data')
const session = new TIOSession({ streamingDevices: ['0', '1']})
session.connect()

const calibrationData = {
  '0': [],
  '1': []
}

session.on('data', (data) => {
  for (let deviceIndex in data) {
    const deviceData = data[deviceIndex]
    calibrationData[deviceIndex].push([deviceData.vector.x, deviceData.vector.y, deviceData.vector.z])
  }
  if (calibrationData[0].length > nrOfSamples) {
    stop()
  }
})

function stop () {
  session.end()
  for (let deviceIndex in calibrationData) {
    const content = calibrationData[deviceIndex].map(v => v.join('\t')).join('\n')
    fs.writeFileSync(`rawCalibrationData.${deviceIndex}.tsv`, content, function (err) {
      if (err) {
        console.log(err)
      }
    })
  }
  process.exit();
}

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  stop()
});