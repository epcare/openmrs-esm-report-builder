# OpenMRS ESM Report Builder

**Package:** `@ugandaemr/esm-report-builder`  
**Platform:** OpenMRS 3 (O3) Microfrontend  
**Status:** Active Development

---

## Overview

The **OpenMRS Report Builder** is an OpenMRS 3 frontend microfrontend (ESM) for **designing, managing, and structuring health reports** used in national and facility-level reporting.

It provides a unified environment where system analysts and implementers can:

- Create and manage reports
- Design report layouts and sections
- Define reusable indicator logic
- Build structured, disaggregation-aware report templates
- Preview and export machine-consumable report definitions

The Report Builder intentionally separates **report design**, **indicator logic**, and **template mapping**, enabling reuse, governance, and long-term maintainability of reporting artifacts.

---

## What This App Is (and Is Not)

### What it is
- A **report design and configuration tool**
- A **template and indicator authoring environment**
- A **source of truth** for report definitions
- A bridge between reporting logic and downstream evaluators/renderers

### What it is not
- Not a report executor
- Not a data visualization runtime
- Not responsible for evaluating indicators or querying data directly

Execution is delegated to backend services and reporting pipelines.

---

## Core Capabilities

### 1. Reports Management
- Create new reports
- List existing reports
- Open, duplicate, and export reports
- Manage report metadata (name, description, status)

Each report encapsulates:
- A report design
- A report template
- References to reusable indicator definitions

---

### 2. Report Design
Design the **human-readable structure** of a report.

- Pages and sections
- Narrative text
- Indicator tables
- (Future) charts and visual elements

---

### 3. Report Builder
- Hierarchical indicator structure
- Disaggregation-aware configuration
- Live JSON preview
- Exportable templates

---

### 4. Indicator Library
- Define indicator logic once
- Reuse across reports
- Disaggregation applied later

---

## Build and Run

### Prerequisites
- Node.js 18+
- Yarn 1.x
- OpenMRS 3 backend

### Install
```bash
yarn install
```

### Run
```bash
yarn start --backend=http://localhost:9098
```

### Access
- http://localhost:8080/openmrs/spa/report-builder

---

## License
Mozilla Public License 2.0 (MPL-2.0)

---

## Maintainers
- Hexam Creation Consult
