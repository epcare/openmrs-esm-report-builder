import React from 'react';
import {
  Button,
  Tile,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableContainer,
  Stack,
  Modal,
  ModalBody,
  ModalFooter,
  TextInput,
  Select,
  SelectItem,
  FormGroup,
  InlineNotification,
  Tag,
} from '@carbon/react';
import { Add, TrashCan, Edit } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type DimensionDefinition = {
  name: string;
  type: 'AGE_GROUPS' | 'CONCEPT';
  groups: Array<{
    key: string;
    label: string;
    minAge?: number;
    maxAge?: number;
    ageUnit?: string;
    conceptUuid?: string;
  }>;
};

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const dimensionTypes = [
  { value: 'AGE_GROUPS', label: 'Age Groups' },
  { value: 'CONCEPT', label: 'Concept Mapping' },
];

const ageUnits = [
  { value: 'YEARS', label: 'Years' },
  { value: 'MONTHS', label: 'Months' },
  { value: 'DAYS', label: 'Days' },
];

const LegacyReportDimensionsTab: React.FC<Props> = ({ report, onChange }) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showGroupModal, setShowGroupModal] = React.useState(false);
  const [currentDimension, setCurrentDimension] = React.useState<DimensionDefinition>({
    name: '',
    type: 'AGE_GROUPS',
    groups: [],
  });
  const [currentGroup, setCurrentGroup] = React.useState<{
    key: string;
    label: string;
    minAge?: number;
    maxAge?: number;
    ageUnit?: string;
    conceptUuid?: string;
  }>({
    key: '',
    label: '',
    ageUnit: 'YEARS',
  });
  const [editingGroupIndex, setEditingGroupIndex] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const dimensions = report.advancedFeatures?.indicatorDataSet?.dimensionDefinitions || [];

  const handleAddDimension = () => {
    setCurrentDimension({
      name: '',
      type: 'AGE_GROUPS',
      groups: [],
    });
    setEditingIndex(null);
    setShowModal(true);
    setError(null);
  };

  const handleEditDimension = (index: number) => {
    setCurrentDimension(JSON.parse(JSON.stringify(dimensions[index])));
    setEditingIndex(index);
    setShowModal(true);
    setError(null);
  };

  const handleDeleteDimension = (index: number) => {
    if (confirm('Are you sure you want to delete this dimension? This will affect indicators that use it.')) {
      const updatedDimensions = dimensions.filter((_, i) => i !== index);
      onChange({
        ...report,
        advancedFeatures: {
          ...report.advancedFeatures,
          indicatorDataSet: {
            ...report.advancedFeatures.indicatorDataSet,
            dimensionDefinitions: updatedDimensions,
          },
        },
      });
    }
  };

  const handleSaveDimension = () => {
    if (!currentDimension.name.trim()) {
      setError('Dimension name is required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = dimensions.some((dim, index) =>
      dim.name === currentDimension.name && index !== editingIndex
    );

    if (isDuplicate) {
      setError('A dimension with this name already exists');
      return;
    }

    if (currentDimension.groups.length === 0) {
      setError('At least one group is required');
      return;
    }

    let updatedDimensions;
    if (editingIndex !== null) {
      updatedDimensions = dimensions.map((dim, index) =>
        index === editingIndex ? currentDimension : dim
      );
    } else {
      updatedDimensions = [...dimensions, currentDimension];
    }

    onChange({
      ...report,
      advancedFeatures: {
        ...report.advancedFeatures,
        indicatorDataSet: {
          ...report.advancedFeatures.indicatorDataSet,
          dimensionDefinitions: updatedDimensions,
        },
      },
    });

    setShowModal(false);
    setCurrentDimension({
      name: '',
      type: 'AGE_GROUPS',
      groups: [],
    });
    setEditingIndex(null);
    setError(null);
  };

  const handleAddGroup = () => {
    setCurrentGroup({
      key: '',
      label: '',
      ageUnit: 'YEARS',
    });
    setEditingGroupIndex(null);
    setShowGroupModal(true);
    setError(null);
  };

  const handleEditGroup = (groupIndex: number) => {
    setCurrentGroup({ ...currentDimension.groups[groupIndex] });
    setEditingGroupIndex(groupIndex);
    setShowGroupModal(true);
    setError(null);
  };

  const handleDeleteGroup = (groupIndex: number) => {
    const updatedGroups = currentDimension.groups.filter((_, i) => i !== groupIndex);
    setCurrentDimension({ ...currentDimension, groups: updatedGroups });
  };

  const handleSaveGroup = () => {
    if (!currentGroup.key.trim()) {
      setError('Group key is required');
      return;
    }
    if (!currentGroup.label.trim()) {
      setError('Group label is required');
      return;
    }

    // Check for duplicate keys within the dimension
    const isDuplicate = currentDimension.groups.some((group, index) =>
      group.key === currentGroup.key && index !== editingGroupIndex
    );

    if (isDuplicate) {
      setError('A group with this key already exists in this dimension');
      return;
    }

    // Validate based on dimension type
    if (currentDimension.type === 'AGE_GROUPS') {
      if (currentGroup.minAge === undefined || currentGroup.maxAge === undefined) {
        setError('Age range is required for age groups');
        return;
      }
    } else if (currentDimension.type === 'CONCEPT') {
      if (!currentGroup.conceptUuid?.trim()) {
        setError('Concept UUID is required for concept mappings');
        return;
      }
    }

    let updatedGroups;
    if (editingGroupIndex !== null) {
      updatedGroups = currentDimension.groups.map((group, index) =>
        index === editingGroupIndex ? currentGroup : group
      );
    } else {
      updatedGroups = [...currentDimension.groups, currentGroup];
    }

    setCurrentDimension({ ...currentDimension, groups: updatedGroups });
    setShowGroupModal(false);
    setCurrentGroup({
      key: '',
      label: '',
      ageUnit: 'YEARS',
    });
    setEditingGroupIndex(null);
    setError(null);
  };

  return (
    <Stack gap={6}>
      <Tile>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Dimension Definitions</h4>
            <p style={{ opacity: 0.7, margin: 0 }}>
              Define dimensions (age groups, gender concepts) for indicator disaggregation
            </p>
          </div>
          <Button size="sm" kind="primary" renderIcon={Add} onClick={handleAddDimension}>
            Add Dimension
          </Button>
        </div>
      </Tile>

      {dimensions.length === 0 ? (
        <Tile style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ opacity: 0.7 }}>No dimensions defined yet. Click "Add Dimension" to create one.</p>
        </Tile>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {dimensions.map((dimension, dimIndex) => (
            <Tile key={dimIndex}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h5 style={{ margin: 0 }}>{dimension.name}</h5>
                    <Tag type="blue">{dimension.type}</Tag>
                  </div>
                  <p style={{ opacity: 0.7, fontSize: '0.9rem', margin: 0 }}>
                    {dimension.groups.length} group{dimension.groups.length !== 1 ? 's' : ''} defined
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={Edit}
                    hasIconOnly
                    iconDescription="Edit"
                    onClick={() => handleEditDimension(dimIndex)}
                  />
                  <Button
                    size="sm"
                    kind="ghost"
                    renderIcon={TrashCan}
                    hasIconOnly
                    iconDescription="Delete"
                    onClick={() => handleDeleteDimension(dimIndex)}
                  />
                </div>
              </div>

              <TableContainer style={{ marginTop: '1rem' }}>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Group Key</TableHeader>
                      <TableHeader>Label</TableHeader>
                      <TableHeader>Configuration</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dimension.groups.map((group, groupIndex) => (
                      <TableRow key={groupIndex}>
                        <TableCell>
                          <code>{group.key}</code>
                        </TableCell>
                        <TableCell>{group.label}</TableCell>
                        <TableCell>
                          {dimension.type === 'AGE_GROUPS' ? (
                            <code style={{ fontSize: '0.85em' }}>
                              {group.minAge} - {group.maxAge} {group.ageUnit}
                            </code>
                          ) : (
                            <code style={{ fontSize: '0.85em' }}>
                              {group.conceptUuid}
                            </code>
                          )}
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              kind="ghost"
                              renderIcon={TrashCan}
                              hasIconOnly
                              iconDescription="Delete Group"
                              onClick={() => {
                                setCurrentDimension(dimension);
                                handleDeleteGroup(groupIndex);
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Tile>
          ))}
        </div>
      )}

      {/* Dimension Editor Modal */}
      <Modal
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        modalHeading={editingIndex !== null ? 'Edit Dimension' : 'Add Dimension'}
        size="lg"
      >
        <ModalBody>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginBottom: '1rem' }}
              onCloseButtonClick={() => setError(null)}
            />
          )}

          <FormGroup legendText="">
            <TextInput
              id="dimension-name"
              labelText="Dimension Name"
              placeholder="e.g., age or gender"
              value={currentDimension.name}
              onChange={(e) => setCurrentDimension({ ...currentDimension, name: e.target.value })}
              style={{ marginBottom: '1rem' }}
              disabled={editingIndex !== null}
            />
          </FormGroup>

          <FormGroup legendText="">
            <Select
              id="dimension-type"
              labelText="Dimension Type"
              value={currentDimension.type}
              onChange={(e) => setCurrentDimension({
                ...currentDimension,
                type: e.target.value as 'AGE_GROUPS' | 'CONCEPT',
                groups: [], // Reset groups when type changes
              })}
              disabled={editingIndex !== null}
            >
              {dimensionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} text={type.label} />
              ))}
            </Select>
          </FormGroup>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h5 style={{ margin: 0 }}>
                {currentDimension.type === 'AGE_GROUPS' ? 'Age Groups' : 'Concept Mappings'}
              </h5>
              <Button size="sm" kind="primary" renderIcon={Add} onClick={handleAddGroup}>
                Add Group
              </Button>
            </div>

            {currentDimension.groups.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--cds-field-01)',
                borderRadius: '4px',
                opacity: 0.7
              }}>
                No groups added yet. Click "Add Group" to create one.
              </div>
            ) : (
              <TableContainer>
                <Table size="sm">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Key</TableHeader>
                      <TableHeader>Label</TableHeader>
                      <TableHeader>Details</TableHeader>
                      <TableHeader>Actions</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentDimension.groups.map((group, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <code>{group.key}</code>
                        </TableCell>
                        <TableCell>{group.label}</TableCell>
                        <TableCell>
                          {currentDimension.type === 'AGE_GROUPS' ? (
                            <span style={{ fontSize: '0.85em' }}>
                              {group.minAge} - {group.maxAge} {group.ageUnit}
                            </span>
                          ) : (
                            <code style={{ fontSize: '0.85em' }}>
                              {group.conceptUuid?.substring(0, 20)}...
                            </code>
                          )}
                        </TableCell>
                        <TableCell>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              kind="ghost"
                              renderIcon={Edit}
                              hasIconOnly
                              iconDescription="Edit"
                              onClick={() => handleEditGroup(index)}
                            />
                            <Button
                              size="sm"
                              kind="ghost"
                              renderIcon={TrashCan}
                              hasIconOnly
                              iconDescription="Delete"
                              onClick={() => handleDeleteGroup(index)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSaveDimension}>
            {editingIndex !== null ? 'Update' : 'Add'} Dimension
          </Button>
        </ModalFooter>
      </Modal>

      {/* Group Editor Modal */}
      <Modal
        open={showGroupModal}
        onRequestClose={() => setShowGroupModal(false)}
        modalHeading={editingGroupIndex !== null ? 'Edit Group' : 'Add Group'}
        size="sm"
      >
        <ModalBody>
          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              style={{ marginBottom: '1rem' }}
              onCloseButtonClick={() => setError(null)}
            />
          )}

          <FormGroup legendText="">
            <TextInput
              id="group-key"
              labelText="Group Key"
              placeholder="e.g., under_5 or male"
              value={currentGroup.key}
              onChange={(e) => setCurrentGroup({ ...currentGroup, key: e.target.value })}
              style={{ marginBottom: '1rem' }}
            />
          </FormGroup>

          <FormGroup legendText="">
            <TextInput
              id="group-label"
              labelText="Display Label"
              placeholder="e.g., Under 5 years or Male"
              value={currentGroup.label}
              onChange={(e) => setCurrentGroup({ ...currentGroup, label: e.target.value })}
              style={{ marginBottom: '1rem' }}
            />
          </FormGroup>

          {currentDimension.type === 'AGE_GROUPS' && (
            <>
              <FormGroup legendText="">
                <TextInput
                  id="min-age"
                  labelText="Minimum Age"
                  placeholder="0"
                  value={currentGroup.minAge?.toString() || ''}
                  onChange={(e) => setCurrentGroup({ ...currentGroup, minAge: parseFloat(e.target.value) })}
                  style={{ marginBottom: '1rem' }}
                />
              </FormGroup>

              <FormGroup legendText="">
                <TextInput
                  id="max-age"
                  labelText="Maximum Age"
                  placeholder="150"
                  value={currentGroup.maxAge?.toString() || ''}
                  onChange={(e) => setCurrentGroup({ ...currentGroup, maxAge: parseFloat(e.target.value) })}
                  style={{ marginBottom: '1rem' }}
                />
              </FormGroup>

              <FormGroup legendText="">
                <Select
                  id="age-unit"
                  labelText="Age Unit"
                  value={currentGroup.ageUnit}
                  onChange={(e) => setCurrentGroup({ ...currentGroup, ageUnit: e.target.value })}
                >
                  {ageUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value} text={unit.label} />
                  ))}
                </Select>
              </FormGroup>
            </>
          )}

          {currentDimension.type === 'CONCEPT' && (
            <FormGroup legendText="">
              <TextInput
                id="concept-uuid"
                labelText="Concept UUID"
                placeholder="e.g., 90001"
                value={currentGroup.conceptUuid || ''}
                onChange={(e) => setCurrentGroup({ ...currentGroup, conceptUuid: e.target.value })}
              />
            </FormGroup>
          )}
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowGroupModal(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSaveGroup}>
            {editingGroupIndex !== null ? 'Update' : 'Add'} Group
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
};

export default LegacyReportDimensionsTab;
