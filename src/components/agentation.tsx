'use client';

import dynamic from 'next/dynamic';

const AgentationDynamic = dynamic(
  () => import('agentation').then((mod) => mod.Agentation),
  { ssr: false }
);

export function Agentation() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  return <AgentationDynamic />
}
