'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '../lib/swr-config';

// 🚀 PERFORMANS: Global SWR Provider
export default function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
