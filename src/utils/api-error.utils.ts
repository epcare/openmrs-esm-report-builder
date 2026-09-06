import { RB_PREFIX } from '../constants/privileges';

const RB_PRIVILEGE_REGEX = new RegExp(`${RB_PREFIX}[a-z.]+`, 'g');

/**
 * Thrown by the omrs* helpers (and guarded direct openmrsFetch calls) when the
 * backend rejects a request for lack of privileges (403) or an expired session
 * (401). The message is user-facing — pages render `e?.message` directly.
 */
export class PrivilegeError extends Error {
    readonly status?: number;
    /** Full privilege names parsed out of the server message, e.g. `Task: reportbuilder.report.edit`. */
    readonly requiredPrivileges?: string[];
    readonly serverMessage?: string;
    readonly isAuthError: boolean;
    /** Original axios response, kept so downstream status checks keep working. */
    readonly response?: unknown;

    constructor(init: {
        status?: number;
        message: string;
        requiredPrivileges?: string[];
        serverMessage?: string;
        isAuthError?: boolean;
        response?: unknown;
    }) {
        super(init.message);
        this.name = 'PrivilegeError';
        this.status = init.status;
        this.requiredPrivileges = init.requiredPrivileges;
        this.serverMessage = init.serverMessage;
        this.isAuthError = init.isAuthError ?? false;
        this.response = init.response;
    }
}

function extractServerMessage(error: any): string {
    const data = error?.response?.data;
    if (typeof data === 'string') {
        return data;
    }
    return data?.error?.message ?? data?.message ?? error?.message ?? '';
}

/**
 * Maps raw openmrsFetch (axios) rejections to friendly errors:
 * - 401: session expired -> friendly message + one redirect to the login page.
 * - 403 carrying `Task: reportbuilder.*` -> PrivilegeError naming the privilege.
 * - other 403s (e.g. OpenMRS core endpoints): keep the server's own wording.
 * - aborts/cancellations pass through untouched so page AbortController filters keep working.
 */
export function normalizeApiError(error: any, fallbackMessage = 'Request failed'): Error {
    if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') {
        return error;
    }
    if (error instanceof PrivilegeError) {
        return error;
    }

    const status: number | undefined = error?.response?.status;
    const serverMessage = extractServerMessage(error);

    if (status === 401) {
        redirectToLogin();
        return new PrivilegeError({
            status: 401,
            isAuthError: true,
            serverMessage,
            response: error?.response,
            message: 'Your session has expired. Please sign in again.',
        });
    }

    if (status === 403) {
        const matches = serverMessage.match(RB_PRIVILEGE_REGEX) ?? [];
        if (matches.length > 0) {
            const requiredPrivileges = [...new Set(matches)];
            const names = requiredPrivileges.map((privilege) => privilege.replace(RB_PREFIX, '')).join(', ');
            return new PrivilegeError({
                status: 403,
                requiredPrivileges,
                serverMessage,
                response: error?.response,
                message: `You do not have permission to perform this action. Required privilege: ${names}.`,
            });
        }
        return new PrivilegeError({
            status: 403,
            serverMessage,
            response: error?.response,
            message: serverMessage || 'You do not have permission to perform this action.',
        });
    }

    const generic = new Error(serverMessage || fallbackMessage) as Error & {
        status?: number;
        response?: unknown;
    };
    generic.status = status;
    generic.response = error?.response;
    return generic;
}

/** Wraps a promise from a direct openmrsFetch call so rejections are normalized. */
export async function guardRejection<T>(promise: Promise<T>): Promise<T> {
    try {
        return await promise;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

let redirecting = false;

/** Sends the browser to the SPA login page. Loop-guarded: skipped when already
 * on /login and latched so parallel 401s cause a single navigation. */
export function redirectToLogin(): void {
    if (typeof window === 'undefined' || redirecting) {
        return;
    }
    const { pathname, search } = window.location;
    if (pathname.includes('/login')) {
        return;
    }
    redirecting = true;
    const base =
        typeof window.getOpenmrsSpaBase === 'function'
            ? window.getOpenmrsSpaBase()
            : `${window.spaBase}/`;
    window.location.href = `${base}login?returnTo=${encodeURIComponent(`${pathname}${search}`)}`;
}
