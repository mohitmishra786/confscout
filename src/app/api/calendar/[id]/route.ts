import { NextRequest, NextResponse } from 'next/server';
import conferenceData from '../../../../../public/data/conferences.json';

/**
 * GET /api/calendar/[id]
 * 
 * Returns an ICS (iCalendar) file for a specific conference.
 * This allows users to add conferences to their calendar apps.
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params;

    // Find the conference by ID
    type Conference = {
        id: string;
        name: string;
        url: string;
        startDate: string | null;
        endDate?: string | null;
        location?: { raw?: string };
    };

    const data = conferenceData as { months: Record<string, Conference[]> };

    let conference: Conference | null = null;
    for (const monthConfs of Object.values(data.months)) {
        const found = monthConfs.find((c: Conference) => c.id === id);
        if (found) {
            conference = found;
            break;
        }
    }

    if (!conference) {
        console.log(`Calendar API: Conference not found for ID: ${id}`);
        return NextResponse.json(
            { error: 'Conference not found', requestedId: id },
            { status: 404 }
        );
    }

    if (!conference.startDate) {
        console.log(`Calendar API: Conference ${id} has no start date`);
        return NextResponse.json(
            { error: 'Conference has no date set', conferenceId: id },
            { status: 400 }
        );
    }

    // Generate ICS content
    const ics = generateICS({ ...conference, startDate: conference.startDate });

    return new NextResponse(ics, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${conference.name.replace(/[^a-z0-9]/gi, '_')}.ics"`,
        },
    });
}

function generateICS(conference: {
    id: string;
    name: string;
    url: string;
    startDate: string;
    endDate?: string | null;
    location?: { raw?: string };
}): string {
    const now = new Date();
    const dtstamp = formatDateToICS(now);

    const startDate = new Date(conference.startDate);
    const endDate = conference.endDate
        ? new Date(conference.endDate)
        : new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Default to 1 day

    const dtstart = formatDateToICS(startDate);
    const dtend = formatDateToICS(endDate);

    const location = conference.location?.raw || '';
    const description = `Conference: ${conference.name}\\n\\nMore info: ${conference.url}`;

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ConfScout//Conference Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${conference.id}@confscout.site
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${dtstart}
DTEND;VALUE=DATE:${dtend}
SUMMARY:${escapeICS(conference.name)}
DESCRIPTION:${escapeICS(description)}
LOCATION:${escapeICS(location)}
URL:${conference.url}
END:VEVENT
END:VCALENDAR`;
}

function formatDateToICS(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}
