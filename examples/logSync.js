const { TIOSession } = require('../dist/index.common.js');
const util = require('util')
const logUpdate = require('log-update');
const fs = require('fs')

const nrOfSamples = 100*300
let samples = 0
let timer = 0

let session
let file
const connect = async () => {
  console.log('Reset the calibration on the sensors before measuring the raw calibration data')
  session = new TIOSession({ streamingDevices: ['0', '1']})
  await session.connect()
  await session.start()
  
  const date = new Date()
  file = fs.createWriteStream(`data/data.${date.toString()}.json`)
  
  console.log('Starting in 5 seconds')
  setTimeout(() => {
    file.write('[ \n')
    session.on('data', (data) => {
      if (samples !== 0) {
        file.write(',\n')
      }
      file.write(JSON.stringify(data, null, 2))
  
      if (samples > nrOfSamples) {
        stop()
      }
      samples++
    })
  
    setInterval(() => {
      console.log(timer)
      timer++
    }, 1000)
  
  }, 5000)
}

async function stop () {
  await session.end()
  file.write('\n]')
  file.end()

  process.exit();
}

connect()

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  stop()
})