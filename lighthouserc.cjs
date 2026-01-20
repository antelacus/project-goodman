const baseUrl = process.env.LHCI_BASE_URL ?? 'http://localhost:3000';
const outputDir = process.env.LHCI_OUTPUT_DIR ?? '.lighthouseci';

function buildUrl(pathname) {
  return new URL(pathname, baseUrl).toString();
}

module.exports = {
  ci: {
    collect: {
      url: [buildUrl('/'), buildUrl('/chat')],
      numberOfRuns: 1,
      outputDir,
      settings: {
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility'],
        chromeFlags: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
  },
};
