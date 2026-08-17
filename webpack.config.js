// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const config = (module.exports = require('openmrs/default-webpack-config'));

config.overrides.resolve = {
  extensions: ['.tsx', '.ts', '.jsx', '.js', '.scss', '.json'],
  alias: {
    '@openmrs/esm-framework': '@openmrs/esm-framework/src/internal',
    '@report-builder$': path.resolve(__dirname, 'src/report-builder/'),
  },
};

// Configure dev server to run on port 4001
config.devServer = {
  ...config.devServer,
  port: 4001,
  allowedHosts: 'all',
};

module.exports = config;
