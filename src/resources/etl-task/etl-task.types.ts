/**
 * ETL Task configuration and execution types
 */

export interface OpenMRSTaskDefinition {
  uuid: string;
  name: string;
  description?: string;
  taskClass: string;
  /** Whether the task is started in the scheduler */
  started?: boolean;
  /** ISO-ish timestamp of the last execution */
  lastExecutionTime?: string | null;
  /** Repeat interval in seconds; 0/undefined means one-shot */
  repeatInterval?: number | null;
}

/**
 * Shape of the `etlTasks` frontend config option
 */
export interface ETLTasksConfig {
  /** Names of existing OpenMRS task definitions to list and run */
  tasks: string[];
  /** ETL monitor codes (preferred) or uuids whose live progress shows above the task list */
  progressMonitors?: string[];
}

export interface ETLTaskExecutionResponse {
  status: number;
  message?: string;
}
