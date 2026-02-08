declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.module.scss' {
  const classes: { [className: string]: string };
  export default classes;
}

// Webpack-specific typing used by OpenMRS translations loading
interface Require {
  context(directory: string, useSubdirectories: boolean, regExp: RegExp, mode?: string): any;
}
