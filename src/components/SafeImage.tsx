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
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      {...props}
      src={hasError ? fallbackSrc : imgSrc}
      alt={alt}
      onError={() => {
        if (!hasError) {
          setHasError(true);
        }
      }}
    />
  );
}
