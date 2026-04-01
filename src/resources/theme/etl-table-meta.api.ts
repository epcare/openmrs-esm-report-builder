import { omrsGet } from '../openmrs-api';

export type TableColumn = {
  name: string;
  type?: string;
  nullable?: boolean;
};

type RawColumn = {
  columnName?: string;
  dataType?: string;
  name?: string;      // in case backend changes later
  type?: string;
  nullable?: boolean;
};

type RawMetaResponse =
    | { results?: RawColumn[] }
    | { columns?: RawColumn[] }
    | RawColumn[];

function normalizeColumns(input: RawColumn[] = []): TableColumn[] {
  return input
      .map((c) => ({
        name: c.name ?? c.columnName ?? '',
        type: c.type ?? c.dataType,
        nullable: c.nullable,
      }))
      .filter((c) => c.name.length > 0);
}

export async function getETLTableMeta(
    table: string,
    signal?: AbortSignal
): Promise<TableColumn[]> {
  const data = await omrsGet<RawMetaResponse>(
      `/etltablecolumn?table=${encodeURIComponent(table)}`,
      signal
  );

  if (Array.isArray(data)) return normalizeColumns(data);

  const anyData = data as any;
  return normalizeColumns(anyData?.columns ?? anyData?.results ?? []);
}