/**
 * Data Catalogue Component for Linelist Reports
 *
 * Left panel component that provides searchable, grouped access to available fields.
 * Integrates with existing ETL metadata infrastructure.
 *
 * Based on design spec section 7: Left panel — Data catalogue
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  TextInput,
  Button,
  Tag,
  Accordion,
  AccordionItem,
  InlineNotification,
  Dropdown,
  Toggle,
} from '@carbon/react';
// Icons imported as needed

import { useETLTables } from '../../hooks/theme';
import { useETLTableMeta } from '../../hooks/theme';
import { useDataThemes } from '../../hooks/theme';
// TableColumn type imported as needed
import type { FilterFieldType } from '../../types/linelist-types';
import type { DataTheme } from '../../types/theme/data-theme.types';
import type {
  EtlStructure,
} from '../../types/etl/etl-types';
import { listPersonAttributeTypes, type PersonAttributeTypeDto } from '../../resources/person-attribute-type/person-attribute-type.api';
import { listPatientIdentifierTypes, type PatientIdentifierTypeDto } from '../../resources/patient-identifier-type/patient-identifier-type.api';
import styles from './data-catalogue.scss';

/**
 * Field group definitions based on clinical domain
 * Maps field patterns to display groups
 */
const FIELD_GROUPS = [
  {
    id: 'demographics',
    name: 'Demographics',
    description: 'Patient demographic information',
    fieldPatterns: ['given_name', 'family_name', 'person_name', 'sex', 'gender', 'birth_date', 'age', 'death_date'],
    icon: '👤',
  },
  {
    id: 'api-person-attributes',
    name: 'Person Attributes',
    description: 'Custom person attributes from OpenMRS (Telephone, Civil Status, etc.)',
    fieldPatterns: [], // No pattern matching - populated via API
    icon: '🏷️',
    isApiDriven: true, // Flag for API-driven groups
  },
  {
    id: 'openmrs-calculated',
    name: 'Calculated Fields',
    description: 'Fields calculated from other data',
    fieldPatterns: ['age', 'bmi'],
    icon: '🧮',
  },
  {
    id: 'api-patient-identifiers',
    name: 'Patient Identifiers',
    description: 'Patient identification numbers from OpenMRS (Clinic No, National ID, etc.)',
    fieldPatterns: [], // No pattern matching - populated via API
    icon: '🆔',
    isApiDriven: true, // Flag for API-driven groups
  },
  {
    id: 'openmrs-person-name',
    name: 'Person Name',
    description: 'Patient name components',
    fieldPatterns: ['given_name', 'family_name', 'middle_name', 'person_name'],
    icon: '👤',
  },
  {
    id: 'openmrs-address',
    name: 'Address & Contact',
    description: 'Address and contact information',
    fieldPatterns: ['address', 'village', 'city', 'phone', 'telephone'],
    icon: '📍',
  },
  {
    id: 'addresses',
    name: 'Addresses & Contacts',
    description: 'Patient address and contact information',
    fieldPatterns: ['address', 'city', 'village', 'district', 'state', 'country', 'phone', 'telephone', 'email'],
    icon: '📍',
  },
  {
    id: 'encounters',
    name: 'Encounters & Visits',
    description: 'Encounter and visit information',
    fieldPatterns: ['encounter', 'visit', 'visit_date', 'encounter_date', 'encounter_type', 'location'],
    icon: '🏥',
  },
  {
    id: 'observations',
    name: 'Observations',
    description: 'Clinical observations and vitals',
    fieldPatterns: ['obs', 'observation', 'value', 'concept', 'weight', 'height', 'bmi', 'temperature', 'blood_pressure'],
    icon: '📊',
  },
  {
    id: 'programs',
    name: 'Programs & Enrollments',
    description: 'Program enrollment and status',
    fieldPatterns: ['program', 'enrollment', 'enrol', 'program_enrollment', 'regimen', 'art', 'hiv', 'tb'],
    icon: '📋',
  },
  {
    id: 'appointments',
    name: 'Appointments',
    description: 'Scheduled appointments',
    fieldPatterns: ['appointment', 'return_visit', 'appointment_date', 'fulfillment', 'scheduled'],
    icon: '📅',
  },
  {
    id: 'laboratory',
    name: 'Laboratory',
    description: 'Lab results and orders',
    fieldPatterns: ['lab', 'laboratory', 'test', 'result', 'specimen', 'order_date', 'result_date'],
    icon: '🔬',
  },
  {
    id: 'medications',
    name: 'Medications',
    description: 'Drug prescriptions and dispenses',
    fieldPatterns: ['drug', 'medication', 'prescription', 'dispense', 'regimen', 'dose'],
    icon: '💊',
  },
];

/**
 * Common OpenMRS Calculated Fields
 * These are always available regardless of selected ETL table
 */
const CALCULATED_FIELDS: CatalogueField[] = [
  {
    id: 'openmrs.calc.age',
    name: 'age',
    label: 'Age',
    type: 'NUMBER',
    source: 'CALCULATION',
    table: 'person',
    isRepeated: false,
    description: 'Age in years (as of report end date)',
  },
  {
    id: 'openmrs.calc.age_months',
    name: 'age_months',
    label: 'Age (Months)',
    type: 'NUMBER',
    source: 'CALCULATION',
    table: 'person',
    isRepeated: false,
    description: 'Age in months (as of report end date)',
  },
  {
    id: 'openmrs.calc.age_years',
    name: 'age_years',
    label: 'Age (Years)',
    type: 'NUMBER',
    source: 'CALCULATION',
    table: 'person',
    isRepeated: false,
    description: 'Age in whole years (as of report end date)',
  },
  {
    id: 'openmrs.calc.bmi',
    name: 'bmi',
    label: 'BMI',
    type: 'NUMBER',
    source: 'CALCULATION',
    table: 'person',
    isRepeated: false,
    description: 'Body Mass Index',
  },
];

/**
 * Common OpenMRS Person/Patient fields
 * These are always available regardless of selected ETL table
 */
const DEMOGRAPHIC_FIELDS: CatalogueField[] = [
  // Person Name
  {
    id: 'openmrs.person.given_name',
    name: 'given_name',
    label: 'Given Name',
    type: 'TEXT',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Patient given name',
  },
  {
    id: 'openmrs.person.family_name',
    name: 'family_name',
    label: 'Family Name',
    type: 'TEXT',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Patient family name/surname',
  },
  {
    id: 'openmrs.person.full_name',
    name: 'full_name',
    label: 'Full Name',
    type: 'TEXT',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Complete patient name',
  },
  // Person Attributes
  {
    id: 'openmrs.person.gender',
    name: 'gender',
    label: 'Gender',
    type: 'CODED',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Patient gender',
  },
  {
    id: 'openmrs.person.birthdate',
    name: 'birthdate',
    label: 'Birth Date',
    type: 'DATE',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Patient birth date',
  },
  {
    id: 'openmrs.person.death_date',
    name: 'death_date',
    label: 'Death Date',
    type: 'DATE',
    source: 'CORE',
    table: 'person',
    isRepeated: false,
    description: 'Patient death date',
  },
  // Person Address Fields
  {
    id: 'openmrs.person_address.city_village',
    name: 'city_village',
    label: 'Village',
    type: 'TEXT',
    source: 'CORE',
    table: 'person_address',
    isRepeated: false,
    description: 'Patient village/city',
  },
  {
    id: 'openmrs.person_address.address1',
    name: 'address1',
    label: 'Address Line 1',
    type: 'TEXT',
    source: 'CORE',
    table: 'person_address',
    isRepeated: false,
    description: 'Address line 1',
  },
  {
    id: 'openmrs.person_address.state_province',
    name: 'state_province',
    label: 'State/Province',
    type: 'TEXT',
    source: 'CORE',
    table: 'person_address',
    isRepeated: false,
    description: 'State or province',
  },
  {
    id: 'openmrs.person_address.country',
    name: 'country',
    label: 'Country',
    type: 'TEXT',
    source: 'CORE',
    table: 'person_address',
    isRepeated: false,
    description: 'Country',
  },
];

/**
 * Map SQL column types to FilterFieldType
 */
function mapColumnTypeToFilterFieldType(sqlType?: string): FilterFieldType {
  if (!sqlType) return 'TEXT';

  const type = sqlType.toLowerCase();

  // Integer types
  if (type.includes('int') || type.includes('serial') || type.includes('bigint')) {
    return 'NUMBER';
  }

  // Decimal/numeric types
  if (type.includes('decimal') || type.includes('numeric') || type.includes('float') || type.includes('double')) {
    return 'NUMBER';
  }

  // Date/time types
  if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
    return 'DATE';
  }

  // Boolean type
  if (type.includes('bool') || type.includes('bit')) {
    return 'BOOLEAN';
  }

  // Default to text
  return 'TEXT';
}

/**
 * Get field source type
 */
function getFieldType(columnName: string, table: string): 'CORE' | 'ETL' | 'CALCULATION' {
  // Add calculation detection logic here
  if (columnName.includes('age') || columnName.includes('bmi')) {
    return 'CALCULATION';
  }

  // ETL tables typically have specific prefixes
  if (table.includes('_etl') || table.includes('_fact') || table.includes('_dim')) {
    return 'ETL';
  }

  return 'CORE';
}

/**
 * Categorize a field into a group
 */
function categorizeField(fieldName: string): string | null {
  const lowerField = fieldName.toLowerCase();

  for (const group of FIELD_GROUPS) {
    for (const pattern of group.fieldPatterns) {
      if (lowerField.includes(pattern.toLowerCase())) {
        return group.id;
      }
    }
  }

  return null;
}

/**
 * Check if a field can have multiple values per patient
 */
function isPotentiallyRepeated(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  const repeatedKeywords = [
    'appointment', 'visit', 'encounter', 'obs', 'observation',
    'lab', 'test', 'result', 'program', 'enrollment', 'drug',
    'medication', 'regimen'
  ];

  return repeatedKeywords.some(keyword => lowerField.includes(keyword));
}

type Props = {
  table: string;
  themeUuid?: string;
  onAddToColumns: (field: CatalogueField) => void;
  onAddToFilters: (field: CatalogueField) => void;
  onTableChange?: (table: string) => void;
  onThemeChange?: (themeUuid: string) => void;
  onFieldsAvailable?: (fields: CatalogueField[]) => void; // Callback to expose available fields to parent
  onEtlStructureDetected?: (structure: EtlStructure) => void; // Callback when ETL structure is detected
  selectedFields?: string[]; // Field IDs that are already selected
  disabled?: boolean;
};

/**
 * Field in the catalogue
 */
export type CatalogueField = {
  id: string;
  name: string;
  label: string;
  type: FilterFieldType;
  source: 'CORE' | 'ETL' | 'CALCULATION';
  table: string;
  isRepeated: boolean;
  description?: string;
};

const DataCatalogue: React.FC<Props> = ({
  table,
  themeUuid,
  onAddToColumns,
  onAddToFilters,
  onTableChange,
  onThemeChange,
  onFieldsAvailable,
  onEtlStructureDetected,
  selectedFields = [],
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [etlStructure, setEtlStructure] = useState<EtlStructure | null>(null);

  // State for API-fetched data
  const [personAttributeTypes, setPersonAttributeTypes] = useState<Array<PersonAttributeTypeDto>>([]);
  const [patientIdentifierTypes, setPatientIdentifierTypes] = useState<Array<PatientIdentifierTypeDto>>([]);
  const [apiDataLoading, setApiDataLoading] = useState(true);
  const [apiDataError, setApiDataError] = useState<string | null>(null);

  // Get available tables
  const { tables, loading: tablesLoading, error: tablesError } = useETLTables(true);

  // Get available data themes
  const { themes, loading: themesLoading, error: themesError } = useDataThemes('');

  // Get columns for selected table
  const {
    columns,
    loading: columnsLoading,
    error: columnsError,
  } = useETLTableMeta(table, Boolean(table));

  // Fetch person attribute types and patient identifier types on mount
  useEffect(() => {
    const fetchApiData = async () => {
      try {
        setApiDataLoading(true);
        setApiDataError(null);

        const [attributes, identifiers] = await Promise.all([
          listPersonAttributeTypes(true),
          listPatientIdentifierTypes(true),
        ]);

        setPersonAttributeTypes(attributes);
        setPatientIdentifierTypes(identifiers);
      } catch (error) {
        console.error('Failed to fetch person attributes/identifiers:', error);
        setApiDataError('Failed to load person attributes and identifiers from server');
      } finally {
        setApiDataLoading(false);
      }
    };

    fetchApiData();
  }, []);

  /**
   * Organize columns into field groups
   */
  const groupedFields = useMemo(() => {
    const groups: Record<string, CatalogueField[]> = {};

    // Initialize empty arrays for all groups
    FIELD_GROUPS.forEach((group) => {
      groups[group.id] = [];
    });

    // Add "uncategorized" group for fields that don't match any group
    groups['uncategorized'] = [];

    // Add calculated fields (always available)
    groups['openmrs-calculated'] = CALCULATED_FIELDS;

    // Add demographic fields (always available)
    groups['demographics'] = DEMOGRAPHIC_FIELDS;

    // Add API-fetched person attribute types
    groups['api-person-attributes'] = personAttributeTypes
      .filter((attr) => !attr.retired) // Filter out retired attributes
      .map((attr) => ({
        id: `person-attribute-${attr.uuid}`,
        name: attr.uuid,
        label: attr.display || attr.name || attr.uuid,
        type: 'TEXT' as FilterFieldType,
        source: 'CORE' as const,
        table: 'person_attribute',
        isRepeated: false,
        description: attr.description || 'Custom person attribute',
      }));

    // Add API-fetched patient identifier types
    groups['api-patient-identifiers'] = patientIdentifierTypes
      .filter((id) => !id.retired) // Filter out retired identifiers
      .map((idType) => ({
        id: `patient-identifier-${idType.uuid}`,
        name: idType.uuid,
        label: idType.display || idType.name || idType.uuid,
        type: 'TEXT' as FilterFieldType,
        source: 'CORE' as const,
        table: 'patient_identifier',
        isRepeated: true, // Patients can have multiple identifiers of the same type
        description: idType.description || 'Patient identifier',
      }));

    // Categorize each column from the selected table
    if (columns && columns.length > 0) {
      columns.forEach((column) => {
        const groupId = categorizeField(column.name) || 'uncategorized';

        const field: CatalogueField = {
          id: `${table}.${column.name}`,
          name: column.name,
          label: formatFieldLabel(column.name),
          type: mapColumnTypeToFilterFieldType(column.type),
          source: getFieldType(column.name, table),
          table: table,
          isRepeated: isPotentiallyRepeated(column.name),
        };

        groups[groupId].push(field);
      });
    }

    return groups;
  }, [columns, table, personAttributeTypes, patientIdentifierTypes]);

  /**
   * Expose all available fields to parent component
   */
  useEffect(() => {
    if (onFieldsAvailable) {
      const allFields: CatalogueField[] = Object.values(groupedFields).flat();
      onFieldsAvailable(allFields);
    }
  }, [groupedFields, onFieldsAvailable]);

  /**
   * Detect ETL structure when table/columns change
   */
  useEffect(() => {
    if (!table || !columns || columns.length === 0) {
      return;
    }

    // Import the detection function dynamically to avoid circular deps
    import('../../types/etl/etl-types').then(({ detectEtlStructure }) => {
      const columnNames = columns.map((c) => c.name);
      const detected = detectEtlStructure(table, columnNames);
      setEtlStructure(detected);

      if (onEtlStructureDetected) {
        onEtlStructureDetected(detected);
      }
    });
  }, [table, columns, onEtlStructureDetected]);

  /**
   * Filter fields based on search term and selection toggle
   */
  const filteredGroupedFields = useMemo(() => {
    let result = groupedFields;
    const selectedSet = new Set(selectedFields);

    // By default, exclude selected fields from the available options
    // (unless showSelectedOnly is enabled, then show ONLY selected fields)
    if (!showSelectedOnly && selectedSet.size > 0) {
      const filtered: Record<string, CatalogueField[]> = {};
      Object.entries(groupedFields).forEach(([groupId, fields]) => {
        const availableFields = fields.filter((field) => !selectedSet.has(field.id));
        if (availableFields.length > 0) {
          filtered[groupId] = availableFields;
        }
      });
      result = filtered;
    } else if (showSelectedOnly) {
      // Show only selected fields
      const filtered: Record<string, CatalogueField[]> = {};
      Object.entries(groupedFields).forEach(([groupId, fields]) => {
        const matchingFields = fields.filter((field) => selectedSet.has(field.id));
        if (matchingFields.length > 0) {
          filtered[groupId] = matchingFields;
        }
      });
      result = filtered;
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const filtered: Record<string, CatalogueField[]> = {};
      Object.entries(result).forEach(([groupId, fields]) => {
        const matchingFields = fields.filter(
          (field) =>
            field.name.toLowerCase().includes(lowerSearch) ||
            field.label.toLowerCase().includes(lowerSearch)
        );
        if (matchingFields.length > 0) {
          filtered[groupId] = matchingFields;
        }
      });
      result = filtered;
    }

    return result;
  }, [groupedFields, searchTerm, showSelectedOnly, selectedFields]);

  /**
   * Toggle group expansion
   */
  const toggleGroup = useCallback((groupId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  /**
   * Expand all groups
   */
  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(Object.keys(filteredGroupedFields)));
  }, [filteredGroupedFields]);

  /**
   * Collapse all groups
   */
  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const isLoading = tablesLoading || columnsLoading || themesLoading || apiDataLoading;
  const error = tablesError || columnsError || themesError || apiDataError;
  const totalFields = Object.values(filteredGroupedFields).reduce((sum, fields) => sum + fields.length, 0);

  return (
    <div className={styles.catalogue}>
      {/* Data theme and source dropdowns */}
      <div className={styles.datasetControls}>
        {onThemeChange && (
          <div className={styles.dropdown}>
            <Dropdown
              id="data-theme"
              titleText="Data theme"
              label="Data theme"
              size="sm"
              items={themes || []}
              itemToString={(theme: DataTheme) => theme?.name || ''}
              selectedItem={themes?.find((t) => t.uuid === themeUuid)}
              onChange={(selected) => {
                const theme = selected.selectedItem as DataTheme;
                if (theme) {
                  onThemeChange(theme.uuid);
                }
              }}
              disabled={disabled || themesLoading}
            />
          </div>
        )}
        {onTableChange && (
          <div className={styles.dropdown}>
            <Dropdown
              id="etl-source"
              titleText="Data source"
              label="Data source"
              size="sm"
              items={tables || []}
              itemToString={(table: string) => table || 'Select a table'}
              selectedItem={tables?.find((t) => t === table)}
              onChange={(selected) => {
                const selectedTable = selected.selectedItem as string;
                if (selectedTable) {
                  onTableChange(selectedTable);
                }
              }}
              disabled={disabled || tablesLoading}
            />
          </div>
        )}
      </div>

      {/* ETL Structure Indicator */}
      {etlStructure && (
        <div className={styles.etlIndicator}>
          <div className={styles.etlTypeBadge}>
            <span className={styles.etlTypeIcon}>
              {etlStructure.type === 'VERTICAL' ? '📊' : '📋'}
            </span>
            <span className={styles.etlTypeLabel}>
              {etlStructure.type === 'VERTICAL' ? 'Vertical ETL' : 'Horizontal ETL'}
            </span>
          </div>
          <div className={styles.etlDescription}>
            {etlStructure.type === 'VERTICAL' ? (
              <>
                Data stored in long format. Filter by{' '}
                <strong>{etlStructure.dataIdentifierColumn || 'concept'}</strong> to select specific data points.
              </>
            ) : (
              <>
                Data stored in wide format. Columns are directly selectable data points.
              </>
            )}
          </div>
          {etlStructure.type === 'VERTICAL' && etlStructure.requiredFilters && (
            <div className={styles.etlHint}>
              <strong>Required filters:</strong> {etlStructure.requiredFilters.map(f => f.column).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Search and controls */}
      <div className={styles.controls}>
        <TextInput
          id="field-search"
          labelText=""
          placeholder="Search fields..."
          size="sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled || isLoading}
        />
        <div className={styles.actionButtons}>
          <Button
            kind="ghost"
            size="sm"
            onClick={expandAll}
            disabled={disabled || isLoading}
          >
            Expand All
          </Button>
          <Button
            kind="ghost"
            size="sm"
            onClick={collapseAll}
            disabled={disabled || isLoading}
          >
            Collapse All
          </Button>
        </div>
      </div>

      {/* Available/Selected toggle */}
      {selectedFields.length > 0 && (
        <div className={styles.toggleContainer}>
          <Toggle
            id="show-selected-toggle"
            labelText="Show selected only"
            labelA="All fields"
            labelB="Selected only"
            toggled={showSelectedOnly}
            onToggle={() => setShowSelectedOnly(!showSelectedOnly)}
            disabled={disabled || isLoading}
          />
          <Tag type="blue">{selectedFields.length} selected</Tag>
        </div>
      )}

      {/* Error state */}
      {error && (
        <InlineNotification
          kind="error"
          title="Error"
          subtitle={error}
          hideCloseButton
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && totalFields === 0 && (
        <div className={styles.empty}>
          {table ? (
            <p>No fields found for table: {table}</p>
          ) : (
            <p>Select a data source to view available fields</p>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={styles.loading}>Loading fields...</div>
      )}

      {/* Field groups */}
      {!isLoading && totalFields > 0 && (
        <div className={styles.fieldGroups}>
          <Accordion className={styles.accordion}>
            {FIELD_GROUPS.map((group) => {
              const groupFields = filteredGroupedFields[group.id] || [];
              const isExpanded = expandedGroups.has(group.id);

              if (groupFields.length === 0) return null;

              return (
                <AccordionItem
                  key={group.id}
                  title={
                    <div className={styles.groupHeader}>
                      <span className={styles.groupIcon}>{group.icon}</span>
                      <span className={styles.groupName}>{group.name}</span>
                      <Tag size="sm" type="gray">{groupFields.length}</Tag>
                    </div>
                  }
                  open={isExpanded}
                  onClick={(e) => toggleGroup(group.id, e)}
                >
                  <div
                    className={styles.fieldList}
                    onClick={(e) => {
                      // Prevent accordion toggle when clicking on field items
                      e.stopPropagation();
                    }}
                  >
                    {groupFields.map((field) => {
                      const isSelected = selectedFields.includes(field.id);
                      return (
                        <div key={field.id} className={styles.fieldItem} data-selected={isSelected}>
                          <div className={styles.fieldInfo}>
                            <span className={styles.fieldName}>{field.label}</span>
                            <div className={styles.fieldMeta}>
                              {isSelected && (
                                <Tag size="sm" type="green">Selected</Tag>
                              )}
                              <Tag size="sm" type="blue">{field.type}</Tag>
                              <Tag size="sm" type="gray">{field.source}</Tag>
                              {field.isRepeated && (
                                <Tag size="sm" type="purple">Repeated</Tag>
                              )}
                            </div>
                            <div className={styles.fieldName}>{field.name}</div>
                          </div>
                          <div className={styles.fieldActions}>
                            <Button
                              kind="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToColumns(field);
                              }}
                              disabled={disabled}
                            >
                              + Column
                            </Button>
                            <Button
                              kind="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToFilters(field);
                              }}
                              disabled={disabled}
                            >
                              + Filter
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionItem>
              );
            })}

            {/* Uncategorized fields */}
            {filteredGroupedFields['uncategorized'] && filteredGroupedFields['uncategorized'].length > 0 && (
              <AccordionItem
                key="uncategorized"
                title={
                  <div className={styles.groupHeader}>
                    <span className={styles.groupIcon}>📁</span>
                    <span className={styles.groupName}>Other Fields</span>
                    <Tag size="sm" type="gray">{filteredGroupedFields['uncategorized'].length}</Tag>
                  </div>
                }
                open={expandedGroups.has('uncategorized')}
                onClick={() => toggleGroup('uncategorized')}
              >
                <div className={styles.fieldList}>
                  {filteredGroupedFields['uncategorized']?.map((field) => {
                    const isSelected = selectedFields.includes(field.id);
                    return (
                      <div key={field.id} className={styles.fieldItem} data-selected={isSelected}>
                        <div className={styles.fieldInfo}>
                          <span className={styles.fieldName}>{field.label}</span>
                          <div className={styles.fieldMeta}>
                            {isSelected && (
                              <Tag size="sm" type="green">Selected</Tag>
                            )}
                            <Tag size="sm" type="blue">{field.type}</Tag>
                            <Tag size="sm" type="gray">{field.source}</Tag>
                            {field.isRepeated && (
                              <Tag size="sm" type="purple">Repeated</Tag>
                            )}
                          </div>
                          <div className={styles.fieldName}>{field.name}</div>
                        </div>
                        <div className={styles.fieldActions}>
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => onAddToColumns(field)}
                            disabled={disabled}
                          >
                            + Column
                          </Button>
                          <Button
                            kind="ghost"
                            size="sm"
                            onClick={() => onAddToFilters(field)}
                            disabled={disabled}
                          >
                            + Filter
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}

      {/* Summary */}
      {!isLoading && totalFields > 0 && (
        <div className={styles.summary}>
          {totalFields} field{totalFields !== 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
};

/**
 * Format field name into a readable label
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default DataCatalogue;
