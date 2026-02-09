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

module.exports = config;
