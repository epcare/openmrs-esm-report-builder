import React, { useState, useMemo } from 'react';
import {
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tooltip,
  Layer,
} from '@carbon/react';
import { Add, Edit, Delete, Search } from '@carbon/icons-react';
import { AddMonitorModal } from './add-monitor-modal.component';
import { useETLMonitorBuilder } from './etl-monitor-builder.store';
import styles from './etl-monitor-builder.component.scss';

interface EmptyStateProps {
  header: string;
  body: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ header, body, action }) => (
  <div className={styles.emptyState}>
    <div className={styles.emptyStateContent}>
      <h3 className={styles.emptyStateTitle}>{header}</h3>
      <p className={styles.emptyStateBody}>{body}</p>
      {action && (
        <Button kind="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  </div>
);

export const ETLMonitorBuilder: React.FC = () => {
  const { monitors, loading, error, deleteMonitor, fetchMonitors } = useETLMonitorBuilder();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMonitors = useMemo(() => {
    if (!searchQuery) return monitors;
    return monitors.filter(
      (monitor) =>
        monitor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        monitor.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [monitors, searchQuery]);

  const handleDelete = async (monitorId: string) => {
    if (confirm('Are you sure you want to delete this monitor?')) {
      await deleteMonitor(monitorId);
      await fetchMonitors();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return '#198038'; // green
      case 'inactive':
        return '#8d8d8d'; // gray
      case 'error':
        return '#da1e28'; // red
      default:
        return '#0f62fe'; // blue
    }
  };

  const getMonitorTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      CUSTOM_SQL: 'Custom SQL',
      BASE_INDICATOR: 'Base Indicator',
      STATUS_CARD: 'Status Card',
      METRICS_GRID: 'Metrics Grid',
      PROGRESS: 'Progress',
      TABLE: 'Table',
      DETAILS: 'Details',
    };
    return typeLabels[type] || type;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Loading monitors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        header="Error loading monitors"
        body={error}
        action={{
          label: 'Retry',
          onClick: () => fetchMonitors(),
        }}
      />
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>ETL Monitor Builder</h1>
          <p className={styles.subtitle}>
            Create and manage custom ETL monitors to track your data pipelines and system health
          </p>
        </div>
        <Button kind="primary" renderIcon={Add} onClick={() => setIsModalOpen(true)}>
          New Monitor
        </Button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchBar}>
        <div className={styles.searchInputWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search monitors by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Monitors Table */}
      {filteredMonitors.length === 0 ? (
        <EmptyState
          header="No monitors found"
          body={
            searchQuery
              ? 'Try adjusting your search criteria'
              : 'Get started by creating your first ETL monitor'
          }
          action={
            !searchQuery
              ? {
                  label: 'Create Monitor',
                  onClick: () => setIsModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <Layer>
          <DataTable
            rows={filteredMonitors.map((monitor) => ({
              id: monitor.uuid,
              name: (
                <div className={styles.nameCell}>
                  <span className={styles.monitorName}>{monitor.name}</span>
                  {monitor.description && (
                    <Tooltip align="bottom" label={monitor.description}>
                      <span className={styles.monitorDescription}>{monitor.description}</span>
                    </Tooltip>
                  )}
                </div>
              ),
              type: getMonitorTypeLabel(monitor.monitorType),
              status: (
                <div className={styles.statusCell}>
                  <span
                    className={styles.statusDot}
                    style={{ backgroundColor: getStatusColor(monitor.active ? 'active' : 'inactive') }}
                  />
                  <span className={styles.statusText}>{monitor.active ? 'Active' : 'Inactive'}</span>
                </div>
              ),
              updated: monitor.dateChanged
                ? new Date(monitor.dateChanged).toLocaleDateString()
                : '-',
              actions: (
                <div className={styles.actionsCell}>
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Edit}
                    iconDescription="Edit"
                    hasIconOnly
                    onClick={() => {/* TODO: Implement edit */}}
                  />
                  <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Delete}
                    iconDescription="Delete"
                    hasIconOnly
                    onClick={() => handleDelete(monitor.uuid)}
                  />
                </div>
              ),
            }))}
            headers={[
              { key: 'name', header: 'Name' },
              { key: 'type', header: 'Type' },
              { key: 'status', header: 'Status' },
              { key: 'updated', header: 'Last Updated' },
              { key: 'actions', header: 'Actions' },
            ]}
          >
            {({ rows, headers, getHeaderProps, getTableProps }) => (
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
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.cells.map((cell, i) => (
                        <TableCell key={i}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTable>
        </Layer>
      )}

      {/* Add Monitor Modal */}
      {isModalOpen && (
        <AddMonitorModal
          onClose={() => setIsModalOpen(false)}
          onSave={async () => {
            await fetchMonitors();
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
