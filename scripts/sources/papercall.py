"""
Scrape events from Papercall.io

URL: https://www.papercall.io/events
Method: BeautifulSoup HTML parsing
"""

import requests
from bs4 import BeautifulSoup
from typing import Optional
import re


PAPERCALL_URL = "https://www.papercall.io/events"


def fetch() -> list[dict]:
    """Scrape conferences from Papercall.io events directory."""
    conferences = []
    
    try:
        response = requests.get(PAPERCALL_URL, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "lxml" if __import__("importlib").util.find_spec("lxml") else "html.parser")
        
        # Find event cards
        event_links = soup.find_all("a", href=re.compile(r"^/[a-z0-9-]+$"))
        
        for link in event_links:
            href = link.get("href", "")
            if not href or href in ["/events", "/pricing", "/about", "/contact"]:
                continue
            
            # Extract event name and location from the card
            text = link.get_text(separator=" ", strip=True)
            if not text or len(text) < 3:
                continue
            
            # Parse name and location (format: "Event Name - Location")
            parts = text.rsplit(" - ", 1)
            name = parts[0].strip() if parts else text
            location = parts[1].strip() if len(parts) > 1 else ""
            
            # Skip navigation links
            if name.lower() in ["pro event", "pricing", "events"]:
                continue
            
            conference = {
                "name": name,
                "url": f"https://www.papercall.io{href}",
                "startDate": None,
                "endDate": None,
                "location": {
                    "city": location,
                    "country": "",
                    "raw": location,
                },
                "online": "online" in location.lower(),
                "cfp": {
                    "url": f"https://www.papercall.io{href}",
                    "endDate": None,
                },
                "source": "papercall",
            }
            
            conferences.append(conference)
        
        # Deduplicate by URL
        seen = set()
        unique = []
        for conf in conferences:
            if conf["url"] not in seen:
                seen.add(conf["url"])
                unique.append(conf)
        
        conferences = unique
        
    except Exception as e:
        print(f"[papercall] Error scraping: {e}")
        return []
    
    print(f"[papercall] Fetched {len(conferences)} conferences")
    return conferences


if __name__ == "__main__":
    confs = fetch()
    print(f"Total: {len(confs)}")
    for conf in confs[:5]:
        print(f"  - {conf['name']}: {conf['url']}")
