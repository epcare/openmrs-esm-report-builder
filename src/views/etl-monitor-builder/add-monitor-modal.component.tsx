import React, { useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalFooter,
  Button,
  TextInput,
  TextArea,
  Select,
  SelectItem,
  Layer,
  Tag,
} from '@carbon/react';
import { Play, Close } from '@carbon/icons-react';
import styles from './add-monitor-modal.component.scss';

interface AddMonitorModalProps {
  onClose: () => void;
  onSave: () => void;
}

const MONITOR_TYPES = [
  { value: 'CUSTOM_SQL', label: 'Custom SQL' },
  { value: 'BASE_INDICATOR', label: 'Base Indicator' },
  { value: 'STATUS_CARD', label: 'Status Card' },
  { value: 'METRICS_GRID', label: 'Metrics Grid' },
  { value: 'PROGRESS', label: 'Progress' },
  { value: 'TABLE', label: 'Table' },
  { value: 'DETAILS', label: 'Details' },
];

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    monitorType: 'CUSTOM_SQL',
    sqlQuery: '',
    description: '',
    tags: [] as string[],
  });

  const [tagInput, setTagInput] = useState('');
  const [queryResults, setQueryResults] = useState<any>(null);
  const [isRunningQuery, setIsRunningQuery] = useState(false);

  const handleRunQuery = async () => {
    if (!formData.sqlQuery.trim()) {
      return;
    }

    setIsRunningQuery(true);
    try {
      // TODO: Implement actual query execution
      // For now, simulate a delay and show placeholder results
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setQueryResults({ success: true, data: [] });
    } catch (error) {
      setQueryResults({ success: false, error: 'Query failed' });
    } finally {
      setIsRunningQuery(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const handleSave = async () => {
    // TODO: Implement actual save logic
    console.log('Saving monitor:', formData);
    await onSave();
  };

  const isFormValid = formData.name.trim() && formData.sqlQuery.trim();

  return (
    <Modal
      open
      onRequestClose={onClose}
      size="lg"
      className={styles.modal}
      modalHeading=""
      preventCloseOnClickOutside
    >
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>Add New Monitor</h2>
        <Button
          kind="ghost"
          renderIcon={Close}
          iconDescription="Close"
          onClick={onClose}
          hasIconOnly
        />
      </div>

      <ModalBody className={styles.modalBody}>
        <Layer className={styles.formGroup}>
          <label className={styles.label}>Monitor Name</label>
          <TextInput
            id="monitorName"
            placeholder="Enter monitor name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            labelText=""
          />
        </Layer>

        <Layer className={styles.formGroup}>
          <label className={styles.label}>Monitor Type</label>
          <Select
            id="monitorType"
            labelText=""
            value={formData.monitorType}
            onChange={(e) => setFormData({ ...formData, monitorType: e.target.value })}
          >
            {MONITOR_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value} text={type.label}>
                {type.label}
              </SelectItem>
            ))}
          </Select>
        </Layer>

        <Layer className={styles.formGroup}>
          <label className={styles.label}>SQL Query</label>
          <TextArea
            id="sqlQuery"
            placeholder="Enter your SQL query here..."
            value={formData.sqlQuery}
            onChange={(e) => setFormData({ ...formData, sqlQuery: e.target.value })}
            labelText=""
            rows={6}
            className={styles.sqlTextArea}
          />
          <div className={styles.queryActions}>
            <Button
              kind="tertiary"
              renderIcon={Play}
              onClick={handleRunQuery}
              disabled={!formData.sqlQuery.trim() || isRunningQuery}
              size="sm"
            >
              {isRunningQuery ? 'Running...' : 'Run Query'}
            </Button>
          </div>
          {queryResults && (
            <div className={styles.queryResults}>
              {queryResults.success ? (
                <p className={styles.successText}>✓ Query executed successfully</p>
              ) : (
                <p className={styles.errorText}>✗ Query failed: {queryResults.error}</p>
              )}
            </div>
          )}
        </Layer>

        <Layer className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <TextArea
            id="description"
            placeholder="Enter description..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            labelText=""
            rows={3}
          />
        </Layer>

        <Layer className={styles.formGroup}>
          <label className={styles.label}>Tags</label>
          <div className={styles.tagInputContainer}>
            <TextInput
              id="tags"
              placeholder="Enter tags separated by commas"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              labelText=""
            />
          </div>
          {formData.tags.length > 0 && (
            <div className={styles.tagsContainer}>
              {formData.tags.map((tag) => (
                <Tag key={tag} type="cool-gray">
                  {tag}
                </Tag>
              ))}
            </div>
          )}
        </Layer>
      </ModalBody>

      <ModalFooter className={styles.modalFooter}>
        <Button kind="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button kind="primary" onClick={handleSave} disabled={!isFormValid}>
          Create Monitor
        </Button>
      </ModalFooter>
    </Modal>
  );
};
