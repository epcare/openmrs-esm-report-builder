/**
 * Jest stub for SCSS module imports (CSS-modules behavior):
 * every class name resolves to itself, so assertions can check
 * literal class names without compiling styles.
 * __esModule must be false so interop keeps the proxy as the module.
 */
module.exports = new Proxy({}, {
  get: (_target, key) => {
    if (key === '__esModule') return false;
    return String(key);
  },
});
