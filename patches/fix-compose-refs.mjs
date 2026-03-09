// Patch @radix-ui/react-compose-refs to fix React 19 infinite loop
// See: https://github.com/radix-ui/primitives/issues/3241
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve('node_modules/@radix-ui/react-compose-refs/dist/index.mjs');
const src = readFileSync(file, 'utf-8');

// Already patched?
if (src.includes('useMemo')) process.exit(0);

const patched = `// patched for React 19 — useCallback -> useMemo to prevent infinite ref loop
import * as React from "react";
function setRef(ref, value) {
  if (typeof ref === "function") {
    const cleanup = ref(value);
    return typeof cleanup === "function" ? cleanup : undefined;
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    const cleanups = refs.map((ref) => setRef(ref, node));
    return () => {
      for (let i = 0; i < cleanups.length; i++) {
        const cleanup = cleanups[i];
        if (typeof cleanup === "function") {
          cleanup();
        } else {
          setRef(refs[i], null);
        }
      }
    };
  };
}
function useComposedRefs(...refs) {
  return React.useMemo(() => composeRefs(...refs), refs);
}
export {
  composeRefs,
  useComposedRefs
};
`;

writeFileSync(file, patched);
console.log('[patch] Fixed @radix-ui/react-compose-refs for React 19');
