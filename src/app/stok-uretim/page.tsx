'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StokUretimRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/stok-yonetimi');
  }, [router]);

  return <p className="p-6 text-muted-foreground">Yönlendiriliyor...</p>;
}
