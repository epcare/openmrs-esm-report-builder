# openmrs-esm-report-template-builder

A lightweight OpenMRS 3 (O3) microfrontend (ESM) that helps system analysts build **report JSON templates** (like HMIS-105 Section 1) and preview the resulting JSON.

## Features (MVP)

- Template structure browser (sections / groups / indicators)
- Basic node editing (label + code)
- Live JSON preview
- Copy / download generated JSON

## Local development

```bash
yarn
yarn start
```

Then open your O3 (SPA) and add this ESM to your import map (see below).

## Usage in any distribution

1. Build the ESM:

```bash
yarn build
```

2. Publish your build output (or use a local dev server), then add it to the distribution's import map.

Example snippet:

```json
{
  "imports": {
    "@ugandaemr/esm-report-template-builder": "https://your-host/openmrs-esm-report-template-builder.js"
  }
}
```

3. Ensure the backend serves the frontend module and reload the SPA.

## Route

- `.../openmrs/spa/report-template-builder`

An admin card link appears in the System Administration page.

## License

MPL-2.0
