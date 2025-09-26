const axios = require('axios');
const fs = require('fs');
const path = require('path');
const tar = require('tar');

const VERSION = '0.13.18';
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
    responseType: 'arraybuffer'
  });

  const binDir = path.join(__dirname, '..', 'bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Write tar file temporarily
  const tempFile = path.join(binDir, 'signal-cli.tar.gz');
  fs.writeFileSync(tempFile, response.data);

  // Extract the archive. Using the tar npm package instead of the system tar
  // command ensures the extraction works reliably on Windows where the
  // built-in tar command struggles with long paths.
  try {
    await tar.x({
      file: tempFile,
      cwd: binDir
    });
  } catch (error) {
    console.error('Failed to extract archive:', error.message);
    throw error;
  }

  // Remove temp file
  fs.unlinkSync(tempFile);

  console.log('signal-cli downloaded and extracted successfully.');

  // Set executable permissions on Unix/Linux systems
  if (platform !== 'win32') {
    const signalCliExecutable = path.join(binDir, 'signal-cli');
    if (fs.existsSync(signalCliExecutable)) {
      try {
        fs.chmodSync(signalCliExecutable, '755');
        console.log('Set executable permissions for signal-cli');
      } catch (error) {
        console.warn('Could not set executable permissions:', error.message);
      }
    }
  }

  if (platform === 'win32') {
    console.log('Windows detected. Make sure you have Java installed and signal-cli.bat is executable.');
    console.log('signal-cli.bat is located at: ' + path.join(binDir, 'signal-cli.bat'));
  } else if (platform === 'linux') {
    console.log('Linux detected. signal-cli executable is ready.');
    console.log('signal-cli is located at: ' + path.join(binDir, 'signal-cli'));
  } else {
    console.log('Please ensure you have Java installed on your system for signal-cli to work.');
    console.log('signal-cli is located at: ' + path.join(binDir, 'signal-cli'));
  }
}

install().catch(error => {
  console.error('Failed to install signal-cli:', error);
  process.exit(1);
});
