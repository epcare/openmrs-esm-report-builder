import { omrsGet } from '../openmrs-api';

export type TableColumn = {
  name: string;
  type?: string;
  nullable?: boolean;
};

type MetaResponse = {
  table: string;
  columns: TableColumn[];
} | { results: TableColumn[] } | TableColumn[];

export async function getMambaTableMeta(table: string, signal?: AbortSignal): Promise<TableColumn[]> {
  const data = await omrsGet<MetaResponse>(`/mambatablemeta/${encodeURIComponent(table)}`, signal);

  if (Array.isArray(data)) return data;
  const anyData = data as any;
  return anyData?.columns ?? anyData?.results ?? [];
}
