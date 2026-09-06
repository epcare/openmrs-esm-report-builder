import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@openmrs/esm-framework', () => ({
    useSession: jest.fn(),
}));

import { useSession } from '@openmrs/esm-framework';
import { RB } from '../../constants/privileges';
import PrivilegeRoute from './privilege-route.component';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function sessionWith(privileges: string[], authenticated = true) {
    return {
        authenticated,
        user: {
            uuid: 'u-1',
            display: 'User',
            privileges: privileges.map((name) => ({ uuid: name, name, display: name })),
            roles: [],
        },
    } as any;
}

function renderAt(route: string, ui: React.ReactElement): { text: () => string; unmount: () => void } {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
        root.render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
    });
    return {
        text: () => container.textContent ?? '',
        unmount: () => act(() => root.unmount()),
    };
}

describe('PrivilegeRoute', () => {
    it('renders children when a required privilege is held (any-of)', () => {
        (useSession as unknown as jest.Mock).mockReturnValue(sessionWith([RB.PACKAGE_EXPORT]));
        const view = renderAt(
            '/import-export',
            <PrivilegeRoute required={[RB.PACKAGE_IMPORT, RB.PACKAGE_EXPORT]}>
                <div>secret content</div>
            </PrivilegeRoute>,
        );
        expect(view.text()).toContain('secret content');
        view.unmount();
    });

    it('renders the access denied page naming the privilege when unauthorised', () => {
        (useSession as unknown as jest.Mock).mockReturnValue(sessionWith([RB.REPORT_VIEW]));
        const view = renderAt(
            '/run',
            <PrivilegeRoute required={[RB.REPORT_RUN]}>
                <div>secret content</div>
            </PrivilegeRoute>,
        );
        expect(view.text()).not.toContain('secret content');
        expect(view.text()).toContain('Access denied');
        expect(view.text()).toContain('report.run');
        view.unmount();
    });

    it('renders nothing and does not crash for an unauthenticated visitor', () => {
        (useSession as unknown as jest.Mock).mockReturnValue(sessionWith([], false));
        const view = renderAt(
            '/',
            <PrivilegeRoute required={[RB.REPORT_VIEW]}>
                <div>secret content</div>
            </PrivilegeRoute>,
        );
        expect(view.text()).toBe('');
        view.unmount();
    });
});
