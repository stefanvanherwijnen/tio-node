const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');
const fs = require('fs')

const nrOfSamples = 20*60
let samples = 0
let timer = 0

console.log('Reset the calibration on the sensors before measuring the raw calibration data')
const session = new TIOSession({ streamingDevices: ['0', '1']})
session.connect()


console.log('Starting in 5 seconds')
setTimeout(() => {
  const date = new Date()
  const files = {
    '0': fs.createWriteStream(`rawCalibrationData.${date.toString()}.0.tsv`),
    '1': fs.createWriteStream(`rawCalibrationData.${date.toString()}.1.tsv`)
  }

  session.on('data', (data) => {
    samples++
    for (let deviceIndex in data) {
      const deviceData = data[deviceIndex]
      const vectorData = [deviceData.vector.x, deviceData.vector.y, deviceData.vector.z]
      files[deviceIndex].write(vectorData.join('\t') + '\n')
    }
    if (samples > nrOfSamples) {
      stop()
    }
  })

  function stop () {
    session.end()
    for (const fileIndex in files) {
      files[fileIndex].end()
    }
    for (const fileIndex in files) {
      const arr = fs.readFileSync(`rawCalibrationData.${date.toString()}.${fileIndex}.tsv`, 'utf8').split('\n').map(v => v.split('\t'))
      console.log(arr)
      const jsonArr = JSON.stringify(arr, null, 2)
      fs.writeFileSync(`rawCalibrationData.${date.toString()}.${fileIndex}.json`, jsonArr)
    }

    process.exit();
  }

  setInterval(() => {
    console.log(timer)
    timer++
  }, 1000)

  process.on('SIGINT', function() {
    console.log("Caught interrupt signal");
    stop()
  })
}, 5000)