/**
 * ETL Tasks Configuration and Execution Page
 *
 * This page displays ETL tasks configured via frontend config and allows execution.
 * Tasks are configured by setting the 'etlTasks.taskNames' config option.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  InlineLoading,
  Tile,
  Tag,
  InlineNotification,
  Stack,
} from '@carbon/react';
import { Play, Renew, Settings } from '@carbon/react/icons';
import { showNotification, showToast, useConfig } from '@openmrs/esm-framework';
import {
  fetchTasksByNames,
  executeETLTask,
} from '../../resources/etl-task/etl-task.api';
import type { OpenMRSTaskDefinition } from '../../resources/etl-task/etl-task.types';
import Header from '../shared/header/header.component';
import styles from './etl-tasks-page.component.scss';

export default function ETLTasksPage() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<OpenMRSTaskDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingTaskName, setExecutingTaskName] = useState<string | null>(null);

  // Get ETL task config from frontend config (now an array)
  const config = useConfig<any>();
  const etlTaskNames = useMemo(() => config?.etlTasks?.tasks || [], [config?.etlTasks?.tasks]);

  // Load tasks function
  const loadTasks = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      if (etlTaskNames.length > 0) {
        // Convert array to comma-separated string for the API
        const taskNamesString = etlTaskNames.join(', ');
        const taskList = await fetchTasksByNames(taskNamesString, signal);
        setTasks(taskList);
      } else {
        setTasks([]);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load ETL tasks');
    } finally {
      setLoading(false);
    }
  }, [etlTaskNames]);

  // Load tasks when config changes
  useEffect(() => {
    const ac = new AbortController();
    loadTasks(ac.signal);
    return () => ac.abort();
  }, [loadTasks]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    const ac = new AbortController();
    await loadTasks(ac.signal);
    showToast({
      title: t('refreshSuccess', 'Refresh Successful'),
      kind: 'success',
      description: t('tasksRefreshed', 'ETL tasks have been refreshed'),
    });
  }, [loadTasks, t]);

  // Execute task
  const executeTask = useCallback(
    async (task: OpenMRSTaskDefinition) => {
      setExecutingTaskName(task.name);
      try {
        await executeETLTask(task.name);
        showToast({
          critical: true,
          title: t('taskExecutionSuccess', 'Execution Successful'),
          kind: 'success',
          description: t('taskExecutedSuccessfully', 'Task {{name}} executed successfully', { name: task.name }),
        });
      } catch (err: any) {
        showNotification({
          title: t('taskExecutionFailed', 'Task Execution Failed'),
          kind: 'error',
          critical: true,
          description: err?.message ?? 'Task execution failed',
        });
      } finally {
        setExecutingTaskName(null);
      }
    },
    [t]
  );

  // Get task icon based on task class
  const getTaskIcon = (taskClass: string) => {
    if (taskClass.toLowerCase().includes('etl') || taskClass.toLowerCase().includes('extract')) {
      return '📊';
    } else if (taskClass.toLowerCase().includes('transform')) {
      return '🔄';
    } else if (taskClass.toLowerCase().includes('load') || taskClass.toLowerCase().includes('import')) {
      return '📥';
    } else if (taskClass.toLowerCase().includes('sync')) {
      return '🔁';
    } else if (taskClass.toLowerCase().includes('report')) {
      return '📋';
    }
    return '⚙️';
  };

  // Get task type from task class
  const getTaskType = (taskClass: string) => {
    if (taskClass.toLowerCase().includes('upgrade')) return 'Upgrade';
    if (taskClass.toLowerCase().includes('etl')) return 'ETL';
    if (taskClass.toLowerCase().includes('sync')) return 'Sync';
    if (taskClass.toLowerCase().includes('download')) return 'Download';
    if (taskClass.toLowerCase().includes('initialize')) return 'Initialize';
    if (taskClass.toLowerCase().includes('update')) return 'Update';
    return 'Task';
  };

  return (
    <Stack gap={5}>
      <Header
        title="ETL Tasks"
        subtitle="Execute ETL processes for data extraction, transformation, and loading."
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0 }}>Configured Tasks</h4>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--cds-text-02)', fontSize: '0.875rem' }}>
              {etlTaskNames.length > 0
                ? `Tasks: ${etlTaskNames.join(', ')}`
                : 'No ETL tasks configured. Configure via frontend config: etlTasks.tasks'}
            </p>
          </div>
          <Button
            kind="tertiary"
            renderIcon={Renew}
            onClick={handleRefresh}
            disabled={loading}>
            {loading ? t('loading', 'Loading...') : t('refresh', 'Refresh')}
          </Button>
        </div>

        {error && <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />}

        {/* Tasks List */}
        {loading && tasks.length === 0 ? (
          <InlineLoading description={t('loadingETLTasks', 'Loading ETL tasks...')} />
        ) : tasks.length === 0 && etlTaskNames.length > 0 && !loading ? (
          <Tile className={styles.emptyState}>
            <Settings size={48} className={styles.emptyStateIcon} />
            <h3>{t('noTasksFound', 'No Tasks Found')}</h3>
            <p>
              {t('noTasksFoundDesc', 'No ETL tasks found for the configured task names. Verify the task names match existing OpenMRS task definitions.')}
            </p>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--cds-text-02)' }}>
              <strong>Configured:</strong> {etlTaskNames.join(', ')}
            </p>
          </Tile>
        ) : tasks.length === 0 && etlTaskNames.length === 0 && !loading ? (
          <Tile className={styles.emptyState}>
            <Settings size={48} className={styles.emptyStateIcon} />
            <h3>{t('noConfig', 'No Configuration')}</h3>
            <p>
              {t('noConfigDesc', 'No ETL tasks have been configured. Configure the frontend config option "etlTasks.tasks" with an array of task names.')}
            </p>
          </Tile>
        ) : (
          <div className={styles.tasksGrid}>
            {tasks.map((task) => (
              <Tile key={task.uuid} className={styles.taskTile}>
                <div className={styles.taskHeader}>
                  <span className={styles.taskIcon}>{getTaskIcon(task.taskClass)}</span>
                  <div className={styles.taskInfo}>
                    <h4 className={styles.taskName}>{task.name}</h4>
                    <p className={styles.taskDescription}>{task.description || task.taskClass}</p>
                  </div>
                  <Tag className={styles.taskTypeTag} type="blue">
                    {getTaskType(task.taskClass)}
                  </Tag>
                </div>

                <div className={styles.taskMetadata}>
                  <span className={styles.taskClass} title={task.taskClass}>
                    {task.taskClass}
                  </span>
                </div>

                <div className={styles.taskActions}>
                  <Button
                    kind="primary"
                    size="sm"
                    renderIcon={executingTaskName === task.name ? Renew : Play}
                    onClick={() => executeTask(task)}
                    disabled={executingTaskName !== null}>
                    {executingTaskName === task.name
                      ? t('executing', 'Executing...')
                      : executingTaskName !== null
                      ? t('pleaseWait', 'Please Wait')
                      : t('execute', 'Execute')}
                  </Button>
                </div>

                {executingTaskName === task.name && (
                  <div className={styles.executionStatus}>
                    <InlineLoading description={t('executingTask', 'Executing task...')} />
                  </div>
                )}
              </Tile>
            ))}
          </div>
        )}
      </div>
    </Stack>
  );
}
