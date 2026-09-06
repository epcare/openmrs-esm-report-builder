/**
 * ETL Task API integration
 * Handles fetching and executing ETL tasks using frontend config
 */

import { openmrsFetch } from '@openmrs/esm-framework';
import type { OpenMRSTaskDefinition, ETLTaskExecutionResponse } from './etl-task.types';

// These are OpenMRS core endpoints (scheduler), not reportbuilder ones - a 403 here
// carries a core privilege name, which the error normalizer passes through verbatim.
import { guardRejection } from '../../utils/api-error.utils';

/**
 * Fetch all available OpenMRS task definitions (with scheduler metadata)
 */
export async function fetchAllTaskDefinitions(signal?: AbortSignal): Promise<OpenMRSTaskDefinition[]> {
  try {
    const response = await guardRejection(
      openmrsFetch(
        '/ws/rest/v1/taskdefinition?v=custom:(uuid,name,description,taskClass,started,lastExecutionTime,repeatInterval)',
        { signal },
      ),
    );
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching task definitions:', error);
    throw error;
  }
}

export interface ConfiguredTasksResult {
  /** Configured names that matched a task definition, in fetch order */
  tasks: OpenMRSTaskDefinition[];
  /** Configured names with no matching task definition */
  unknownNames: string[];
}

/**
 * Fetch the task definitions for a list of configured task names,
 * partitioning into matched definitions and unknown configured names.
 * Matching is exact and case-sensitive so config typos surface as unknown names.
 */
export async function fetchConfiguredTasks(
  taskNames: string[],
  signal?: AbortSignal,
): Promise<ConfiguredTasksResult> {
  const names = taskNames.map((n) => (typeof n === 'string' ? n.trim() : '')).filter((n) => n);
  if (names.length === 0) return { tasks: [], unknownNames: [] };

  const allTasks = await fetchAllTaskDefinitions(signal);

  const matched = new Set<string>();
  const tasks: OpenMRSTaskDefinition[] = [];
  for (const task of allTasks) {
    if (names.includes(task.name)) {
      tasks.push(task);
      matched.add(task.name);
    }
  }

  const unknownNames = names.filter((n) => !matched.has(n));
  return { tasks, unknownNames };
}

/**
 * Execute an ETL task by name
 */
export async function executeETLTask(taskName: string): Promise<ETLTaskExecutionResponse> {
  try {
    const response = await guardRejection(
      openmrsFetch('/ws/rest/v1/taskaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          action: 'runtask',
          tasks: [taskName],
        },
      }),
    );

    if (response.status !== 201) {
      throw new Error(`Task execution failed with status ${response.status}`);
    }

    return {
      status: response.status,
      message: 'Task executed successfully',
    };
  } catch (error) {
    console.error('Error executing ETL task:', error);
    throw error;
  }
}
