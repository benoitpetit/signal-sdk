const axios = require('axios');
const tar = require('tar');
const fs = require('fs');
const path = require('path');

const VERSION = '0.13.17';
const BASE_URL = `https://github.com/AsamK/signal-cli/releases/download/v${VERSION}`;

const platform = process.platform;

async function install() {
  let url;
  if (platform === 'linux') {
    url = `${BASE_URL}/signal-cli-${VERSION}-Linux-native.tar.gz`;
  } else {
    url = `${BASE_URL}/signal-cli-${VERSION}.tar.gz`;
  }

  console.log(`Downloading signal-cli from ${url}`);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  const binDir = path.join(__dirname, '..', 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  response.data.pipe(tar.x({ C: binDir, strip: 1 }));

  console.log('signal-cli downloaded and extracted successfully.');

  if (platform === 'win32') {
    console.log('Windows detected. Make sure you have Java installed and signal-cli.bat is executable.');
    console.log('signal-cli.bat is located at: ' + path.join(binDir, 'bin', 'signal-cli.bat'));
  } else if (platform !== 'linux') {
    console.log('Please ensure you have Java installed on your system for signal-cli to work.');
  }
}

install().catch(error => {
  console.error('Failed to install signal-cli:', error);
  process.exit(1);
});
