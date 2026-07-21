'use client';

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface SafeImageProps extends ImageProps {
  fallbackSrc?: string;
}

/**
 * Image component with automatic fallback on error.
 * Useful for external URLs like user avatars or conference logos.
 */
export function SafeImage({ src, fallbackSrc = '/placeholder-conf.png', alt, ...props }: SafeImageProps) {
  // Derived state: remember WHICH src failed instead of copying the prop
  // into state (which goes stale when the prop changes).
  const [failedSrc, setFailedSrc] = useState<ImageProps['src'] | null>(null);
  const hasError = failedSrc === src;

  return (
    <Image
      {...props}
      src={hasError ? fallbackSrc : src}
      alt={alt}
      onError={() => {
        if (!hasError) {
          setFailedSrc(src);
        }
      }}
    />
  );
}
