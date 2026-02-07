"""
Fetch conferences from dblp.org

dblp is the primary academic CS conference source with excellent API.
URL: https://dblp.org/search/venue/api
Data: XML response with conference metadata

This replaces direct IEEE/ACM scraping as dblp aggregates both.
"""

import sys
from pathlib import Path
import requests
import defusedxml.ElementTree as ET
from typing import Optional

# Import ConfScout HTTP client for proper User-Agent headers
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.http_client import ConfScoutHTTPClient, DEFAULT_USER_AGENT


DBLP_SEARCH_URL = "https://dblp.org/search/venue/api"
SEARCH_TERMS = [
    "conference on artificial intelligence",
    "conference on machine learning",
    "software engineering conference",
    "security symposium",
    "data science conference",
    "cloud computing conference",
    "IEEE conference 2026",
    "ACM conference 2026",
]


import time

def fetch() -> list[dict]:
    """Fetch conferences from dblp.org API."""
    conferences = []
    seen_urls = set()

    for i, term in enumerate(SEARCH_TERMS):
        if i > 0:
            time.sleep(1)
        results = _search_venues(term)
        for conf in results:
            if conf["url"] not in seen_urls:
                seen_urls.add(conf["url"])
                conferences.append(conf)

    print(f"[dblp] Fetched {len(conferences)} conferences")
    return conferences


def _search_venues(query: str, max_results: int = 50) -> list[dict]:
    """Search dblp venues API."""
    conferences = []

    # Use ConfScout HTTP client with proper User-Agent
    client = ConfScoutHTTPClient(user_agent=DEFAULT_USER_AGENT)

    try:
        params = {
            "q": query,
            "format": "xml",
            "h": max_results,
        }
        # Use client session for proper User-Agent header
        response = client.get(DBLP_SEARCH_URL, params=params, timeout=15)
        response.raise_for_status()

        root = ET.fromstring(response.content)
        hits = root.find("hits")
        if hits is None:
            return []

        for hit in hits.findall("hit"):
            info = hit.find("info")
            if info is None:
                continue

            venue = info.find("venue")
            url_elem = info.find("url")

            if venue is None or venue.text is None:
                continue

            name = venue.text.strip()
            url = url_elem.text if url_elem is not None else ""

            # Determine domain from name
            domain = _classify_academic_domain(name)

            conference = {
                "name": name,
                "url": url,
                "startDate": None,  # dblp doesn't provide exact dates
                "endDate": None,
                "location": {"city": "", "country": "", "raw": ""},
                "online": False,
                "cfp": None,
                "domain": domain,
                "source": "dblp",
            }

            conferences.append(conference)

    except Exception as e:
        print(f"[dblp] Error searching '{query}': {e}")
    finally:
        client.close()

    return conferences


def _classify_academic_domain(name: str) -> str:
    """Classify academic conference by domain."""
    name_lower = name.lower()
    
    if any(kw in name_lower for kw in ["artificial intelligence", "machine learning", "neural", "deep learning", "nlp", "vision"]):
        return "ai"
    if any(kw in name_lower for kw in ["software", "engineering", "agile", "devops"]):
        return "software"
    if any(kw in name_lower for kw in ["security", "crypto", "privacy", "hacking"]):
        return "security"
    if any(kw in name_lower for kw in ["data", "database", "analytics", "big data"]):
        return "data"
    if any(kw in name_lower for kw in ["web", "mobile", "frontend", "backend"]):
        return "web"
    if any(kw in name_lower for kw in ["cloud", "kubernetes", "distributed", "serverless"]):
        return "cloud"
    
    return "academic"


if __name__ == "__main__":
    confs = fetch()
    print(f"Total: {len(confs)}")
    if confs:
        print(f"Sample: {confs[0]}")
