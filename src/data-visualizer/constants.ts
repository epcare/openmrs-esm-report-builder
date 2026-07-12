export const cqiReports: ReportProps = {
  categoryName: "CQI REPORTS",
  reports: [
    {
      id: "2017e2e0-fc1c-4ba2-8816-92f822290c84",
      label: "HIV Care and Treatment Audit Tool",
    },
    {
      id: "9f629343-0b9b-4717-a824-2ba02f853a96",
      label: "PMTCT Audit Tool",
    },
    {
      id: "d6aecd70-f997-45ab-b43d-cfb270c0b4e1",
      label: "Care and Treatment Audit Summary",
    },
  ],
};

export const integrationDataExports: ReportProps = {
  categoryName: "Integration Data Exports",
  reports: [
    {
      id: "bf79f017-8591-4eaf-88c9-1cde33226517",
      label: "Family Connect EMTCT Module Data Export",
    },
    {
      id: "662d4c00-d6bb-4494-8180-48776f415802",
      label: "Recency HTS Client Card Data Export",
    },
    {
      id: "9ec815ed-e3ac-4710-a480-360e2777c7d1",
      label: "ART Access Register",
    },
    {
      id: "1759f19f-a7a7-44c7-b584-b5bafe4c36e8",
      label: "Viral Load Exchange Report",
    },
  ],
};

export const reportIndicators: Array<Indicator> = [
  {
    id: "IDN",
    label: "Identifiers",
    type: "PatientIdentifier",
    attributes: [],
  },
  {
    id: "PEN",
    label: "Person Names",
    type: "PersonName",
    attributes: [],
  },
  {
    id: "DEM",
    label: "Demographics",
    type: "Demographics",
    attributes: [],
  },
  {
    id: "ADD",
    label: "Address",
    type: "Address",
    attributes: [],
  },
  {
    id: "PAT",
    label: "Person Attributes",
    type: "PersonAttribute",
    attributes: [],
  },
  {
    id: "CON",
    label: "Conditions",
    type: "Condition",
    attributes: [],
  },
  {
    id: "APP",
    label: "Appointments",
    type: "Appointment",
    attributes: [],
  },
];

export const indicatorIdsWithoutEndPoints: Array<string> = [
  "APP",
  "ADD",
  "DEM",
  "PEN",
];

export const CQIReportHeaders = [
  {
    key: "ART_No",
    header: "ART/HIV Clinic No",
    accessor: "ART_No",
    isFlag: false,
  },
  {
    key: "gender",
    header: "Sex",
    accessor: "gender",
    isFlag: false,
  },
  {
    key: "age",
    header: "Age",
    accessor: "age",
    isFlag: false,
  },
  {
    key: "age_group",
    header: "Age Groups",
    accessor: "age_group",
    isFlag: false,
  },
  {
    key: "followup",
    header: "Follow up",
    accessor: "followup",
    isFlag: true,
  },
  {
    key: "child_Tested_flag",
    header: "Children testing",
    accessor: "child_Tested_flag",
    isFlag: true,
  },
  {
    key: "spouses_Tested_flag",
    header: "Partner testing",
    accessor: "spouses_Tested_flag",
    isFlag: true,
  },
  {
    key: "mmd_flag",
    header: "MMD",
    accessor: "mmd_flag",
    isFlag: true,
  },
  {
    key: "vl_coverage",
    header: "VL coverage",
    accessor: "vl_coverage",
    isFlag: true,
  },
  {
    key: "vl_bleeding",
    header: "VL bleeding",
    accessor: "vl_bleeding",
    isFlag: true,
  },
  {
    key: "vl_tat",
    header: "VL TAT",
    accessor: "vl_tat",
    isFlag: true,
  },
  {
    key: "iac",
    header: "IAC",
    accessor: "iac",
    isFlag: true,
  },
  {
    key: "HIVDR_sampling",
    header: " HIVDRT",
    accessor: "HIVDR_sampling",
    isFlag: true,
  },
  {
    key: "HIVDR_tat",
    header: "HDRT TAT",
    accessor: "HIVDR_tat",
    isFlag: true,
  },
  {
    key: "switched",
    header: "Switching",
    accessor: "switched",
    isFlag: true,
  },
  {
    key: "pss",
    header: "PSS",
    accessor: "pss",
    isFlag: true,
  },
  {
    key: "nutrition_support_flag",
    header: "Nutrition",
    accessor: "nutrition_support_flag",
    isFlag: true,
  },
  {
    key: "family_planning_flag",
    header: "F/P",
    accessor: "family_planning_flag",
    isFlag: true,
  },
  {
    key: "tpt_flag",
    header: " TPT",
    accessor: "tpt_flag",
    isFlag: true,
  },
  {
    key: "cacx_flag",
    header: "Cacx",
    accessor: "cacx_flag",
    isFlag: true,
  },
  {
    key: "hep_b_flag",
    header: "Hepatitis",
    accessor: "hep_b_flag",
    isFlag: true,
  },
  {
    key: "syphilis_flag",
    header: "Syphilis",
    accessor: "syphilis_flag",
    isFlag: true,
  },
  {
    key: "adv_disease_flag",
    header: "AHIVD",
    accessor: "adv_disease_flag",
    isFlag: true,
  },
  {
    key: "ovc_flag",
    header: "OVC",
    accessor: "ovc_flag",
    isFlag: true,
  },
];

export const dynamicReportOptions = [
  {
    id: "cohort",
    label: "Cohort",
  },
  {
    id: "program",
    label: "Program",
  },
  {
    id: "patientSearch",
    label: "Patient Search",
  },
  {
    id: "reportDefinition",
    label: "Report Definition",
  },
];

export const modifiers = [
  {
    id: "obsDatetime",
    label: "DateTime",
  },
  {
    id: "location",
    label: "Location",
  },
  {
    id: "comment",
    label: "Comment",
  },
  {
    id: "encounterType",
    label: "Encounter Type",
  },
  {
    id: "provider",
    label: "Provider",
  },
];

export const personNames = [
  {
    id: "givenName",
    label: "Given Name",
    type: "PersonName",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "middleName",
    label: "Middle Name",
    type: "PersonName",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "familyName",
    label: "Family Name",
    type: "PersonName",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "familyName2",
    label: "Family Name 2",
    type: "PersonName",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
];

export const Demographics = [
  {
    id: "gender",
    label: "Gender",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "birthdate",
    label: "Birthdate",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "Age",
    label: "Age",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "birthdateEstimated",
    label: "Birth Date estimated",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "dead",
    label: "Deceased",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "deathDate",
    label: "Date of death",
    type: "Demographics",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
];

export const Address = [
  {
    id: "country",
    label: "Country",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "countyDistrict",
    label: "District",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "stateProvince",
    label: "County",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "address3",
    label: "Sub County",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "address4",
    label: "Parish",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
  {
    id: "address5",
    label: "Village",
    type: "Address",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
];

export const AppointmentIndicators = [
  {
    id: "startDate",
    label: "Appointment Scheduled",
    type: "Appointment",
    modifier: 1,
    showModifierPanel: false,
    extras: [],
    attributes: [],
  },
];
