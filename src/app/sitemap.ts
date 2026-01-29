import { MetadataRoute } from 'next';
import { DOMAIN_INFO } from '@/types/conference';

const BASE_URL = 'https://confscout.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    '',
    '/about',
    '/submit',
    '/search',
    '/recommendations',
    '/auth/signin',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const domainRoutes = Object.keys(DOMAIN_INFO).map((slug) => ({
    url: `${BASE_URL}/domains/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...routes, ...domainRoutes];
}