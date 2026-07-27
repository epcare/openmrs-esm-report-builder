/**
 * Compile Setup Modal
 *
 * A reusable modal for selecting report category and theme before compiling.
 * This modal appears when the user clicks "Compile" but the report is missing
 * category or theme information.
 *
 * Features:
 * - Category selection (required for compile)
 * - Theme selection (optional, for organization)
 * - Description for both selections explaining their purpose
 * - Confirm/Cancel actions
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  ButtonSet,
  Dropdown,
  InlineNotification,
  Stack,
  Tile,
} from '@carbon/react';
import { Information } from '@carbon/react/icons';

import { listReportCategories, type ReportCategoryDto } from '../../resources/report-category/report-category.api';

export type CompileSetupResult = {
  categoryUuid: string;
};

type Props = {
  /** Whether the modal is open */
  open: boolean;
  /** Current category UUID (if any) */
  currentCategoryUuid?: string;
  /** Callback when user confirms selection */
  onConfirm: (result: CompileSetupResult) => void;
  /** Callback when user cancels */
  onClose: () => void;
  /** Whether the report is a linelist report (affects messaging) */
  reportType?: 'linelist' | 'aggregate';
};

const CompileSetupModal: React.FC<Props> = ({
  open,
  currentCategoryUuid = '',
  onConfirm,
  onClose,
  reportType = 'linelist',
}) => {
  const [categories, setCategories] = useState<ReportCategoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selected value
  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryDto | null>(null);

  // Load categories when modal opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      setLoadError(null);

      listReportCategories()
        .then((cats) => {
          setCategories(cats);

          // Set current selection
          if (currentCategoryUuid) {
            const currentCat = cats.find(c => c.uuid === currentCategoryUuid);
            if (currentCat) setSelectedCategory(currentCat);
          }
        })
        .catch((err) => {
          setLoadError(err?.message || 'Failed to load categories');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, currentCategoryUuid]);

  const handleConfirm = () => {
    if (!selectedCategory?.uuid) {
      return; // Category is required
    }
    onConfirm({
      categoryUuid: selectedCategory.uuid,
    });
  };

  const canConfirm = Boolean(selectedCategory?.uuid);

  return (
    <Modal
      open={open}
      onRequestClose={ onClose}
      size="sm"
      modalHeading="Setup Report Before Compile"
      modalLabel="Report Organization"
      passiveModal
    >
      <ModalHeader />
      <ModalBody>
        <Stack gap={6}>
          {/* Information notification */}
          <Tile>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <Information size={20} />
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  Before compiling, please organize your report.
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                  Select a category to help organize and publish your report in the system.
                </p>
              </div>
            </div>
          </Tile>

          {/* Load error */}
          {loadError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={loadError}
              hideCloseButton
            />
          )}

          {/* Category Selection (Required) */}
          <div>
            <Dropdown
              id="category-select"
              titleText="Category *"
              label="Select a category"
              items={categories}
              itemToString={(item: ReportCategoryDto) => item?.name || ''}
              selectedItem={selectedCategory}
              onChange={({ selectedItem }) => setSelectedCategory(selectedItem as ReportCategoryDto)}
              disabled={loading}
            />
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.8 }}>
              Required. The category determines where this report appears in the report library.
            </p>
          </div>

          {/* Report type specific guidance */}
          {reportType === 'linelist' && (
            <Tile style={{ background: 'var(--cds-layer-01, #f4f4f4)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                <strong>Linelist Reports:</strong> These reports display patient-level data in rows.
                Categorizing helps users find linelist reports for specific use cases.
              </p>
            </Tile>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <ButtonSet>
          <Button kind="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            kind="primary"
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
          >
            Save & Compile
          </Button>
        </ButtonSet>
      </ModalFooter>
    </Modal>
  );
};

export default CompileSetupModal;
