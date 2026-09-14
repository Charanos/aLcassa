/** ESM shim over the page's existing ReactDOM instance. See react-shim.js. */
const ReactDOM = window.ReactDOM;

export default ReactDOM;
export const {
  createPortal, findDOMNode, flushSync, render, unmountComponentAtNode, version
} = ReactDOM;
