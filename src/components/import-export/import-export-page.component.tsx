import React from 'react';
import {
  Button,
  ButtonSet,
  ContentSwitcher,
  DataTable,
  Search,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tile,
} from '@carbon/react';
import { Download, Upload } from '@carbon/react/icons';

import { type PackageInfo, getAvailablePackages } from '../../resources/report-import-export/import-export-api';
import ExportReportModal from './export-report-modal.component';
import ImportPackageModal from './import-package-modal.component';
import Header from '../shared/header/header.component';
import { RB } from '../../constants/privileges';
import { useReportBuilderPrivileges } from '../../hooks/use-report-builder-privileges';

const PackageHeaders = [
  { key: 'name', header: 'Configuration' },
  { key: 'version', header: 'Version' },
  { key: 'size', header: 'Size' },
  { key: 'createdDate', header: 'Created' },
  { key: 'status', header: 'Status' },
  { key: 'actions', header: 'Action' },
];

type TabType = 'packages' | 'artifacts' | 'importHistory' | 'exportHistory';

const TABS: Array<{ value: TabType; label: string }> = [
  { value: 'artifacts', label: 'Artifacts' },
  { value: 'packages', label: 'Configurations' },
  { value: 'importHistory', label: 'History' },
];

const ImportExportPage: React.FC = () => {
  const { has: hasPrivilege } = useReportBuilderPrivileges();
  const canImport = hasPrivilege(RB.PACKAGE_IMPORT);
  const canExport = hasPrivilege(RB.PACKAGE_EXPORT);

  // Modal states
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<TabType>('packages');

  // Package browser state
  const [packages, setPackages] = React.useState<PackageInfo[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = React.useState(false);
  const [packagesError, setPackagesError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');

  // Load packages when filters change
  React.useEffect(() => {
    const loadPackages = async () => {
      setIsLoadingPackages(true);
      setPackagesError(null);
      try {
        const effectiveStatusFilter = statusFilter === 'all' ? undefined : statusFilter;
        const data = await getAvailablePackages({
          q: searchQuery || undefined,
          status: effectiveStatusFilter,
        });
        setPackages(data);
      } catch (err: any) {
        console.error('Failed to load packages:', err);
        setPackagesError(err.message || 'Failed to load packages');
      } finally {
        setIsLoadingPackages(false);
      }
    };
    loadPackages();
  }, [searchQuery, statusFilter]);

  // Debounced search
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const debouncedSearch = React.useCallback((value: string) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setSearchQuery(value), 300);
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleExportSuccess = () => {
    // Refresh packages list after successful export
    setSearchQuery('');
  };

  const handleImportSuccess = () => {
    // Refresh packages list after successful import
    setSearchQuery('');
  };

  const renderPackagesTab = () => (
    <Stack gap={4}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <h4 style={{ margin: 0 }}>Available Configurations</h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--cds-interactive-01)' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Status: All</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
      </div>

      <Search
        size="lg"
        labelText="Search"
        placeholder="Search configurations…"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => debouncedSearch(e.target.value)}
      />

      {isLoadingPackages ? <div>Loading…</div> : null}
      {!isLoadingPackages && packagesError ? (
        <div style={{ color: 'var(--cds-text-error, #da1e28)' }}>{packagesError}</div>
      ) : null}

      {!isLoadingPackages && packages.length > 0 && (
        <DataTable
          rows={packages.map((pkg) => ({
            id: pkg.path || pkg.name,
            name: pkg.name,
            version: pkg.version,
            size: formatBytes(pkg.size),
            createdDate: formatDate(pkg.exportedAt || ''),
            status: pkg.status === 'valid' ? 'Valid' : 'Invalid',
            action: 'Import',
          }))}
          headers={PackageHeaders}
        >
          {({ rows, headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header, i) => (
                      <TableHeader key={i} {...getHeaderProps({ header })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const pkg = packages.find((p) => (p.path || p.name) === row.id);
                    return (
                      <TableRow key={row.id}>
                        {row.cells.map((cell, i) => {
                          if (headers[i].key === 'status' && pkg) {
                            return (
                              <TableCell key={cell.id}>
                                <Tag type={pkg.status === 'valid' ? 'green' : 'red'}>{cell.value}</Tag>
                              </TableCell>
                            );
                          }
                          if (headers[i].key === 'action' && pkg) {
                            return (
                              <TableCell key={cell.id}>
                                {canImport && (
                                  <Button
                                    kind="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setShowImportModal(true);
                                    }}
                                    disabled={pkg.status !== 'valid'}
                                  >
                                    Import
                                  </Button>
                                )}
                              </TableCell>
                            );
                          }
                          return <TableCell key={cell.id}>{cell.value}</TableCell>;
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}

      {!isLoadingPackages && packages.length === 0 && (
        <Tile style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
            No configuration artifacts are available.
          </p>
          <p style={{ color: 'var(--cds-text-02)', marginBottom: '1rem' }}>
            Extract artifacts to backup or distribute reporting configuration.
          </p>
          {canExport && (
            <Button kind="primary" renderIcon={Download} onClick={() => setShowExportModal(true)}>
              Extract Artifacts
            </Button>
          )}
        </Tile>
      )}
    </Stack>
  );

  const renderArtifactsTab = () => (
    <Stack gap={4}>
      <Tile style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          Browse and export reporting artifacts
        </p>
        <p style={{ color: 'var(--cds-text-02)', marginBottom: '1rem' }}>
          Select individual artifacts to create custom distribution packages.
        </p>
        {canExport && (
          <Button kind="primary" renderIcon={Download} onClick={() => setShowExportModal(true)}>
            Export Artifacts
          </Button>
        )}
      </Tile>
    </Stack>
  );

  const renderHistoryPlaceholder = (title: string) => (
    <Stack gap={4}>
      <Tile style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          No {title.toLowerCase()} history recorded yet.
        </p>
        <p style={{ color: 'var(--cds-text-02)' }}>{title} operations will appear here after they are performed.</p>
      </Tile>
    </Stack>
  );

  const currentTabIndex = TABS.findIndex((tab) => tab.value === activeTab);

  return (
    <Stack gap={5}>
      <Header
        title="Report Builder Artifacts"
        subtitle="Initialize Report Builder with artifacts or extract reporting artifacts to file structures."
      />

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '1rem' }}>
        <div></div>
        <ButtonSet>
          {canImport && (
            <Button kind="secondary" renderIcon={Upload} onClick={() => setShowImportModal(true)}>
              Initialize Report Builder
            </Button>
          )}
          {canExport && (
            <Button kind="primary" renderIcon={Download} onClick={() => setShowExportModal(true)}>
              Extract Artifacts
            </Button>
          )}
        </ButtonSet>
      </div>

      {/* Tabs */}
      <ContentSwitcher
        selectedIndex={currentTabIndex}
        onChange={(event) => {
          const selectedTab = TABS.find((tab) => tab.value === event.name);
          if (selectedTab) {
            setActiveTab(selectedTab.value);
          }
        }}
        size="md"
      >
        {TABS.map((tab) => (
          <Switch key={tab.value} name={tab.value} text={tab.label} />
        ))}
      </ContentSwitcher>

      {/* Tab Content */}
      {activeTab === 'artifacts' && renderArtifactsTab()}
      {activeTab === 'packages' && renderPackagesTab()}
      {activeTab === 'importHistory' && renderHistoryPlaceholder('Import')}
      {activeTab === 'exportHistory' && renderHistoryPlaceholder('Export')}

      {/* Info hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--cds-text-02)', fontSize: '0.875rem' }}>
        <span style={{ fontSize: '1rem' }}>ⓘ</span>
        <span>Dependencies are resolved automatically during extraction and initialization.</span>
      </div>

      {/* Export Modal */}
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onSuccess={handleExportSuccess}
      />

      {/* Import Modal */}
      <ImportPackageModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </Stack>
  );
};

export default ImportExportPage;
