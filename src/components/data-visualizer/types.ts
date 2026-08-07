export const spaBasePath = `${window.spaBase}/home`;

export enum SearchTypes {
  BASIC = "basic",
  ADVANCED = "advanced",
  SEARCH_RESULTS = "search_results",
  SCHEDULED_VISITS = "scheduled-visits",
  VISIT_FORM = "visit_form",
  QUEUE_SERVICE_FORM = "queue_service_form",
  QUEUE_ROOM_FORM = "queue_room_form",
}

// Data Visualizer Types
export type Item = {
  id: string;
  label: string;
};

export type ReportProps = {
  categoryName: string;
  reports: Array<Item>;
};

export type Indicator = {
  id: string;
  label: string;
  type?: string;
  modifier?: number;
  showModifierPanel?: boolean;
  extras?: Array<string>;
  attributes?: Array<IndicatorItem>;
};

export type IndicatorItem = {
  id: string;
  label: string;
  type?: string;
};

export type ReportParamItem = {
  label: string;
  type?: string;
  expression: string;
  modifier?: number;
  extras?: Array<string>;
  showModifierPanel?: boolean;
};

export type savedReport = {
  id: string;
  label: string;
  description: string;
  type: string;
  columns: string;
  rows: string;
  aggregator: string;
  report_request_object: string;
};

export type ReportCategory = "facility" | "national" | "cqi" | "donor" | "integration";

export type RenderType = "list" | "json" | "html";
export type ReportType = "fixed" | "dynamic";

export type ReportingPeriod = "today" | "week" | "month" | "quarter" | "lastQuarter";

export type CQIReportItem = {
  ART_No: string;
  nationality: string;
  gender: string;
  date_of_birth: string;
  age: string;
  age_group: string;
  pos_status_children: string;
  vl_coverage: string;
  hepatitis_b_status: string;
  ovc_screening: string;
  nutrition_support_flag: string;
  cacx_screening: string;
  sample_type: string;
  tb_status: string;
  side_effects: string;
  family_planning_status: string;
  repeat_vl_collection_date: string;
  prescription_duration: string;
  syphilis_flag: string;
  next_vl_date: string;
  current_vl: string;
  HIVDR_tat: string;
  known_status_spouse: string;
  art_start_date: string;
  syphillis_status: string;
  HIVDR_sampling: string;
  tb_lam_crag_results: string;
  switched: string;
  hep_b_flag: string;
  child_Tested_flag: string;
  index_children_tested: string;
  index_spouse_tested: string;
  iacs_no: string;
  next_appointment_date: string;
  po_status_spouse: string;
  date_dr_results_received: string;
  iac: string;
  family_planning_flag: string;
  current_arv_regimen_start_date: string;
  repeat_vl_results_after_iacs: string;
  tpt_flag: string;
  pss: string;
  current_regimen: string;
  advanced_disease: string;
  cacx_flag: string;
  last_visit_date: string;
  adv_disease_flag: string;
  special_category: string;
  regimen_line: string;
  decision: string;
  tpt_status: string;
  vl_tat: string;
  adherence: string;
  vl_bleeding: string;
  vl_result_sample_date: string;
  hivdrt_results: string;
  nutrition_status: string;
  vl_profiling: string;
  new_vl_sample_date: string;
  spouses_Tested_flag: string;
  followup: string;
  mmd_flag: string;
  marital_status: string;
  duration_on_art: string;
  ovc_flag: string;
  client_status: string;
  who_stage: string;
  vl_updated: string;
  known_status_children: string;
};

export interface WaitTime {
  metric: string;
  averageWaitTime: string;
}

export interface RegionsResponse {
  message: string;
  status: boolean;
  data: Data;
}

export interface Data {
  resourceType: string;
  id: string;
  meta: Meta;
  type: string;
  total: number;
  link: Link[];
  entry: Entry[];
}

export interface Meta {
  lastUpdated: string;
}

export interface Link {
  relation: string;
  url: string;
}

export interface Entry {
  fullUrl: string;
  resource: Resource;
  search: Search;
}

export interface Resource {
  resourceType: string;
  id: string;
  meta: Meta2;
  extension: Extension[];
  status: string;
  name: string;
  type: Type[];
}

export interface Meta2 {
  versionId: string;
  lastUpdated: string;
  source: string;
}

export interface Extension {
  url: string;
  valueString: string;
}

export interface Type {
  coding: Coding[];
}

export interface Coding {
  code: string;
}

export interface Search {
  mode: string;
}
