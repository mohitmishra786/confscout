
import { ReactNode } from 'react';

interface LoaderProps<T> {
  data: T | null | undefined;
  isLoading: boolean;
  render: (data: T) => ReactNode;
  fallback?: ReactNode;
  error?: string | null;
}

export function Loader<T>({ 
  data, 
  isLoading, 
  render, 
  fallback = <div className="text-zinc-400">Loading...</div>,
  error 
}: LoaderProps<T>) {
  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (data === null || data === undefined) {
    return null;
  }

  return <>{render(data)}</>;
}
