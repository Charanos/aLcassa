/**
 * ESM shim over the page's existing React instance.
 *
 * The import map points the bare specifier "react" here, so a CDN ESM bundle
 * (Recharts) that imports React resolves to the SAME copy the DC runtime
 * renders with. Without this, jsdelivr/esm.sh would fetch a second React and
 * every hook inside the chart library would throw "invalid hook call".
 */
const React = window.React;

export default React;
export const {
  Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense,
  cloneElement, createContext, createElement, createFactory, createRef, forwardRef,
  isValidElement, lazy, memo, startTransition, useCallback, useContext,
  useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle,
  useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState,
  useSyncExternalStore, useTransition, version
} = React;
