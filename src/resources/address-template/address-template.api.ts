/**
 * Address Template API
 *
 * Fetches and parses the OpenMRS address template configuration.
 * The address template is stored in the system setting "layout.address.format"
 * and defines the mapping between standard OpenMRS address fields and
 * implementation-specific names (e.g., UgandaEMR: address5 → Village).
 */

import { omrsGet } from '../openmrs-api';

/**
 * Parsed address field mapping
 */
export type AddressFieldMapping = {
  /** Standard OpenMRS field name (e.g., "address5", "stateProvince") */
  field: string;
  /** Implementation-specific label (e.g., "ugandaemr.address.village") */
  label: string;
  /** Display name extracted from label (e.g., "Village") */
  display: string;
};

/**
 * Address template configuration
 */
export type AddressTemplate = {
  /** Mappings of field names to labels */
  nameMappings: AddressFieldMapping[];
  /** Size mappings for each field */
  sizeMappings: Record<string, number>;
  /** Default values for fields */
  elementDefaults: Record<string, string>;
  /** Ordered list of fields for line-by-line format */
  lineByLineFormat: string[];
};

/**
 * Parse XML string to extract address template configuration
 */
function parseAddressTemplateXml(xmlString: string): AddressTemplate {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  // Parse nameMappings
  const nameMappings: AddressFieldMapping[] = [];
  const entryNodes = xmlDoc.querySelectorAll('nameMappings entry');

  entryNodes.forEach((entry) => {
    const fieldNode = entry.querySelector('string');
    if (!fieldNode) return;

    const field = fieldNode.textContent?.trim();
    const labelNode = entry.querySelectorAll('string')[1];
    const label = labelNode?.textContent?.trim();

    if (field && label) {
      // Extract display name from label (e.g., "ugandaemr.address.village" → "Village")
      const parts = label.split('.');
      const display = parts[parts.length - 1] || field;

      nameMappings.push({
        field,
        label,
        display: display.charAt(0).toUpperCase() + display.slice(1),
      });
    }
  });

  // Parse sizeMappings
  const sizeMappings: Record<string, number> = {};
  const sizeEntries = xmlDoc.querySelectorAll('sizeMappings entry');

  sizeEntries.forEach((entry) => {
    const fieldNode = entry.querySelector('string');
    const sizeNode = entry.querySelectorAll('string')[1];

    const field = fieldNode?.textContent?.trim();
    const size = sizeNode?.textContent?.trim();

    if (field && size) {
      sizeMappings[field] = parseInt(size, 10);
    }
  });

  // Parse elementDefaults
  const elementDefaults: Record<string, string> = {};
  const defaultEntries = xmlDoc.querySelectorAll('elementDefaults entry');

  defaultEntries.forEach((entry) => {
    const fieldNode = entry.querySelector('string');
    const valueNode = entry.querySelectorAll('string')[1];

    const field = fieldNode?.textContent?.trim();
    const value = valueNode?.textContent?.trim();

    if (field && value) {
      elementDefaults[field] = value;
    }
  });

  // Parse lineByLineFormat
  const lineByLineFormat: string[] = [];
  const formatNodes = xmlDoc.querySelectorAll('lineByLineFormat string');

  formatNodes.forEach((node) => {
    const value = node.textContent?.trim();
    if (value) {
      lineByLineFormat.push(value);
    }
  });

  return {
    nameMappings,
    sizeMappings,
    elementDefaults,
    lineByLineFormat,
  };
}

/**
 * Fetch address template from OpenMRS system setting
 */
export async function getAddressTemplate(): Promise<AddressTemplate> {
  try {
    const response = await omrsGet<any>(
      '/systemsetting?q=layout.address.format&v=full'
    );

    // Extract the value from the response
    const xmlValue = response?.results?.[0]?.value;

    if (!xmlValue) {
      console.warn('No address template found in system settings');
      return getDefaultAddressTemplate();
    }

    return parseAddressTemplateXml(xmlValue);
  } catch (error) {
    console.error('Failed to fetch address template:', error);
    return getDefaultAddressTemplate();
  }
}

/**
 * Get default address template (fallback)
 * Uses standard OpenMRS address field names
 */
function getDefaultAddressTemplate(): AddressTemplate {
  return {
    nameMappings: [
      { field: 'address1', label: 'Address Line 1', display: 'Address 1' },
      { field: 'address2', label: 'Address Line 2', display: 'Address 2' },
      { field: 'address3', label: 'Address 3', display: 'Address 3' },
      { field: 'address4', label: 'Address 4', display: 'Address 4' },
      { field: 'address5', label: 'Address 5', display: 'Address 5' },
      { field: 'cityVillage', label: 'City/Village', display: 'City/Village' },
      { field: 'stateProvince', label: 'State/Province', display: 'State' },
      { field: 'countyDistrict', label: 'County/District', display: 'District' },
      { field: 'country', label: 'Country', display: 'Country' },
      { field: 'postalCode', label: 'Postal Code', display: 'Postal Code' },
      { field: 'latitude', label: 'Latitude', display: 'Latitude' },
      { field: 'longitude', label: 'Longitude', display: 'Longitude' },
    ],
    sizeMappings: {},
    elementDefaults: {},
    lineByLineFormat: [],
  };
}

/**
 * Get display label for an address field
 */
export function getAddressFieldLabel(
  field: string,
  template: AddressTemplate
): string {
  const mapping = template.nameMappings.find(m => m.field === field);
  return mapping?.display || field;
}
