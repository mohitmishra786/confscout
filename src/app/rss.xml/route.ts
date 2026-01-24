import { Feed } from 'feed';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://confscout.site';
    const dataPath = path.join(process.cwd(), 'public/data/conferences.json');

    // Create Feed
    const feed = new Feed({
        title: "ConfScout - Upcoming Tech Conferences",
        description: "Curated list of software engineering conferences worldwide.",
        id: siteUrl,
        link: siteUrl,
        language: "en",
        image: `${siteUrl}/favicon.ico`,
        favicon: `${siteUrl}/favicon.ico`,
        copyright: `All rights reserved ${new Date().getFullYear()}, ConfScout`,
        updated: new Date(),
        generator: "ConfScout RSS Feed",
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
        const fileContents = await fs.readFile(dataPath, 'utf8');
        const data = JSON.parse(fileContents);
        const conferences = data.conferences || [];

        // Add posts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conferences.forEach((conf: any) => {
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
                        name: "ConfScout",
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
