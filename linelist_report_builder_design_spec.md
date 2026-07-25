# UgandaEMR Report Builder — Linelist Builder Design Specification

## 1. Product decision

Keep the existing aggregate-report workflow (`Reports → Indicators → Sections → Run Reports`) unchanged. Add a dedicated linelist builder under `Linelist Reports` because a linelist has a different mental model:

- Aggregate report: define indicators, compose sections, calculate totals.
- Linelist report: define a row grain, select columns, filter records, resolve repeated clinical data, preview individual rows.

The new builder should be inspired by Apache Superset's Explore workspace but use the existing OpenMRS/Carbon visual language.

## 2. Design goals

1. Allow a report designer to create a usable linelist without writing SQL.
2. Preserve an advanced SQL path for expert users.
3. Build and save the current JSON report definition format.
4. Prevent accidental duplicate rows caused by one-to-many clinical data.
5. Show a live preview before publication.
6. Enforce facility and patient-data permissions at query time and export time.
7. Reuse existing administration areas: Report Categories, Report Library, Data Themes and ETL Sources.

## 3. Information architecture

### Existing navigation

- Home
- Reports
- Indicators
- Sections
- Run Reports
- Linelist Reports
- Admin

### Recommended Linelist Reports sub-routes

- `/linelist-reports` — report list
- `/linelist-reports/new` — create report
- `/linelist-reports/:uuid/edit` — builder workspace
- `/linelist-reports/:uuid/run` — run and view report
- `/linelist-reports/:uuid/history` — revisions and audit history

Do not add more permanent items to the left navigation. Use tabs and breadcrumbs inside Linelist Reports.

## 4. Screen 1 — Linelist report list

### Header

- Breadcrumb: `Report builder / Linelist reports`
- Page title: `Linelist Reports`
- Description: `Create and manage reports that return individual patient or clinical records.`
- Primary button: `Create linelist report`

### Toolbar

- Search: name, code or description
- Status filter: All, Draft, Published, Retired
- Category filter
- Row type filter: Patient, Encounter, Observation, Enrollment, Appointment
- Sort: Last modified, Name, Created date

### Table columns

- Name
- Code
- Row type
- Category
- Data source
- Status
- Last modified
- Owner
- Overflow actions

### Overflow actions

- Edit
- Run
- Duplicate
- Export definition
- View revisions
- Retire/Delete, subject to status and permissions

### Empty and error states

- Show one primary create action, not duplicate buttons.
- Empty state is shown only when the request succeeds with zero records.
- A failed request shows an inline notification with `Retry` and the technical details in an expandable area.
- Do not show “No reports found” after a failed request.

## 5. Screen 2 — Create report dialog

Open a Carbon modal when the user selects `Create linelist report`.

### Fields

- Name — required
- Code — optional, unique when supplied
- Description
- Category — required
- Data theme — required
- Data source — required
- One row represents — required
  - Patient
  - Encounter
  - Observation/Lab result
  - Program enrollment
  - Appointment
  - Order
- Template — optional
  - Blank report
  - Appointment list
  - Patient demographic list
  - Missed appointment list
  - Laboratory result list

### Actions

- Cancel
- Create and open builder

On create, save a minimal Draft definition and navigate to the builder.

## 6. Screen 3 — Builder workspace

Use a full-width, three-panel workspace below the existing global header.

### Page header

Left side:

- Breadcrumb: `Linelist reports / Appointment List`
- Editable report name
- Status tag: Draft, Published, Retired
- Unsaved changes indicator

Right side:

- `Save` secondary button
- `Preview` button
- `Publish` primary button
- Overflow: Save as, Export JSON, Import JSON, Validate, View history, Retire

### Workspace layout

Desktop width 1440 px and above:

- Left catalogue: 280 px, resizable
- Middle configuration: 400 px, resizable
- Right preview: remaining width, minimum 560 px

At smaller desktop widths, allow the catalogue and configuration panels to collapse. The builder is desktop-first; do not attempt to make full configuration usable on a phone.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Linelist reports / Appointment List       Draft      Save Preview Publish  ⋮ │
├──────────────────┬──────────────────────────┬────────────────────────────────┤
│ DATA CATALOGUE   │ QUERY CONFIGURATION      │ PREVIEW                        │
│                  │                          │                                │
│ Data theme       │ Dataset                  │ 100 sample rows                │
│ Search fields    │ Population               │ Query time: 1.2 s              │
│                  │ Columns                  │                                │
│ Patient          │ Filters                  │ Clinic No | Name | Sex | Age   │
│ Demographics     │ Sort                     │ ...                            │
│ Visits           │ Parameters               │                                │
│ Observations     │ Display & export          │                                │
│ Programs         │                          │                                │
│ Laboratory       │                          │                                │
└──────────────────┴──────────────────────────┴────────────────────────────────┘
```

## 7. Left panel — Data catalogue

### Top controls

- Data theme dropdown
- ETL source/dataset dropdown
- Search field catalogue
- Toggle: `Available` / `Selected`

### Field grouping

Use a Carbon Accordion for:

- Patient identifiers
- Demographics
- Addresses and contacts
- Encounters and visits
- Programs and enrollments
- Appointments
- Diagnoses
- Observations
- Laboratory results
- Medications and regimens
- Providers
- Locations
- Calculated fields
- Advanced SQL fields

### Field item

Each item displays:

- Field label
- Data type icon: Text, Number, Date, Coded, Boolean, Identifier
- Source badge: Core, ETL, Calculation, SQL
- Repeated-data badge when the field can have more than one value per row
- PII badge for identifiable fields

Actions:

- Add to columns
- Add to filters
- View field details

Support drag-and-drop, but always provide keyboard-accessible add buttons.

## 8. Middle panel — Query configuration

Use stacked, collapsible sections. A section header shows its item count and validation state.

### 8.1 Dataset

Display:

- Data theme
- Data source
- Row grain
- Primary row key
- Base location restriction

Allow changing the dataset only after confirmation because it can invalidate columns and filters.

### 8.2 Population

This defines which row entities qualify for the report. It maps to `baseCohortDefinition`.

Provide two modes:

1. Visual filter builder — default
2. SQL definition — advanced permission only

Visual filter groups support nested `AND` and `OR` conditions.

Example:

```text
ALL conditions
  Appointment date is between [Start Date] and [End Date]
  Voided equals No
  Facility is [Location]
```

A condition contains:

- Field
- Operator
- Value or parameter reference
- Optional value source

Supported operators depend on field type:

- Text: equals, not equals, contains, starts with, is blank
- Number: equals, greater than, less than, between
- Date: on, before, after, between, in previous period
- Coded: is one of, is not one of
- Boolean: yes, no, not recorded
- Location: equals, within hierarchy

### 8.3 Columns

Show selected columns as a sortable list.

Each row shows:

- Drag handle
- Display label
- Source field
- Data type
- Repeated-value rule
- Visibility
- Configuration action
- Remove action

Actions:

- Add calculated column
- Add SQL column, permission controlled
- Add all fields from a saved field set

### 8.4 Filters

Filters are user-configurable restrictions separate from the base population.

A filter can be:

- Fixed — always applied
- Runtime — shown to the user when the report is run
- Optional runtime — may be left blank
- Hidden/system — always applied and not editable when running

Example:

```text
Appointment date BETWEEN ${startDate} AND ${endDate} — Runtime
Voided EQUALS false — Hidden/system
```

### 8.5 Sort

Support ordered multi-column sorting.

Each sort item contains:

- Column
- Ascending/Descending
- Nulls first/last

### 8.6 Parameters

Display the report parameters and their use count.

Fields:

- Name
- Label
- Type
- Required
- Default value
- Allowed values/value source
- Display order

Initial supported parameter types:

- DATE
- DATETIME
- LOCATION
- PROGRAM
- PROVIDER
- CONCEPT
- CODED_VALUE
- BOOLEAN
- NUMBER
- TEXT

### 8.7 Display and export

Controls:

- Default page size
- Freeze first column
- Freeze header
- Show record count
- Default visible columns
- Date display format
- Null display value
- Maximum interactive rows
- Maximum export rows
- Allowed exports: CSV, XLSX, PDF/print
- Include report parameters in export header
- Include generated timestamp

## 9. Column configuration side panel

Selecting a column opens a Carbon SidePanel.

### General

- Display label
- Internal name/ID
- Description
- Data type
- Visible by default
- Exportable
- PII classification

### Definition

The editor is selected from the column definition `type`.

Supported definition editors:

- IDENTIFIER
- PERSON_NAME
- PERSON_ATTRIBUTE
- PERSON_ADDRESS
- OBSERVATION
- PROGRAM_ATTRIBUTE
- ENCOUNTER_PROPERTY
- CALCULATION
- SQL

The UI must use a registry pattern:

```typescript
const definitionEditors = {
  IDENTIFIER: IdentifierDefinitionEditor,
  PERSON_NAME: PersonNameDefinitionEditor,
  PERSON_ATTRIBUTE: PersonAttributeDefinitionEditor,
  PERSON_ADDRESS: PersonAddressDefinitionEditor,
  CALCULATION: CalculationDefinitionEditor,
  SQL: SqlDefinitionEditor,
};
```

### Repeated-value resolution

This section is required when a field can return multiple values for one row.

Options:

- Latest value
- Earliest value
- Highest value
- Lowest value
- Closest to report start date
- Closest to report end date
- First value within period
- Last value within period
- Concatenate values
- Return all values and change row grain

Additional controls:

- Date field used for ordering
- Restrict to reporting period
- Ignore voided records
- Tie-break field

The builder must not preview or publish a patient-grain report with an unresolved repeated field.

### Transformations

Allow an ordered transformation pipeline:

- Date format
- Age on date
- Coded value to display name
- Boolean mapping
- Replace null
- Numeric rounding
- Categorize numeric value
- Concatenate text
- Mask identifier

## 10. Right panel — Preview

### Preview toolbar

- Run preview
- Auto-preview toggle, off by default for expensive sources
- Sample size: 25, 50, 100, 500
- Refresh
- Full-screen table
- Export sample
- View generated query, advanced permission only

### Status area

Show:

- Matching row count, when available
- Preview row count
- Query duration
- Last preview time
- Warnings

### Table behavior

- Sticky header
- Horizontal scrolling
- Column resizing
- Sort preview locally only when clearly labelled
- Truncated cell values with tooltip
- PII masking according to permissions
- Empty, loading, error and partial-result states

### Query warnings

Examples:

- “This field can return multiple values per patient. Select a repeated-value rule.”
- “The current report may generate more than 100,000 rows.”
- “Three SQL columns may execute per patient. Consider an ETL join field.”
- “Location is not applied. Users may retrieve records from all permitted facilities.”

## 11. Run report screen

The run screen should reuse the existing report filter area but generate controls from the saved parameter definitions.

### Header

- Report name
- Description
- Status
- Last published version

### Runtime filters

Generate controls in parameter order. Provide:

- Run report
- Reset
- Save parameter preset

### Results

- Record count
- Parameters summary
- Generated timestamp
- Data table
- Pagination/server-side page loading
- Export actions

For very large exports, create an asynchronous export job and notify the user when the file is ready.

## 12. Mapping to the current JSON definition

The builder should initially produce the current JSON structure to preserve compatibility.

| Builder concept | Current JSON property |
|---|---|
| Report metadata | `name`, `description`, `uuid`, `version`, `status`, `category`, `reportType` |
| Runtime inputs | `parameters[]` |
| Population | `baseCohortDefinition` |
| Dataset | `dataSetDefinitions[]` |
| Row grain | `dataSetDefinitions[].type` |
| Dataset population | `dataSetDefinitions[].rowFilter` |
| Columns | `dataSetDefinitions[].columns[]` |
| Column source | `columns[].dataDefinition` |
| Column transformation | `columns[].converter` |

Use the existing `type + config` pattern throughout. It allows the frontend to load an editor dynamically for every definition type.

### Compatibility requirements

- Import an existing definition and open it in the builder.
- Export the saved definition as JSON.
- Preserve unknown properties during edit/save so newer backend fields are not silently deleted.
- When a definition is SQL-based, show it as an advanced field rather than attempting an unreliable visual conversion.
- Allow the visual builder to generate SQL-backed output where needed without exposing SQL to ordinary users.

## 13. Recommended schema extensions

Add stable IDs and UI metadata without removing existing fields.

```json
{
  "name": "Appointment Date",
  "id": "appointmentDate",
  "dataDefinition": {
    "type": "SQL",
    "config": {
      "sql": "SELECT ..."
    }
  },
  "repeatResolution": {
    "strategy": "LATEST",
    "orderBy": "return_visit_date"
  },
  "display": {
    "format": "dd MMM yyyy",
    "visible": true,
    "exportable": true
  }
}
```

Normalize parameter references in new visual definitions:

```json
{
  "type": "PARAMETER_REFERENCE",
  "config": {
    "parameter": "startDate"
  }
}
```

The backend adapter may translate this to `${startDate}` or `:startDate` as required by the target definition.

## 14. Backend/API requirements

### Report definitions

- `GET /reportdefinition?reportType=LINELIST`
- `POST /reportdefinition`
- `GET /reportdefinition/{uuid}`
- `PUT /reportdefinition/{uuid}`
- `POST /reportdefinition/{uuid}/publish`
- `POST /reportdefinition/{uuid}/duplicate`
- `GET /reportdefinition/{uuid}/revisions`

### Builder metadata

- `GET /linelist/row-grains`
- `GET /linelist/data-themes`
- `GET /linelist/data-sources?theme={uuid}`
- `GET /linelist/fields?source={uuid}&rowGrain=PATIENT`
- `GET /linelist/definition-types`
- `GET /linelist/operators?dataType=DATE`
- `GET /linelist/transformations?dataType=DATE`

### Validation and preview

- `POST /linelist/validate`
- `POST /linelist/preview`
- `POST /linelist/count`
- `POST /linelist/run`
- `POST /linelist/export`

Preview request should accept an unsaved definition, parameters and row limit.

### Error contract

Return structured errors:

```json
{
  "code": "UNRESOLVED_REPEAT",
  "message": "Appointment Date can return multiple values per patient.",
  "path": "dataSetDefinitions[0].columns[5]",
  "suggestedAction": "Choose Latest, Earliest or All values."
}
```

## 15. Query execution architecture

Use a query-plan/compiler layer rather than executing one query for each patient and each SQL column.

### Required pipeline

1. Parse and validate report definition.
2. Resolve parameters.
3. Determine row grain and primary dataset.
4. Compile population filters.
5. Resolve each field into a projection or join.
6. Apply repeated-value strategies using window functions, grouped subqueries or ETL views.
7. Apply location and permission restrictions.
8. Execute one main paginated query where possible.
9. Format and mask results.

### Performance guardrails

- Detect per-patient SQL columns and warn or reject above a configured row threshold.
- Prefer joins to ETL fact/dimension tables.
- Use server-side pagination.
- Apply a preview timeout.
- Limit preview rows.
- Cache catalogue metadata, not patient result data.
- Never send all matching rows to the browser for client-side pagination.

## 16. Security requirements

- Validate all SQL definitions on the server.
- Parameterize values; do not concatenate user values into SQL.
- Enforce location access in the query plan.
- Restrict advanced SQL to a dedicated privilege.
- Classify fields as PII, sensitive clinical data or non-sensitive.
- Enforce display and export privileges separately.
- Record audit events for create, edit, publish, run and export.
- Mask or omit restricted columns in preview and output.

## 17. Frontend implementation notes

Recommended stack:

- React
- TypeScript
- IBM Carbon Design System
- React Query for server state
- React Hook Form for configuration forms
- Zod or equivalent for client-side schema validation
- Accessible drag-and-drop library, with non-drag alternatives

Suggested feature structure:

```text
features/linelist-reports/
  api/
  components/
    ReportList/
    CreateReportModal/
    BuilderShell/
    DataCatalogue/
    QueryConfiguration/
    PopulationBuilder/
    ColumnShelf/
    ColumnEditor/
    FilterBuilder/
    ParameterEditor/
    PreviewTable/
  definition-editors/
  transformation-editors/
  hooks/
  schemas/
  state/
  routes/
  utils/
```

Keep the report definition as the canonical builder state. Avoid maintaining a second unrelated UI-only query model. Use adapters only for temporary form state and server compatibility.

## 18. Validation rules

A report cannot be published unless:

- Name, category, data source and row grain are present.
- At least one column exists.
- Every referenced parameter exists.
- Every required parameter has a valid type.
- Repeated fields have an explicit resolution strategy.
- The base population is valid.
- Column internal IDs are unique.
- Sort references valid columns.
- SQL definitions pass server validation.
- The user has permission to publish all selected fields.
- A preview or validation request has succeeded against the current saved revision.

Drafts may be saved with validation errors.

## 19. Minimum viable release

### Phase 1

- Linelist report list
- Create report modal
- Patient row grain
- Data catalogue
- Columns
- Base population filters
- Date and location parameters
- Sort
- Preview 100 rows
- Save Draft
- Publish
- Run and CSV export
- Import and export current JSON
- Support existing definition types used by Appointment List

### Phase 2

- Encounter, observation, enrollment and appointment row grains
- Nested filter groups
- Repeated-value strategies
- Calculated columns
- XLSX export
- Revisions and duplication
- Templates

### Phase 3

- Visual joins
- Saved field sets
- Asynchronous large exports
- Query cost estimation
- AI-assisted field and filter suggestions

## 20. Acceptance criteria for the Appointment List example

The implementation is acceptable when a user can visually create a report equivalent to the Appointment List definition with:

- Start Date, End Date and Location parameters
- Patient row grain
- Appointment population restricted to the date range
- Clinic No
- Patient Name
- Sex
- Birth Date
- Age calculated on Start Date
- Latest Appointment Date in the range
- Latest Appointment Fulfillment in the range
- Current Regimen
- Telephone
- Village
- Draft and Published states
- Preview and CSV export

The saved JSON must be accepted by the existing report backend or by a compatibility adapter without manual editing.

---

# Copy-paste implementation prompt for a coding agent

Implement a Superset-inspired linelist report builder inside the existing OpenMRS report-builder frontend. Preserve the current aggregate-report workflow and add the builder under the existing `Linelist Reports` route.

Use React, TypeScript and IBM Carbon components. Build these screens:

1. A linelist report list with search, status/category/row-type filters, a single create action, correct empty/error states and row overflow actions.
2. A create-report modal that captures name, description, category, data theme, data source, row grain and optional template.
3. A three-panel builder workspace:
   - Left: searchable field catalogue grouped by clinical domain.
   - Middle: Dataset, Population, Columns, Filters, Sort, Parameters and Display/Export sections.
   - Right: paginated sample preview with status, warnings and errors.
4. A run-report screen that generates runtime controls from `parameters[]` and displays paginated records with export actions.

Use the report JSON as the canonical state and preserve the existing schema:

- metadata fields at the root
- `parameters[]`
- `baseCohortDefinition`
- `dataSetDefinitions[]`
- `columns[].dataDefinition`
- optional `columns[].converter`

Implement a registry-based editor for typed definitions using the common `{ type, config }` pattern. Support at minimum `IDENTIFIER`, `PERSON_NAME`, `PERSON_ATTRIBUTE`, `PERSON_ADDRESS`, `CALCULATION` and `SQL`.

For every field that can return more than one value for the selected row grain, require a repeat-resolution strategy such as Latest, Earliest, Highest, Lowest, Within period, Concatenate or Return all/change row grain. Prevent publication while a repeated field is unresolved.

Provide visual filters with field-specific operators and nested AND/OR groups. Allow filters to be Fixed, Runtime, Optional Runtime or Hidden/System. Generate parameter controls for DATE, LOCATION, TEXT, NUMBER, BOOLEAN, CODED_VALUE, PROGRAM and PROVIDER.

Implement preview against an unsaved definition. Preview must use server-side pagination and a row limit. Do not execute one SQL query per patient per column. Add validation and warnings for N+1 SQL definitions, missing parameters, invalid column references, unrestricted location scope and excessive estimated row counts.

Preserve unknown JSON properties when loading and saving. Existing SQL-based definitions must remain editable in an advanced SQL editor rather than being incorrectly converted into visual filters. Add import/export JSON actions.

Use Carbon SidePanel for column configuration, DataTable for preview and list screens, Accordion for field groups, Search, ComboBox/Dropdown, Tag, InlineNotification, Modal, Tabs, Pagination, OverflowMenu and Button components. All drag-and-drop interactions must have keyboard-accessible add/reorder alternatives.

Deliver the implementation in phases. Phase 1 must support creation of the existing Appointment List report, including Start Date, End Date, Location, patient row grain, demographic columns, calculated Age, appointment date/fulfillment, current regimen, telephone and village, plus Draft, Publish, Preview, Run and CSV export.
