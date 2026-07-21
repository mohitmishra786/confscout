"""
Fetch conference data from WikiCFP

WikiCFP is a semantic wiki for Call for Papers in science and technology.
URL: http://www.wikicfp.com

This module scrapes multiple categories with pagination to get comprehensive coverage.
Based on http://www.wikicfp.com/cfp/allcat showing 9000+ CFPs per major category.
"""

import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
import re
from datetime import datetime

# Top CS/Tech categories from WikiCFP (mapped to our domains)
# Each tuple: (wikicfp_category, our_domain)
CATEGORIES = [
    # AI/ML - highest volume
    ("artificial intelligence", "ai"),
    ("machine learning", "ai"),
    ("deep learning", "ai"),
    ("neural networks", "ai"),
    ("computer vision", "ai"),
    ("natural language processing", "ai"),
    ("NLP", "ai"),
    ("data mining", "data"),
    ("big data", "data"),
    ("robotics", "ai"),
    ("intelligent systems", "ai"),
    
    # Software Engineering
    ("software engineering", "software"),
    ("computer science", "software"),
    ("computing", "software"),
    ("programming", "software"),
    ("algorithms", "software"),
    ("distributed computing", "cloud"),
    ("parallel computing", "cloud"),
    ("high performance computing", "cloud"),
    
    # Security
    ("security", "security"),
    ("cyber security", "security"),
    ("cryptography", "security"),
    ("network security", "security"),
    
    # Web/Mobile
    ("internet", "web"),
    ("web", "web"),
    ("multimedia", "web"),
    ("human computer interaction", "web"),
    
    # Networks/Cloud
    ("networking", "cloud"),
    ("cloud computing", "cloud"),
    ("wireless communications", "cloud"),
    ("sensor networks", "cloud"),
    
    # Data
    ("databases", "data"),
    ("information systems", "data"),
    ("information technology", "data"),
    ("knowledge management", "data"),
]

BASE_URL = "http://www.wikicfp.com"
MAX_PAGES_PER_CATEGORY = 3  # Limit pages to avoid rate limiting
CONFERENCES_PER_PAGE = 20


def fetch() -> List[Dict]:
    """Fetch conferences from WikiCFP across multiple categories."""
    conferences: List[Dict] = []
    seen_urls: set = set()
    
    total_categories = len(CATEGORIES)
    
    for idx, (category, domain) in enumerate(CATEGORIES):
        print(f"[wikicfp] Fetching {category} ({idx+1}/{total_categories})...")
        try:
            category_confs = _fetch_category(category, domain)
            for conf in category_confs:
                # Deduplicate by URL
                if conf["url"] not in seen_urls:
                    seen_urls.add(conf["url"])
                    conferences.append(conf)
        except Exception as e:
            print(f"[wikicfp] Error fetching {category}: {e}")
            continue
    
    print(f"[wikicfp] Fetched {len(conferences)} conferences")
    return conferences


def _fetch_category(category: str, domain: str) -> List[Dict]:
    """Fetch conferences from a category with pagination."""
    conferences: List[Dict] = []
    
    for page in range(1, MAX_PAGES_PER_CATEGORY + 1):
        # Category page URL with pagination
        encoded_cat = category.replace(" ", "%20")
        url = f"{BASE_URL}/cfp/call?conference={encoded_cat}&page={page}"
        
        try:
            response = requests.get(url, timeout=15, headers={
                "User-Agent": "Mozilla/5.0 (compatible; ConfScoutBot/1.0)"
            })
            if response.status_code == 404:
                break
            response.raise_for_status()
        except Exception as e:
            print(f"[wikicfp] Page {page} failed for {category}: {e}")
            break
        
        soup = BeautifulSoup(response.text, "lxml" if __import__("importlib").util.find_spec("lxml") else "html.parser")
        
        # Find conference table rows
        page_confs = _parse_conference_list(soup, category, domain)
        
        if not page_confs:
            break  # No more conferences
        
        conferences.extend(page_confs)
    
    return conferences


def _parse_conference_list(soup: BeautifulSoup, category: str, domain: str) -> List[Dict]:
    """Parse conference list from WikiCFP page."""
    conferences: List[Dict] = []
    current_year = datetime.now().year
    
    # Find conference links - format: /cfp/servlet/event.showcfp?eventid=XXX
    links = soup.find_all("a", href=re.compile(r"event\.showcfp\?eventid="))
    
    for link in links:
        name = link.get_text(strip=True)
        href = link.get("href", "")
        
        if not name or not href:
            continue
        
        # Build full URL
        conf_url = href if href.startswith("http") else f"{BASE_URL}{href}"
        
        # Extract year from name (e.g., "ICML 2026" -> 2026)
        year_match = re.search(r"20\d{2}", name)
        year = int(year_match.group(0)) if year_match else None
        
        # Skip past conferences (before current year)
        if year and year < current_year:
            continue
        
        # Try to find the table row with more info
        parent_row = link.find_parent("tr")
        location = ""
        dates = None
        cfp_deadline = None
        
        if parent_row:
            cells = parent_row.find_all("td")
            if len(cells) >= 3:
                # WikiCFP format: Event | When | Where | Deadline
                location = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                if len(cells) > 3:
                    cfp_deadline = _parse_date(cells[3].get_text(strip=True))
        
        conference = {
            "name": name,
            "url": conf_url,
            "startDate": dates,
            "endDate": None,
            "location": {
                "city": "",
                "country": "",
                "raw": location,
            },
            "online": "online" in location.lower() or "virtual" in location.lower(),
            "cfp": {
                "url": conf_url,
                "endDate": cfp_deadline,
            } if cfp_deadline else None,
            "domain": domain,
            "tags": [domain, category.replace(" ", "-")],
            "source": "wikicfp",
        }
        
        conferences.append(conference)
    
    return conferences


def _parse_date(date_str: str) -> Optional[str]:
    """Parse date string to ISO format."""
    if not date_str:
        return None
    
    # Try common formats
    formats = [
        "%b %d, %Y",  # Jan 15, 2026
        "%B %d, %Y",  # January 15, 2026
        "%Y-%m-%d",   # 2026-01-15
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    # Try to extract just year-month-day pattern
    match = re.search(r"(\w+)\s+(\d+),?\s*(\d{4})", date_str)
    if match:
        try:
            month_str, day, year = match.groups()
            dt = datetime.strptime(f"{month_str} {day}, {year}", "%b %d, %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass
    
    return None


if __name__ == "__main__":
    confs = fetch()
    print(f"\nTotal: {len(confs)}")
    
    # Show by domain
    by_domain: Dict[str, int] = {}
    for c in confs:
        by_domain[c["domain"]] = by_domain.get(c["domain"], 0) + 1
    
    print("\nBy domain:")
    for domain, count in sorted(by_domain.items(), key=lambda x: -x[1]):
        print(f"  {domain}: {count}")
