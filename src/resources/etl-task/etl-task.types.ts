/**
 * ETL Task configuration and execution types
 */

export interface OpenMRSTaskDefinition {
  uuid: string;
  name: string;
  description?: string;
  taskClass: string;
}

export interface ETLTaskExecutionResponse {
  status: number;
  message?: string;
}
