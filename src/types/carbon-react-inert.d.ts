// Workaround for TS type mismatch between Carbon SideNavProps and the `inert` prop
// used by @openmrs/esm-styleguide's LeftNavMenu.
// This avoids type-check failures during local builds.

import '@carbon/react';

declare module '@carbon/react' {
  // `inert` is a valid HTML attribute supported by browsers, but may be missing from
  // the Carbon SideNavProps typing in some versions.
  interface SideNavProps {
    inert?: boolean;
  }
}
