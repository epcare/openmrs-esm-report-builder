Indicator Feature Replacement (Clean)

This zip contains a cleaned indicator feature implementation:

- `indicators/`  -> place under: `src/report-builder/components/indicators/`
- `services/`    -> place under: `src/report-builder/services/`

Key changes
- Create Base Indicator modal is broken into small components:
  - `base-indicator-basic-fields.component.tsx`
  - `base-indicator-theme-unit-fields.component.tsx`
  - `diagnosis-filters-form.component.tsx`
  - `sql-preview.component.tsx`
- Diagnosis concept selection now supports:
  - search OpenMRS concepts (REST)
  - add one or more concepts
  - renders selected concepts as removable pills (tags)
  - SQL builder uses `=` for 1 concept and `IN (...)` for 2+ concepts
- OpenMRS concept search response is expected to be `{ "results": [...] }` and we parse `CIEL: <number>` mappings
  to derive the numeric concept_id used in warehouse (`diagnosis_coded`).

Notes
- REST base URL resolver is in: `services/concepts/openmrs-rest-base.ts`
  - Optionally set `window.OPENMRS_BASE_URL = 'http://host:port/openmrs'` (no trailing slash)
