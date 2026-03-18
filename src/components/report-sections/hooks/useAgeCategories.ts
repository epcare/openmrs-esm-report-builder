import React from 'react';
import { listAgeCategoriesWithGroups, type AgeCategoryOption } from '../../../resources/agegroup/mamba-agegroups.api';

export function useAgeCategories(open: boolean) {
    const [ageCategories, setAgeCategories] = React.useState<AgeCategoryOption[]>([]);
    const [ageCatsLoading, setAgeCatsLoading] = React.useState(false);
    const [ageCatsError, setAgeCatsError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!open) return;

        const ac = new AbortController();
        setAgeCatsLoading(true);
        setAgeCatsError(null);

        listAgeCategoriesWithGroups(ac.signal)
            .then((cats) => setAgeCategories(cats))
            .catch((e: any) => setAgeCatsError(e?.message ?? 'Failed to load age categories'))
            .finally(() => setAgeCatsLoading(false));

        return () => ac.abort();
    }, [open]);

    return { ageCategories, ageCatsLoading, ageCatsError };
}