import { nanoid } from 'nanoid';

export type DisaggregationDimension = {
  name: string;
  items: Array<{ id: string; label: string }>;
};

export type IndicatorNode = {
  id: string;
  label: string;
  code?: string;
  type?: 'group' | 'indicator';
  children?: IndicatorNode[];
};

export type MappingGroup = {
  id: string;
  title: string;
  keyPattern?: string;
  dims?: Record<string, string>;
  indicatorTree: IndicatorNode[];
};

export type TemplateModel = {
  version: number;
  title: string;
  dimensions: Record<string, Array<{ id: string; label: string }>>;
  mapping: {
    arrayName: string;
    defaultValue: number;
    groups: MappingGroup[];
  };
};

export function buildDefaultTemplate(): TemplateModel {
  const age = [
    { id: '0-28d', label: '0-28d' },
    { id: '29d-4y', label: '29d-4y' },
    { id: '5-9y', label: '5-9y' },
    { id: '10-19y', label: '10-19y' },
    { id: '20yrs+', label: '20yrs+' },
  ];

  const sex = [
    { id: 'M', label: 'M' },
    { id: 'F', label: 'F' },
  ];

  const makeGroup = (title: string, indicatorTree: IndicatorNode[]): MappingGroup => ({
    id: nanoid(),
    title,
    keyPattern: '{code}_{age}_{sex}',
    dims: { age: 'age', sex: 'sex' },
    indicatorTree,
  });

  return {
    version: 4,
    title: '1.0 OPD ATTENDANCES, REFERRALS AND DIAGNOSES (Sample)',
    dimensions: { age, sex },
    mapping: {
      arrayName: 'dataValues',
      defaultValue: 0,
      groups: [
        makeGroup('1.1 OUTPATIENT ATTENDANCE', [
          { id: nanoid(), label: 'OA01. New attendance', code: 'OA01' },
          { id: nanoid(), label: 'OA02. Reattendance', code: 'OA02' },
        ]),
        makeGroup('1.2 OUTPATIENT REFERRALS', [
          { id: nanoid(), label: 'OR01. Referrals to unit', code: 'OR01' },
          { id: nanoid(), label: 'OR02. Referrals from unit', code: 'OR02' },
        ]),
        makeGroup('1.3.1 Epidemic-Prone Diseases', [
          {
            id: nanoid(),
            label: 'EP01. Malaria',
            code: 'EP01',
            type: 'group',
            children: [
              { id: nanoid(), label: 'EP01a. Suspected Malaria (fever)', code: 'EP01a' },
              { id: nanoid(), label: 'EP01b. Malaria Tested (B/s & RDT )', code: 'EP01b' },
              { id: nanoid(), label: 'EP01c. Malaria confirmed (B/s & RDT)', code: 'EP01c' },
              { id: nanoid(), label: 'EP01d. Confirmed Malaria cases treated', code: 'EP01d' },
              { id: nanoid(), label: 'EP01e. Total malaria cases treated', code: 'EP01e' },
            ],
          },
          { id: nanoid(), label: 'EP02. Acute Flaccid Paralysis', code: 'EP02' },
          { id: nanoid(), label: 'EP03. Animal Bites (suspected rabies)', code: 'EP03' },
          { id: nanoid(), label: 'EP04. Cholera', code: 'EP04' },
          { id: nanoid(), label: 'EP05. Dysentery', code: 'EP05' },
          { id: nanoid(), label: 'EP06. Guinea Worm', code: 'EP06' },
          { id: nanoid(), label: 'EP07. Measles', code: 'EP07' },
          { id: nanoid(), label: 'EP08. Bacterial Meningitis', code: 'EP08' },
          { id: nanoid(), label: 'EP09. Neonatal tetanus', code: 'EP09' },
          { id: nanoid(), label: 'EP10. Plague', code: 'EP10' },
          { id: nanoid(), label: 'EP11. Yellow Fever', code: 'EP11' },
          { id: nanoid(), label: 'EP12. Other Viral Haemorrhagic Fevers', code: 'EP12' },
          { id: nanoid(), label: 'EP13. Severe Acute Respiratory Infection (SARI)', code: 'EP13' },
          {
            id: nanoid(),
            label: 'EP14. Adverse Events Following Immunization (AEFI)',
            code: 'EP14',
            type: 'group',
            children: [
              { id: nanoid(), label: 'Serious', code: 'EP14_Serious' },
              { id: nanoid(), label: 'Non Serious', code: 'EP14_NonSerious' },
            ],
          },
          { id: nanoid(), label: 'EP15. Typhoid Fever', code: 'EP15' },
          { id: nanoid(), label: 'EP16. Refampicin resistant TB cases', code: 'EP16' },
          {
            id: nanoid(),
            label: 'EP17. Other Emerging infectious Diseases e.g. Influenza like illness (ILI), SARS',
            code: 'EP17',
          },
          { id: nanoid(), label: 'EP18. Covid-19', code: 'EP18' },
        ]),
      ],
    },
  };
}
