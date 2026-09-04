/**
 * ETL Tasks Administration Page
 *
 * Layout (mirrors docs/importexport/img.png):
 * - KPI strip: service health, running / active / failed counts, next scheduled run
 * - Configured Tasks: search + type filter + status tabs over a card grid
 * - Live Execution: the monitors configured in `etlTasks.progressMonitors`
 *   render as live auto-refreshing widgets, so a user who triggers "Run Now"
 *   can watch progress on the same page.
 *
 * Task data comes from the OpenMRS task definitions (started /
 * lastExecutionTime / repeatInterval); running/failed counts are heuristically
 * extracted from monitor data when the endpoints report status fields.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, InlineLoading, InlineNotification, Search, Stack, Tile } from '@carbon/react';
import {
  ChartBar,
  CheckmarkFilled,
  DataBase,
  ErrorFilled,
  Play,
  Renew,
  Settings,
  Time,
} from '@carbon/react/icons';
import classNames from 'classnames';
import { showNotification, showToast, useConfig } from '@openmrs/esm-framework';
import { executeETLTask, fetchConfiguredTasks } from '../../resources/etl-task/etl-task.api';
import type { ETLTasksConfig, OpenMRSTaskDefinition } from '../../resources/etl-task/etl-task.types';
import { fetchMonitorData, listETLMonitors } from '../../resources/etl-monitor/etl-monitor.api';
import type { ETLMonitorDto, MonitorDataResponse } from '../../types/etl-monitor';
import {
  computeNextRun,
  extractDurationFromMonitorData,
  formatLastRun,
  formatNextRun,
  resolveProgressMonitors,
  sumStatusCounts,
} from '../../utils/etl-task';
import type { ResolvedProgressMonitor } from '../../utils/etl-task';
import { EtlMonitorWidget } from '../etl-monitor/renderers/EtlMonitorWidget';
import Header from '../shared/header/header.component';
import styles from './etl-tasks-page.component.scss';

const RUNNING_PATTERN = /running|in.?progress|processing/i;
const FAILED_PATTERN = /fail|error/i;
const ALL_TYPES = 'All types';

function isAbortError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return e?.name === 'AbortError' || /abort/i.test(String(e?.message));
}

/** Broad task-type classification from the task class name (for the filter) */
function classifyTaskType(taskClass?: string): string {
  const c = (taskClass ?? '').toLowerCase();
  if (c.includes('upgrade')) return 'Upgrade';
  if (c.includes('sync')) return 'Sync';
  if (c.includes('download')) return 'Download';
  if (c.includes('initializ')) return 'Initialize';
  if (c.includes('update')) return 'Update';
  if (c.includes('report')) return 'Report';
  if (c.includes('etl') || c.includes('extract') || c.includes('flatten') || c.includes('mamba')) return 'ETL';
  return 'Task';
}

interface ETLTaskCardModel {
  name: string;
  definition?: OpenMRSTaskDefinition;
  unknown: boolean;
}

type StatusTab = 'all' | 'active' | 'inactive';

interface MetaItemProps {
  label: string;
  value: string;
}

function MetaItem({ label, value }: MetaItemProps) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue} title={value}>
        {value}
      </span>
    </div>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  iconTone: 'healthy' | 'info' | 'danger' | 'neutral';
  label: string;
  value: string;
  subtext: string;
}

function KpiCard({ icon, iconTone, label, value, subtext }: KpiCardProps) {
  return (
    <Tile className={styles.kpiCard}>
      <span className={classNames(styles.kpiIcon, styles[`kpiIcon${iconTone}`])}>{icon}</span>
      <div className={styles.kpiText}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiValue}>{value}</span>
        <span className={styles.kpiSubtext}>{subtext}</span>
      </div>
    </Tile>
  );
}

interface FilterTabProps {
  tab: StatusTab;
  label: string;
  count: number;
  activeTab: StatusTab;
  onSelect: (tab: StatusTab) => void;
}

function FilterTab({ tab, label, count, activeTab, onSelect }: FilterTabProps) {
  return (
    <button
      type="button"
      className={classNames(styles.filterTab, activeTab === tab && styles.filterTabActive)}
      onClick={() => onSelect(tab)}>
      {label}
      <span className={styles.countChip}>{count}</span>
    </button>
  );
}

export default function ETLTasksPage() {
  const { t } = useTranslation();

  const config = useConfig<{ etlTasks?: Partial<ETLTasksConfig> }>();
  const taskNames = useMemo(
    () =>
      (config.etlTasks?.tasks ?? []).filter(
        (name): name is string => typeof name === 'string' && name.trim().length > 0,
      ),
    [config.etlTasks?.tasks],
  );
  const monitorRefs = useMemo(
    () =>
      (config.etlTasks?.progressMonitors ?? []).filter((ref): ref is string => typeof ref === 'string'),
    [config.etlTasks?.progressMonitors],
  );

  const [taskDefs, setTaskDefs] = useState<OpenMRSTaskDefinition[]>([]);
  const [unknownNames, setUnknownNames] = useState<string[]>([]);
  const [monitors, setMonitors] = useState<ETLMonitorDto[]>([]);
  const [monitorsError, setMonitorsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executingTaskName, setExecutingTaskName] = useState<string | null>(null);

  const [monitorDataMap, setMonitorDataMap] = useState<Record<string, MonitorDataResponse>>({});
  const [monitorLoadingMap, setMonitorLoadingMap] = useState<Record<string, boolean>>({});
  const [monitorErrorsMap, setMonitorErrorsMap] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);

  const liveSectionRef = useRef<HTMLElement | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setMonitorsError(null);
      try {
        if (taskNames.length === 0 && monitorRefs.length === 0) {
          setTaskDefs([]);
          setUnknownNames([]);
          setMonitors([]);
          return;
        }
        const [taskResult, monitorList] = await Promise.all([
          taskNames.length > 0
            ? fetchConfiguredTasks(taskNames, signal)
            : Promise.resolve({ tasks: [], unknownNames: [] }),
          monitorRefs.length > 0
            ? listETLMonitors(undefined, signal).catch((e) => {
                if (!isAbortError(e)) {
                  setMonitorsError(e?.message ?? 'Failed to load ETL monitors');
                }
                return [];
              })
            : Promise.resolve([]),
        ]);
        if (signal?.aborted) return;
        setTaskDefs(taskResult.tasks);
        setUnknownNames(taskResult.unknownNames);
        setMonitors(monitorList);
      } catch (e) {
        if (!isAbortError(e)) {
          setError(e?.message ?? 'Failed to load ETL tasks');
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [taskNames, monitorRefs],
  );

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  // Monitor widgets: config order, deduped by resolved monitor, typos kept visible
  const progressMonitors = useMemo(
    () => resolveProgressMonitors(monitors, monitorRefs),
    [monitors, monitorRefs],
  );
  const resolvedMonitors = useMemo<ResolvedMonitorEntry[]>(
    () => progressMonitors.filter((entry): entry is ResolvedMonitorEntry => Boolean(entry.monitor)),
    [progressMonitors],
  );

  const fetchMonitorDataFor = useCallback(async (uuid: string, signal?: AbortSignal) => {
    setMonitorLoadingMap((prev) => ({ ...prev, [uuid]: true }));
    try {
      const data = await fetchMonitorData(uuid, signal);
      setMonitorDataMap((prev) => ({ ...prev, [uuid]: data }));
      setMonitorErrorsMap((prev) => {
        const next = { ...prev };
        delete next[uuid];
        return next;
      });
    } catch (e) {
      if (!isAbortError(e)) {
        setMonitorErrorsMap((prev) => ({ ...prev, [uuid]: e?.message ?? 'Failed to load monitor data' }));
      }
    } finally {
      if (!signal?.aborted) {
        setMonitorLoadingMap((prev) => ({ ...prev, [uuid]: false }));
      }
    }
  }, []);

  // Auto-refresh all monitor widgets at the fastest configured interval
  const refreshAllMonitors = useRef<() => void>(() => {});
  const resolvedUuidsKey = resolvedMonitors.map((entry) => entry.monitor.uuid).sort().join(',');

  useEffect(() => {
    if (resolvedMonitors.length === 0) return;
    const acRef = { current: new AbortController() };
    const fetchAll = () => {
      acRef.current?.abort();
      acRef.current = new AbortController();
      resolvedMonitors.forEach((entry) => fetchMonitorDataFor(entry.monitor.uuid, acRef.current!.signal));
    };
    refreshAllMonitors.current = fetchAll;

    fetchAll();
    const minInterval = Math.min(
      ...resolvedMonitors.map((entry) =>
        entry.monitor.refreshInterval && entry.monitor.refreshInterval > 0
          ? entry.monitor.refreshInterval
          : 30,
      ),
    );
    const interval = setInterval(fetchAll, Math.max(5, minInterval) * 1000);

    return () => {
      clearInterval(interval);
      acRef.current?.abort();
      refreshAllMonitors.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUuidsKey, fetchMonitorDataFor]);

  // Card model: config order preserved; unknown configured names rendered in place
  const cards = useMemo<ETLTaskCardModel[]>(
    () => {
      const byName = new Map(taskDefs.map((task) => [task.name, task]));
      return taskNames.map((name) => {
        const definition = byName.get(name);
        return { name, definition, unknown: !definition };
      });
    },
    [taskNames, taskDefs],
  );

  // ---- KPI derivations ----
  const monitorUuids = useMemo(() => resolvedMonitors.map((entry) => entry.monitor.uuid), [resolvedMonitors]);
  const monitorRawResponses = useMemo(
    () => monitorUuids.map((uuid) => monitorDataMap[uuid]?.rawResponse),
    [monitorUuids, monitorDataMap],
  );

  const runningCount = useMemo(
    () => (monitorUuids.length > 0 ? sumStatusCounts(monitorRawResponses, RUNNING_PATTERN) : undefined),
    [monitorUuids, monitorRawResponses],
  );
  const failedCount = useMemo(
    () => (monitorUuids.length > 0 ? sumStatusCounts(monitorRawResponses, FAILED_PATTERN) : undefined),
    [monitorUuids, monitorRawResponses],
  );

  const activeTaskCount = useMemo(() => taskDefs.filter((d) => d.started === true).length, [taskDefs]);

  const serviceStatus = useMemo<'healthy' | 'down' | 'unknown'>(() => {
    if (monitorUuids.length === 0) return 'unknown';
    if (monitorUuids.some((uuid) => monitorErrorsMap[uuid])) return 'down';
    if (monitorUuids.some((uuid) => monitorDataMap[uuid])) return 'healthy';
    return 'unknown';
  }, [monitorUuids, monitorErrorsMap, monitorDataMap]);

  const lastChecked = useMemo(() => {
    const timestamps = monitorUuids
      .map((uuid) => monitorDataMap[uuid]?.timestamp)
      .filter((ts): ts is string => Boolean(ts))
      .sort();
    return timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;
  }, [monitorUuids, monitorDataMap]);

  const nextScheduled = useMemo(() => {
    let best: { name: string; date: Date } | null = null;
    for (const definition of taskDefs) {
      const nextRun = computeNextRun(definition.lastExecutionTime, definition.repeatInterval);
      if (nextRun && (!best || nextRun < best.date)) {
        best = { name: definition.name, date: nextRun };
      }
    }
    return best;
  }, [taskDefs]);

  // ---- Task filtering ----
  const taskTypes = useMemo(
    () =>
      Array.from(new Set(taskDefs.map((d) => classifyTaskType(d.taskClass)))).sort(),
    [taskDefs],
  );

  const visibleCards = useMemo(
    () =>
      cards.filter((card) => {
        if (statusTab !== 'all') {
          if (card.unknown) return false;
          const started = card.definition?.started === true;
          if (statusTab === 'active' && !started) return false;
          if (statusTab === 'inactive' && started) return false;
        }
        if (typeFilter !== ALL_TYPES && !card.unknown) {
          if (classifyTaskType(card.definition?.taskClass) !== typeFilter) return false;
        }
        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const haystack = `${card.name} ${card.definition?.description ?? ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      }),
    [cards, statusTab, typeFilter, searchQuery],
  );

  const activeCount = cards.filter((c) => !c.unknown && c.definition?.started === true).length;
  const inactiveCount = cards.filter((c) => !c.unknown && c.definition?.started !== true).length;

  const handleRefresh = useCallback(async () => {
    await load(new AbortController().signal);
    showToast({
      title: t('refreshSuccess', 'Refresh Successful'),
      kind: 'success',
      description: t('tasksRefreshed', 'ETL tasks have been refreshed'),
    });
  }, [load, t]);

  const executeTask = useCallback(
    async (card: ETLTaskCardModel) => {
      setExecutingTaskName(card.name);
      try {
        await executeETLTask(card.name);
        showToast({
          critical: true,
          title: t('taskExecutionSuccess', 'Execution Successful'),
          kind: 'success',
          description: t('taskExecutedSuccessfully', 'Task {{name}} executed successfully', {
            name: card.name,
          }),
        });
        // Best-effort refresh of run metadata and monitor data so the
        // user sees the triggered run's progress immediately
        load(new AbortController().signal);
        refreshAllMonitors.current();
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
    [load, t],
  );

  const scrollToLiveSection = useCallback(() => {
    liveSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const hasNoConfig = taskNames.length === 0;
  const monitorsConfigured = monitorRefs.length > 0;
  const sharedMonitorUuid = resolvedMonitors.length === 1 ? resolvedMonitors[0].monitor.uuid : undefined;

  return (
    <Stack gap={5}>
      <Header
        title={t('etlTasks', 'ETL Tasks')}
        subtitle={t(
          'etlTasksSubtitle',
          'Manage, run, and monitor ETL tasks for data extraction, transformation, and loading.',
        )}
      />

      <div className={styles.page}>
        {error && <InlineNotification lowContrast kind="error" title="Error" subtitle={error} />}
        {monitorsError && (
          <InlineNotification
            lowContrast
            kind="warning"
            title={t('monitorDataUnavailable', 'Monitor data unavailable')}
            subtitle={monitorsError}
          />
        )}

        {/* KPI strip */}
        <div className={styles.kpiGrid}>
          <KpiCard
            icon={<CheckmarkFilled size={22} />}
            iconTone={serviceStatus === 'down' ? 'danger' : serviceStatus === 'healthy' ? 'healthy' : 'neutral'}
            label={t('etlService', 'ETL Service')}
            value={
              serviceStatus === 'healthy'
                ? t('serviceHealthy', 'Healthy')
                : serviceStatus === 'down'
                ? t('serviceDown', 'Down')
                : t('serviceUnknown', 'Unknown')
            }
            subtext={
              lastChecked
                ? t('lastChecked', 'Last checked: {{value}}', { value: formatLastRun(lastChecked) })
                : t('noMonitorsHint', 'No monitors configured')
            }
          />
          <KpiCard
            icon={<Play size={22} />}
            iconTone="info"
            label={t('runningTasks', 'Running tasks')}
            value={runningCount === undefined ? t('dash', '—') : String(runningCount)}
            subtext={
              runningCount === undefined
                ? t('noRunningData', 'No monitor data')
                : runningCount === 0
                ? t('noTasksRunning', 'No tasks running')
                : t('tasksInProgress', 'Tasks in progress')
            }
          />
          <KpiCard
            icon={<DataBase size={22} />}
            iconTone="info"
            label={t('activeTasks', 'Active tasks')}
            value={String(activeTaskCount)}
            subtext={t('outOfTotal', 'Out of {{count}}', { count: taskDefs.length })}
          />
          <KpiCard
            icon={<ErrorFilled size={22} />}
            iconTone={failedCount ? 'danger' : 'neutral'}
            label={t('failedToday', 'Failed today')}
            value={failedCount === undefined ? t('dash', '—') : String(failedCount)}
            subtext={
              failedCount === undefined
                ? t('noFailureData', 'No failure data')
                : failedCount === 0
                ? t('noFailedRuns', 'No failed runs')
                : t('failedRuns', 'Failed runs')
            }
          />
          <KpiCard
            icon={<Time size={22} />}
            iconTone="info"
            label={t('nextScheduledRun', 'Next scheduled run')}
            value={nextScheduled ? formatNextRun(nextScheduled.date) : t('dash', '—')}
            subtext={nextScheduled?.name ?? t('notScheduled', 'Not scheduled')}
          />
        </div>

        {/* Configured Tasks */}
        <section>
          <div className={styles.toolbar}>
            <div>
              <h4 className={styles.toolbarHeading}>{t('configuredTasks', 'Configured Tasks')}</h4>
              <p className={styles.toolbarSubtext}>
                {hasNoConfig
                  ? t(
                      'noConfigHint',
                      'No ETL tasks configured. Configure via frontend config: etlTasks.tasks',
                    )
                  : t('tasksConfiguredForExecution', '{{count}} task(s) configured for ETL execution.', {
                      count: cards.length,
                    })}
              </p>
            </div>
            <div className={styles.toolbarControls}>
              <Search
                size="sm"
                placeholder={t('searchTasks', 'Search tasks...')}
                labelText={t('searchTasksLabel', 'Search tasks')}
                value={searchQuery}
                onChange={(e) => setSearchQuery((e as React.ChangeEvent<HTMLInputElement>).target.value)}
                className={styles.searchBox}
              />
              <Dropdown
                id="etl-task-type-filter"
                size="sm"
                type="inline"
                titleText={t('filter', 'Filter')}
                label={typeFilter}
                items={[ALL_TYPES, ...taskTypes]}
                selectedItem={typeFilter}
                onChange={({ selectedItem }: { selectedItem: string | null }) =>
                  setTypeFilter(selectedItem ?? ALL_TYPES)
                }
              />
              <Button
                kind="primary"
                size="sm"
                renderIcon={Renew}
                onClick={handleRefresh}
                disabled={loading || executingTaskName !== null}>
                {loading ? t('loading', 'Loading...') : t('refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          <div className={styles.filterTabs}>
            <FilterTab tab="all" label={t('all', 'All')} count={cards.length} activeTab={statusTab} onSelect={setStatusTab} />
            <FilterTab tab="active" label={t('active', 'Active')} count={activeCount} activeTab={statusTab} onSelect={setStatusTab} />
            <FilterTab tab="inactive" label={t('inactive', 'Inactive')} count={inactiveCount} activeTab={statusTab} onSelect={setStatusTab} />
          </div>

          {loading && taskDefs.length === 0 && unknownNames.length === 0 ? (
            <InlineLoading description={t('loadingETLTasks', 'Loading ETL tasks...')} />
          ) : hasNoConfig ? (
            <Tile className={styles.emptyState}>
              <Settings size={48} className={styles.emptyStateIcon} />
              <h3>{t('noConfig', 'No Configuration')}</h3>
              <p>
                {t(
                  'noConfigDesc',
                  'No ETL tasks have been configured. Configure the frontend config option "etlTasks.tasks" with an array of task names.',
                )}
              </p>
            </Tile>
          ) : cards.length === 0 ? (
            <Tile className={styles.emptyState}>
              <Settings size={48} className={styles.emptyStateIcon} />
              <h3>{t('noTasksFound', 'No Tasks Found')}</h3>
              <p>
                {t(
                  'noTasksFoundDesc',
                  'No ETL tasks found for the configured task names. Verify the task names match existing OpenMRS task definitions.',
                )}
              </p>
            </Tile>
          ) : visibleCards.length === 0 ? (
            <Tile className={styles.emptyState}>
              <Settings size={48} className={styles.emptyStateIcon} />
              <h3>{t('noMatchingTasks', 'No Matching Tasks')}</h3>
              <p>{t('noMatchingTasksDesc', 'No tasks match the current search, status, or type filters.')}</p>
            </Tile>
          ) : (
            <div className={styles.tasksGrid}>
              {visibleCards.map((card) => {
                if (card.unknown) {
                  return (
                    <Tile key={card.name} className={styles.taskCard}>
                      <div className={styles.cardHead}>
                        <span className={classNames(styles.cardIcon, styles.cardIconMuted)}>
                          <ChartBar size={20} />
                        </span>
                        <div className={styles.cardHeadText}>
                          <h4 className={styles.cardTitle}>{card.name}</h4>
                          <p className={styles.cardDescription}>
                            {t(
                              'unknownTaskDescription',
                              'Configured in etlTasks.tasks but no matching OpenMRS task definition was found.',
                            )}
                          </p>
                        </div>
                        <span className={classNames(styles.statusPill, styles.statusPillUnknown)}>
                          {t('unknown', 'Unknown')}
                        </span>
                      </div>
                      <div className={styles.metaRow}>
                        <MetaItem label={t('lastRun', 'Last run')} value="—" />
                        <MetaItem label={t('duration', 'Duration')} value="—" />
                        <MetaItem label={t('nextRun', 'Next run')} value={t('notScheduled', 'Not scheduled')} />
                      </div>
                      <div className={styles.cardActions}>
                        <Button kind="primary" size="sm" renderIcon={Play} disabled>
                          {t('runNow', 'Run Now')}
                        </Button>
                      </div>
                    </Tile>
                  );
                }

                const started = card.definition?.started === true;
                const nextRun = computeNextRun(
                  card.definition?.lastExecutionTime,
                  card.definition?.repeatInterval,
                );
                // Card duration is only unambiguous with a single configured monitor
                const duration = sharedMonitorUuid
                  ? (extractDurationFromMonitorData(monitorDataMap[sharedMonitorUuid]?.rawResponse) ??
                    t('dash', '—'))
                  : t('dash', '—');
                const isExecuting = executingTaskName === card.name;

                return (
                  <Tile key={card.name} className={styles.taskCard}>
                    <div className={styles.cardHead}>
                      <span className={styles.cardIcon}>
                        <ChartBar size={20} />
                      </span>
                      <div className={styles.cardHeadText}>
                        <h4 className={styles.cardTitle} title={card.name}>
                          {card.name}
                        </h4>
                        <p
                          className={styles.cardDescription}
                          title={card.definition?.description || card.definition?.taskClass}>
                          {card.definition?.description || card.definition?.taskClass}
                        </p>
                      </div>
                      <span
                        className={classNames(
                          styles.statusPill,
                          started ? styles.statusPillActive : styles.statusPillInactive,
                        )}>
                        {started ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </span>
                    </div>

                    <div className={styles.metaRow}>
                      <MetaItem
                        label={t('lastRun', 'Last run')}
                        value={formatLastRun(card.definition?.lastExecutionTime)}
                      />
                      <MetaItem label={t('duration', 'Duration')} value={duration} />
                      <MetaItem label={t('nextRun', 'Next run')} value={formatNextRun(nextRun)} />
                    </div>

                    <div className={styles.cardActions}>
                      <Button
                        kind="primary"
                        size="sm"
                        renderIcon={isExecuting ? Renew : Play}
                        onClick={() => executeTask(card)}
                        disabled={executingTaskName !== null}>
                        {isExecuting
                          ? t('executing', 'Executing...')
                          : executingTaskName !== null
                          ? t('pleaseWait', 'Please Wait')
                          : t('runNow', 'Run Now')}
                      </Button>
                      {monitorsConfigured && (
                        <Button kind="tertiary" size="sm" onClick={scrollToLiveSection}>
                          {t('viewDetails', 'View details')}
                        </Button>
                      )}
                      {monitorsConfigured && resolvedMonitors.length === 0 && (
                        <span className={styles.monitorMissing}>
                          {t('monitorNotFound', 'Monitor not found')}
                        </span>
                      )}
                    </div>

                    {isExecuting && (
                      <div className={styles.executingStatus}>
                        <InlineLoading description={t('executingTask', 'Executing task...')} />
                      </div>
                    )}
                  </Tile>
                );
              })}
            </div>
          )}
        </section>

        {/* Live Execution — configured monitors, visible while tasks run */}
        <section ref={liveSectionRef}>
          <div className={styles.sectionHeading}>
            <h4 className={styles.toolbarHeading}>{t('liveExecution', 'Live Execution')}</h4>
            <p className={styles.toolbarSubtext}>
              {t(
                'liveExecutionHint',
                'Monitor progress and status for currently running ETL tasks.',
              )}
            </p>
          </div>
          {monitorsConfigured ? (
            <div className={styles.monitorsGrid}>
              {progressMonitors.map((entry) =>
                entry.monitor ? (
                  <EtlMonitorWidget
                    key={entry.monitor.uuid}
                    monitor={entry.monitor}
                    data={monitorDataMap[entry.monitor.uuid]}
                    error={monitorErrorsMap[entry.monitor.uuid] ?? null}
                    loading={!!monitorLoadingMap[entry.monitor.uuid]}
                    onRefresh={() => fetchMonitorDataFor(entry.monitor.uuid)}
                    title={entry.monitor.name}
                  />
                ) : (
                  <Tile key={entry.ref} className={styles.monitorMissingCard}>
                    <p className={styles.monitorMissingTitle}>{entry.ref}</p>
                    <p className={styles.monitorMissingHint}>
                      {t(
                        'monitorRefNotFound',
                        'No monitor matches this code or UUID. Check etlTasks.progressMonitors or create the monitor under Admin → ETL Monitors.',
                      )}
                    </p>
                  </Tile>
                ),
              )}
            </div>
          ) : (
            <div className={styles.liveEmpty}>
              <Settings size={40} className={styles.emptyStateIcon} />
              <p className={styles.liveEmptyTitle}>{t('noTaskRunning', 'No ETL task currently running')}</p>
              <p className={styles.liveEmptyHint}>
                {nextScheduled ? (
                  <>
                    {t('nextScheduledIs', 'The next scheduled task is')}{' '}
                    <strong>
                      {nextScheduled.name} — {formatNextRun(nextScheduled.date)}
                    </strong>
                    .
                  </>
                ) : (
                  t(
                    'liveExecutionConfigureHint',
                    'Configure etlTasks.progressMonitors to see live progress from your ETL monitors here.',
                  )
                )}
              </p>
            </div>
          )}
        </section>
      </div>
    </Stack>
  );
}

type ResolvedMonitorEntry = ResolvedProgressMonitor & { monitor: ETLMonitorDto };
