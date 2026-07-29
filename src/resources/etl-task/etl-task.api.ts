/**
 * ETL Task API integration
 * Handles fetching and executing ETL tasks using frontend config
 */

import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import type { OpenMRSTaskDefinition, ETLTaskExecutionResponse } from './etl-task.types';

/**
 * Get ETL task configuration from frontend config
 */
export function useETLTaskConfig() {
  const config = useConfig();
  return config?.etlTasks?.taskNames || '';
}

/**
 * Fetch all available OpenMRS task definitions
 */
export async function fetchAllTaskDefinitions(signal?: AbortSignal): Promise<OpenMRSTaskDefinition[]> {
  try {
    const response = await openmrsFetch(
      '/ws/rest/v1/taskdefinition?v=custom:(uuid,name,description,taskClass)',
      { signal },
    );
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching task definitions:', error);
    throw error;
  }
}

/**
 * Fetch tasks by names (from config)
 */
export async function fetchTasksByNames(taskNames: string, signal?: AbortSignal): Promise<OpenMRSTaskDefinition[]> {
  if (!taskNames.trim()) return [];

  const names = taskNames.split(',').map((n) => n.trim()).filter((n) => n);
  const allTasks = await fetchAllTaskDefinitions(signal);

  // Return tasks that match any of the configured names
  return allTasks.filter((task) => names.includes(task.name));
}

/**
 * Execute an ETL task by name
 */
export async function executeETLTask(taskName: string): Promise<ETLTaskExecutionResponse> {
  try {
    const response = await openmrsFetch('/ws/rest/v1/taskaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        action: 'runtask',
        tasks: [taskName],
      },
    });

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
