import React from 'react';
import {
  Accordion,
  AccordionItem,
  InlineNotification,
  Search,
  Stack,
  Tag,
  Tile,
} from '@carbon/react';
import Header from '../shared/header/header.component';
import { listAgeCategoriesWithGroups, type AgeCategoryOption } from '../../resources/agegroup/agegroups.api';

const AgeCategoriesPage: React.FC = () => {
  const [q, setQ] = React.useState('');
  const [rows, setRows] = React.useState<AgeCategoryOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    listAgeCategoriesWithGroups(ac.signal)
      .then(setRows)
      .catch((e: any) => setError(e?.message ?? 'Failed to load age categories'))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtered = rows.filter((row) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return [row.name, row.code, row.description || '', row.label]
      .join(' ')
      .toLowerCase()
      .includes(needle);
  });

  return (
    <Stack gap={5}>
      <Header
        title="Age Categories"
        subtitle="Review reusable age disaggregation structures used by indicators and sections."
      />

      <div style={{ padding: '0 1rem 1rem', display: 'grid', gap: '1rem' }}>
        <Search
          size="lg"
          labelText="Search"
          placeholder="Search age categories…"
          value={q}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
        />

        {error ? <InlineNotification lowContrast kind="error" title="Error" subtitle={error} /> : null}
        {loading ? <div>Loading…</div> : null}

        {!loading && !error ? (
          <Accordion>
            {filtered.map((row) => (
              <AccordionItem
                key={row.uuid}
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                    <Tag type="blue">{row.code}</Tag>
                    <Tag type="green">{row.ageGroups.length} age groups</Tag>
                  </div>
                }
              >
                <Tile>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div><strong>Description:</strong> {row.description || '—'}</div>
                    <div><strong>UUID:</strong> {row.uuid}</div>
                    <div>
                      <strong>Groups:</strong>
                      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {row.ageGroups.map((group) => (
                          <div
                            key={group.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 1fr 1fr 1fr',
                              gap: '0.75rem',
                              padding: '0.75rem',
                              border: '1px solid var(--cds-border-subtle, #e0e0e0)',
                            }}
                          >
                            <span>{group.label}</span>
                            <span>Min days: {group.minAgeDays}</span>
                            <span>Max days: {group.maxAgeDays}</span>
                            <span>Sort: {group.sortOrder}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Tile>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null}
      </div>
    </Stack>
  );
};

export default AgeCategoriesPage;
