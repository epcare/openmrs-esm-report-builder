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
  TextInput,
  Select,
  SelectItem,
  FormGroup,
  Stack,
  Modal,
  ModalBody,
  ModalFooter,
  InlineNotification,
} from '@carbon/react';
import { Add, TrashCan, Edit } from '@carbon/icons-react';
import type { LegacyReportConfig } from '../legacy-report-editor-page.component';

type Parameter = {
  name: string;
  label: string;
  type: string;
};

type Props = {
  report: LegacyReportConfig;
  onChange: (report: LegacyReportConfig) => void;
};

const parameterTypes = [
  { value: 'DATE', label: 'Date' },
  { value: 'LOCATION', label: 'Location' },
  { value: 'STRING', label: 'Text String' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'BOOLEAN', label: 'Yes/No' },
];

const LegacyReportParametersTab: React.FC<Props> = ({ report, onChange }) => {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [currentParam, setCurrentParam] = React.useState<Parameter>({ name: '', label: '', type: 'STRING' });
  const [error, setError] = React.useState<string | null>(null);

  const parameters = report.parameters || [];

  const handleAdd = () => {
    setCurrentParam({ name: '', label: '', type: 'STRING' });
    setEditingIndex(null);
    setShowModal(true);
    setError(null);
  };

  const handleEdit = (index: number) => {
    setCurrentParam({ ...parameters[index] });
    setEditingIndex(index);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this parameter?')) {
      const updatedParams = parameters.filter((_, i) => i !== index);
      onChange({
        ...report,
        parameters: updatedParams,
      });
    }
  };

  const handleSave = () => {
    if (!currentParam.name.trim()) {
      setError('Parameter name is required');
      return;
    }
    if (!currentParam.label.trim()) {
      setError('Parameter label is required');
      return;
    }

    // Check for duplicate parameter names
    const isDuplicate = parameters.some((param, index) =>
      param.name === currentParam.name && index !== editingIndex
    );

    if (isDuplicate) {
      setError('A parameter with this name already exists');
      return;
    }

    let updatedParams;
    if (editingIndex !== null) {
      updatedParams = parameters.map((param, index) =>
        index === editingIndex ? currentParam : param
      );
    } else {
      updatedParams = [...parameters, currentParam];
    }

    onChange({
      ...report,
      parameters: updatedParams,
    });

    setShowModal(false);
    setCurrentParam({ name: '', label: '', type: 'STRING' });
    setEditingIndex(null);
    setError(null);
  };

  return (
    <Stack gap={6}>
      <Tile>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ marginTop: 0 }}>Report Parameters</h4>
            <p style={{ opacity: 0.7, margin: 0 }}>
              Define input parameters that users will provide when running this report
            </p>
          </div>
          <Button size="sm" kind="primary" renderIcon={Add} onClick={handleAdd}>
            Add Parameter
          </Button>
        </div>
      </Tile>

      {parameters.length === 0 ? (
        <Tile style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ opacity: 0.7 }}>No parameters defined yet. Click "Add Parameter" to create one.</p>
        </Tile>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Parameter Name</TableHeader>
                <TableHeader>Display Label</TableHeader>
                <TableHeader>Data Type</TableHeader>
                <TableHeader>Usage in Queries</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {parameters.map((param, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <code>{param.name}</code>
                  </TableCell>
                  <TableCell>{param.label}</TableCell>
                  <TableCell>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--cds-tag-blue)',
                      fontSize: '0.85em',
                      fontWeight: 500
                    }}>
                      {param.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code style={{ fontSize: '0.85em', opacity: 0.7 }}>
                      :{param.name}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        size="sm"
                        kind="ghost"
                        renderIcon={Edit}
                        hasIconOnly
                        iconDescription="Edit"
                        onClick={() => handleEdit(index)}
                      />
                      <Button
                        size="sm"
                        kind="ghost"
                        renderIcon={TrashCan}
                        hasIconOnly
                        iconDescription="Delete"
                        onClick={() => handleDelete(index)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Tile style={{ background: 'var(--cds-background-information)' }}>
        <h5 style={{ marginTop: 0 }}>Parameter Usage in Reports</h5>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Parameters defined here can be used in SQL queries using the <code>:parameterName</code> syntax.
          For example, a parameter named <code>startDate</code> can be referenced in SQL as <code>:startDate</code>.
        </p>
        <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem', opacity: 0.85 }}>
          <li><strong>DATE parameters:</strong> Use <code>:startDate</code> and <code>:endDate</code> for date ranges</li>
          <li><strong>LOCATION parameters:</strong> Use <code>:location</code> to filter by facility/location</li>
          <li><strong>STRING/NUMBER parameters:</strong> Use for any additional filters or configuration values</li>
        </ul>
      </Tile>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        modalHeading={editingIndex !== null ? 'Edit Parameter' : 'Add Parameter'}
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
              id="param-name"
              labelText="Parameter Name"
              placeholder="e.g., startDate"
              value={currentParam.name}
              onChange={(e) => setCurrentParam({ ...currentParam, name: e.target.value })}
              style={{ marginBottom: '1rem' }}
              disabled={editingIndex !== null} // Don't allow changing name once set
            />
          </FormGroup>

          <FormGroup legendText="">
            <TextInput
              id="param-label"
              labelText="Display Label"
              placeholder="e.g., Start Date"
              value={currentParam.label}
              onChange={(e) => setCurrentParam({ ...currentParam, label: e.target.value })}
              style={{ marginBottom: '1rem' }}
            />
          </FormGroup>

          <FormGroup legendText="">
            <Select
              id="param-type"
              labelText="Data Type"
              value={currentParam.type}
              onChange={(e) => setCurrentParam({ ...currentParam, type: e.target.value })}
            >
              {parameterTypes.map((type) => (
                <SelectItem key={type.value} value={type.value} text={type.label} />
              ))}
            </Select>
          </FormGroup>
        </ModalBody>

        <ModalFooter>
          <Button kind="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleSave}>
            {editingIndex !== null ? 'Update' : 'Add'} Parameter
          </Button>
        </ModalFooter>
      </Modal>
    </Stack>
  );
};

export default LegacyReportParametersTab;
