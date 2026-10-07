import { useLayoutEffect, useState, type ReactNode } from 'react';

let current: ReactNode = null;
const listeners = new Set<(node: ReactNode) => void>();

function publish(node: ReactNode) {
  current = node;
  listeners.forEach((listener) => listener(node));
}

export function ScreenOverlay() {
  const [node, setNode] = useState<ReactNode>(current);
  useLayoutEffect(() => {
    listeners.add(setNode);
    setNode(current);
    return () => {
      listeners.delete(setNode);
    };
  }, []);
  return node;
}

export function useScreenOverlay(node: ReactNode) {
  useLayoutEffect(() => {
    publish(node);
  }, [node]);

  useLayoutEffect(() => {
    return () => publish(null);
  }, []);
}
