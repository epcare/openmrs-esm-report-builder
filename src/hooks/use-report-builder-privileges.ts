import { useCallback, useMemo } from 'react';
import { useSession } from '@openmrs/esm-framework';
import { RB } from '../constants/privileges';

const SUPERUSER_ROLE = 'System Developer';

/**
 * Privileges of the signed-in user, as resolved by the backend session endpoint
 * (inherited roles already expanded). Backed by the framework session store —
 * the same fetch the SPA shell and headers already use — so there is no extra
 * network call and values refresh automatically on re-login.
 *
 * `has` uses OR semantics: has(RB.REPORT_ADD, RB.REPORT_EDIT) is true when the
 * user holds either, mirroring the backend's @Authorized({a, b}) behaviour.
 */
export function useReportBuilderPrivileges() {
    const session = useSession();
    const user = session?.user;

    const held = useMemo(() => {
        const names = new Set<string>();
        for (const privilege of user?.privileges ?? []) {
            names.add(privilege.name);
            names.add(privilege.display);
        }
        return names;
    }, [user]);

    const isSuperUser = useMemo(
        () => !!user?.roles?.some((role) => role.display === SUPERUSER_ROLE),
        [user],
    );

    const has = useCallback(
        (...needed: string[]) =>
            needed.length === 0 || isSuperUser || needed.some((privilege) => held.has(privilege)),
        [held, isSuperUser],
    );

    const hasAll = useCallback(
        (...needed: string[]) =>
            needed.length === 0 || isSuperUser || needed.every((privilege) => held.has(privilege)),
        [held, isSuperUser],
    );

    return {
        /** has(RB.X, RB.Y) — true when the user holds ANY of the privileges. */
        has,
        /** hasAll(RB.X, RB.Y) — true only when the user holds ALL of the privileges. */
        hasAll,
        isSuperUser,
        isAuthenticated: !!session?.authenticated,
        canAuthor: has(RB.REPORT_ADD, RB.REPORT_EDIT),
        canRun: has(RB.REPORT_RUN),
        canPublish: has(RB.PACKAGE_IMPORT, RB.PACKAGE_EXPORT),
        canManageEtl: has(RB.ETLSOURCE_ADD, RB.ETLSOURCE_EDIT, RB.ETLMONITOR_ADD, RB.ETLMONITOR_EDIT),
    };
}
