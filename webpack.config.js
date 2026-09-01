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
// Dev assets are served under unhashed filenames (e.g. src_root_component_tsx.js)
// with no cache validators — without no-store, the browser heuristically caches
// them and serves days-old code. Keep the base CORS header (the shell at :4000
// fetches this remote cross-origin).
config.devServer = {
  ...config.devServer,
  port: 4001,
  allowedHosts: 'all',
  headers: {
    ...(config.devServer?.headers || {}),
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, must-revalidate',
  },
};

module.exports = config;
