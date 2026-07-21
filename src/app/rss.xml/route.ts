import { Feed } from 'feed';
import { readStaticConferences } from '@/lib/staticConferences';
import type { Conference } from '@/types/conference';

export async function GET() {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.confscouting.com';

    // Create Feed
    const feed = new Feed({
        title: "ConfScouting - Upcoming Tech Conferences",
        description: "Curated list of software engineering conferences worldwide.",
        id: siteUrl,
        link: siteUrl,
        language: "en",
        image: `${siteUrl}/favicon.ico`,
        favicon: `${siteUrl}/favicon.ico`,
        copyright: `All rights reserved ${new Date().getFullYear()}, ConfScouting`,
        updated: new Date(),
        generator: "ConfScouting RSS Feed",
        feedLinks: {
            rss: `${siteUrl}/rss.xml`,
        },
        author: {
            name: "Mohit Mishra",
            email: "admin@mohitmishra7.com",
            link: "https://mohitmishra7.com",
        },
    });

    try {
        // TTL-cached module-level read — no per-request file I/O.
        const data = await readStaticConferences();
        const conferences = Object.values(data.months ?? {}).flat();

        // Add posts
        conferences.forEach((conf: Conference) => {
            // Use startDate or lastUpdated for date
            const date = conf.startDate ? new Date(conf.startDate) : new Date();
            const link = conf.url;

            feed.addItem({
                title: `${conf.name} (${conf.startDate})`,
                id: conf.id,
                link: link,
                description: `${conf.description || ''} - ${conf.location?.raw || 'Online'}`,
                content: `
                <p><strong>Date:</strong> ${conf.startDate}</p>
                <p><strong>Location:</strong> ${conf.location?.raw || 'Online'}</p>
                <p><strong>Domain:</strong> ${conf.domain}</p>
                <p>${conf.description || 'No description available.'}</p>
                ${conf.cfp?.status === 'open' ? `<p><strong>CFP Open!</strong> <a href="${conf.cfp.url}">Submit Talk</a></p>` : ''}
            `,
                author: [
                    {
                        name: "ConfScouting",
                        email: "admin@mohitmishra7.com",
                        link: siteUrl,
                    },
                ],
                date: date,
                category: [{ name: conf.domain }],
            });
        });
    } catch (e) {
        console.error("Failed to generate RSS", e);
    }

    return new Response(feed.rss2(), {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
        },
    });
}
