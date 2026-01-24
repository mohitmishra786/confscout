#!/usr/bin/env python3
"""
Conference Data Fetcher for conf-finder

Fetches conference data from free sources:
1. tech-conferences/conference-data (confs.tech) - GitHub repository
2. Sessionize Explore page - HTML scraping for open CFPs

Outputs merged, deduplicated data to public/data/conferences.json
"""

import json
import re
import hashlib
import time
from datetime import datetime, date
from typing import Optional, Dict
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from dateutil.parser import parse as parse_date
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

# Configuration
GITHUB_BASE_URL = "https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences"
SESSIONIZE_EXPLORE_URL = "https://sessionize.com/app/speaker/opportunities"
OUTPUT_PATH = Path("public/data/conferences.json")
CACHE_PATH = Path("scripts/city_cache.json")

# Initialize Geocoder
geolocator = Nominatim(user_agent="conf_scout_fetcher_v2")
city_cache = {}

# Domain classification keywords with priority scoring
DOMAIN_KEYWORDS = {
    "ai": [
        "artificial intelligence", "ai", "machine learning", "ml", "deep learning",
        "neural networks", "chatgpt", "gpt", "llm", "large language models",
        "natural language processing", "nlp", "computer vision", "data science"
    ],
    "web": [
        "web development", "frontend", "backend", "full stack", "javascript",
        "react", "vue", "angular", "node", "nextjs", "next.js", "typescript",
        "css", "html", "web technologies"
    ],
    "mobile": [
        "mobile", "ios", "android", "swift", "kotlin", "react native", "flutter",
        "mobile development", "app development"
    ],
    "devops": [
        "devops", "kubernetes", "docker", "cloud", "aws", "azure", "gcp",
        "infrastructure", "ci/cd", "site reliability", "sre", "platform"
    ],
    "security": [
        "security", "cybersecurity", "infosec", "penetration testing", "ethical hacking",
        "appsec", "application security", "privacy", "compliance"
    ],
    "data": [
        "data engineering", "data science", "big data", "analytics", "database",
        "sql", "nosql", "data pipeline", "etl", "data warehouse"
    ],
    "gaming": [
        "gaming", "game development", "game design", "unity", "unreal",
        "game engine", "esports"
    ],
    "blockchain": [
        "blockchain", "crypto", "web3", "ethereum", "bitcoin", "defi",
        "nft", "smart contracts", "solidity"
    ],
    "ux": [
        "ux", "user experience", "ui", "user interface", "design thinking",
        "usability", "user research", "interaction design", "product design"
    ],
    "opensource": [
        "open source", "opensource", "foss", "linux", "gnu", "community"
    ]
}

# Financial aid detection keywords
FINANCIAL_AID_KEYWORDS = [
    "scholarship", "travel grant", "travel grants", "financial aid",
    "financial assistance", "diversity scholarship", "diversity grant",
    "stipend", "speaker support", "travel support", "accommodation support",
    "opportunity grant", "diversity fund", "inclusion"
]

# Country to continent mapping (common countries)
COUNTRY_CONTINENTS = {
    "U.S.A.": "North America", "USA": "North America", "United States": "North America",
    "Canada": "North America", "Mexico": "North America",
    "Brazil": "South America", "Argentina": "South America", "Chile": "South America",
    "Colombia": "South America", "Peru": "South America",
    "U.K.": "Europe", "UK": "Europe", "United Kingdom": "Europe",
    "Germany": "Europe", "France": "Europe", "Netherlands": "Europe",
    "Spain": "Europe", "Italy": "Europe", "Poland": "Europe", "Sweden": "Europe",
    "Norway": "Europe", "Denmark": "Europe", "Finland": "Europe", "Austria": "Europe",
    "Belgium": "Europe", "Switzerland": "Europe", "Portugal": "Europe",
    "Czech Republic": "Europe", "Ireland": "Europe", "Greece": "Europe",
    "Romania": "Europe", "Hungary": "Europe", "Croatia": "Europe", "Serbia": "Europe",
    "Slovenia": "Europe", "Slovakia": "Europe", "Estonia": "Europe", "Latvia": "Europe",
    "Lithuania": "Europe", "Ukraine": "Europe", "Russia": "Europe",
    "India": "Asia", "Japan": "Asia", "China": "Asia", "South Korea": "Asia",
    "Singapore": "Asia", "Thailand": "Asia", "Vietnam": "Asia", "Malaysia": "Asia",
    "Indonesia": "Asia", "Philippines": "Asia", "Taiwan": "Asia", "Hong Kong": "Asia",
    "Israel": "Asia", "UAE": "Asia", "United Arab Emirates": "Asia", "Turkey": "Asia",
    "Australia": "Oceania", "New Zealand": "Oceania",
    "South Africa": "Africa", "Kenya": "Africa", "Nigeria": "Africa", "Egypt": "Africa",
}


def load_cache():
    """Load city coordinates cache."""
    global city_cache
    if CACHE_PATH.exists():
        try:
            with open(CACHE_PATH, 'r', encoding='utf-8') as f:
                city_cache = json.load(f)
            print(f"[INFO] Loaded {len(city_cache)} cached locations.")
        except json.JSONDecodeError:
            print("[WARN] Cache file corrupted. Starting fresh.")
            city_cache = {}
    else:
        city_cache = {}


def save_cache():
    """Save city coordinates cache."""
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(city_cache, f, indent=2, ensure_ascii=False)
    print(f"[INFO] Saved {len(city_cache)} locations to cache.")


def get_coordinates(city: str, country: str) -> Dict[str, float]:
    """
    Get coordinates for a city, country pair.
    Uses caching and rate limiting.
    """
    if not city or not country:
        return {}

    key = f"{city}, {country}".lower()
    
    # Check cache
    if key in city_cache:
        return city_cache[key]

    # Clean up inputs
    query = f"{city}, {country}"
    
    try:
        # Be nice to Nominatim
        time.sleep(1) 
        location = geolocator.geocode(query)
        
        if location:
            coords = {
                "lat": location.latitude,
                "lng": location.longitude
            }
            city_cache[key] = coords
            print(f"  [GEO] Found: {query} -> {coords}")
            return coords
        else:
            print(f"  [GEO] Not found: {query}")
            city_cache[key] = {} # Cache misses too to avoid repaying
            return {}
            
    except (GeocoderTimedOut, Exception) as e:
        print(f"  [GEO] Error geocoding {query}: {e}")
        return {}


def get_continent(country: str) -> str:
    """Map country to continent."""
    return COUNTRY_CONTINENTS.get(country, "Other")


def classify_domain(name: str, description: str = "") -> str:
    """Classify a conference into a domain based on keywords."""
    text = f"{name} {description}".lower()

    domain_scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for keyword in keywords if keyword in text)
        if score > 0:
            domain_scores[domain] = score

    if domain_scores:
        return max(domain_scores, key=domain_scores.get)
    return "general"


def detect_financial_aid(description: str = "", name: str = "") -> dict:
    """Detect financial aid availability from text."""
    text = f"{name} {description}".lower()

    detected_types = []
    for keyword in FINANCIAL_AID_KEYWORDS:
        if keyword in text:
            if "travel" in keyword:
                if "travel" not in detected_types:
                    detected_types.append("travel")
            elif "accommodation" in keyword:
                if "accommodation" not in detected_types:
                    detected_types.append("accommodation")
            elif "ticket" in keyword:
                if "ticket" not in detected_types:
                    detected_types.append("ticket")
            elif "stipend" in keyword:
                if "stipend" not in detected_types:
                    detected_types.append("stipend")
            else:
                # Generic financial aid
                if "other" not in detected_types:
                    detected_types.append("other")

    return {
        "available": len(detected_types) > 0,
        "types": detected_types if detected_types else [],
        "url": None,
        "notes": None
    }


def generate_id(name: str, start_date: str) -> str:
    """Generate unique ID from name and date."""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return f"{slug}-{start_date}"


def calculate_cfp_days_remaining(cfp_end_date: str) -> int:
    """Calculate days remaining until CFP deadline."""
    try:
        deadline = datetime.strptime(cfp_end_date, "%Y-%m-%d").date()
        today = date.today()
        delta = (deadline - today).days
        return max(0, delta)
    except (ValueError, TypeError):
        return -1


def extract_tags(name: str, description: str = "") -> list:
    """Extract technology tags from conference name/description."""
    text = f"{name} {description}".lower()

    tag_keywords = {
        "react": ["react", "reactjs", "react.js"],
        "vue": ["vue", "vuejs", "vue.js"],
        "angular": ["angular"],
        "typescript": ["typescript", "ts"],
        "javascript": ["javascript", "js", "ecmascript"],
        "python": ["python", "django", "flask", "fastapi"],
        "rust": ["rust", "rustlang"],
        "go": ["golang", " go "],
        "java": ["java", "jvm", "spring"],
        "kotlin": ["kotlin"],
        "swift": ["swift", "swiftui"],
        "kubernetes": ["kubernetes", "k8s"],
        "docker": ["docker", "container"],
        "aws": ["aws", "amazon web services"],
        "graphql": ["graphql"],
        "api": ["api", "rest", "restful"],
        "microservices": ["microservices", "micro-services"],
        "testing": ["testing", "qa", "quality assurance", "tdd"],
        "performance": ["performance", "optimization"],
        "accessibility": ["accessibility", "a11y"],
    }

    found_tags = []
    for tag, keywords in tag_keywords.items():
        for keyword in keywords:
            if keyword in text and tag not in found_tags:
                found_tags.append(tag)
                break

    return found_tags


def fetch_confs_tech_data() -> list:
    """Fetch conference data from tech-conferences/conference-data repository."""
    conferences = []
    current_year = datetime.now().year

    # Fetch current and next year
    years = [current_year, current_year + 1]

    # Topics to fetch
    topics = [
        "javascript", "typescript", "java", "python", "rust", "kotlin",
        "android", "ios", "devops", "security", "data", "general",
        "css", "php", "dotnet", "ux", "accessibility", "api",
        "networking", "performance", "testing", "opensource", "leadership", "product"
    ]

    for year in years:
        for topic in topics:
            url = f"{GITHUB_BASE_URL}/{year}/{topic}.json"
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    for conf in data:
                        conferences.append(parse_confs_tech_entry(conf, topic))
                    print(f"[OK] Fetched {len(data)} conferences from {year}/{topic}.json")
            except requests.RequestException as e:
                print(f"[FAIL] Failed to fetch {url}: {e}")
            except json.JSONDecodeError:
                print(f"[FAIL] Invalid JSON in {url}")

    return conferences


def parse_confs_tech_entry(entry: dict, source_topic: str) -> dict:
    """Parse a single conference entry from confs.tech format."""
    name = entry.get("name", "")
    description = entry.get("description", "") or ""
    start_date = entry.get("startDate", "")
    end_date = entry.get("endDate", start_date)
    city = entry.get("city", "")
    country = entry.get("country", "")
    online = entry.get("online", False)

    # CFP handling
    cfp_url = entry.get("cfpUrl")
    cfp_end_date = entry.get("cfpEndDate")
    cfp = None

    if cfp_url and cfp_end_date:
        days_remaining = calculate_cfp_days_remaining(cfp_end_date)
        cfp = {
            "url": cfp_url,
            "endDate": cfp_end_date,
            "daysRemaining": days_remaining,
            "isOpen": days_remaining > 0
        }

    # Classify domain
    domain = classify_domain(name, description)

    # Detect financial aid
    financial_aid = detect_financial_aid(description, name)

    # Extract tags
    tags = extract_tags(name, description)

    # Determine hybrid status
    hybrid = online and bool(city)
    
    # Get coordinates
    coords = get_coordinates(city, country) if city and country else {}

    return {
        "id": generate_id(name, start_date),
        "name": name,
        "url": entry.get("url", ""),
        "startDate": start_date,
        "endDate": end_date,
        "location": {
            "city": city or "",
            "country": country or "",
            "raw": f"{city}, {country}" if city and country else "Online" if online else "",
            "lat": coords.get("lat"),
            "lng": coords.get("lng")
        },
        "continent": get_continent(country) if country else "Online",
        "online": online,
        "hybrid": hybrid,
        "cfp": cfp,
        "financialAid": financial_aid,
        "domain": domain,
        "tags": tags,
        "description": description or None,
        "twitter": entry.get("twitter", "").lstrip("@") if entry.get("twitter") else None,
        "mastodon": None,
        "cocUrl": entry.get("cocUrl"),
        "source": "confs.tech",
        "lastUpdated": datetime.now().isoformat()
    }


def fetch_sessionize_cfps() -> list:
    """
    Fetch open CFPs from known Sessionize URLs.
    
    Sessionize does NOT have a public "browse all CFPs" page. Their API is only
    for event organizers to access their own event's data. Each event has its own
    unique CFP URL (e.g., https://sessionize.com/event-name/).
    
    This function scrapes individual Sessionize CFP pages using the same approach
    as the Scrapionize .NET library (https://github.com/rickvdbosch/scrapionize).
    
    To add more Sessionize events, add their URLs to the SESSIONIZE_CFPS list below.
    """
    conferences = []
    
    # Known Sessionize CFP URLs - add new ones here
    # You can find these by searching for "sessionize.com" in conference listings
    SESSIONIZE_CFPS = [
        # Add known Sessionize CFP URLs here, e.g.:
        # "https://sessionize.com/techorama-2026",
        # "https://sessionize.com/ndc-oslo-2026",
    ]
    
    if not SESSIONIZE_CFPS:
        print("[INFO] Sessionize: No CFP URLs configured")
        print("       Add Sessionize CFP URLs to SESSIONIZE_CFPS list in fetch_confs.py")
        return []
    
    print(f"[INFO] Sessionize: Scraping {len(SESSIONIZE_CFPS)} known CFP pages...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; conf-finder/2.0; +https://github.com/mohitmishra786/conf-finder)"
    }
    
    for url in SESSIONIZE_CFPS:
        try:
            conf = scrape_sessionize_cfp_page(url, headers)
            if conf:
                conferences.append(conf)
                print(f"  [OK] Scraped: {conf['name']}")
        except Exception as e:
            print(f"  [FAIL] Failed to scrape {url}: {e}")
    
    print(f"[OK] Fetched {len(conferences)} CFPs from Sessionize")
    return conferences


def scrape_sessionize_cfp_page(url: str, headers: dict) -> Optional[dict]:
    """
    Scrape a single Sessionize CFP page.
    
    Based on Scrapionize approach:
    - Event name from h4 in ibox-title
    - Dates from h2 tags in ibox-content sections
    - Left column (2nd ibox-content): Event dates, location, website
    - Right column (3rd ibox-content): CFP dates, travel/accommodation info
    """
    response = requests.get(url, headers=headers, timeout=15)
    if response.status_code != 200:
        return None
    
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract event name from ibox-title container
    title_box = soup.find(class_="ibox-title")
    if not title_box:
        return None
    
    name_tag = title_box.find("h4")
    if not name_tag:
        return None
    
    name = name_tag.get_text(strip=True)
    
    # Get content boxes (0=header, 1=left column, 2=right column)
    content_boxes = soup.find_all(class_="ibox-content")
    if len(content_boxes) < 3:
        return None
    
    left_col = content_boxes[1]
    right_col = content_boxes[2]
    
    # Extract dates from left column (event dates)
    left_h2s = left_col.find_all("h2")
    event_start = parse_sessionize_date(left_h2s[0].get_text(strip=True)) if len(left_h2s) > 0 else None
    event_end = parse_sessionize_date(left_h2s[1].get_text(strip=True)) if len(left_h2s) > 1 else event_start
    
    # Extract location from left column (spans in 3rd h2)
    location = ""
    if len(left_h2s) > 2:
        spans = left_h2s[2].find_all("span")
        location = " ".join(span.get_text(strip=True) for span in spans)
    
    # Extract website from left column (anchor in 4th h2)
    website = url  # Default to CFP URL
    if len(left_h2s) > 3:
        link = left_h2s[3].find("a")
        if link and link.get("href"):
            website = link.get("href")
    
    # Extract CFP dates from right column
    right_h2s = right_col.find_all("h2")
    cfp_start = parse_sessionize_date(right_h2s[0].get_text(strip=True)) if len(right_h2s) > 0 else None
    cfp_end = parse_sessionize_date(right_h2s[1].get_text(strip=True)) if len(right_h2s) > 1 else None
    
    # Extract financial aid info from right column (last 3 h3 tags)
    right_h3s = right_col.find_all("h3")
    financial_aid = detect_sessionize_financial_aid(right_h3s)
    
    # Parse location into city/country
    city, country = parse_location(location)
    
    # Calculate CFP days remaining
    cfp = None
    if cfp_end:
        days_remaining = calculate_cfp_days_remaining(cfp_end)
        cfp = {
            "url": url,
            "endDate": cfp_end,
            "daysRemaining": days_remaining,
            "isOpen": days_remaining > 0
        }
    
    coords = get_coordinates(city, country) if city and country else {}
    
    return {
        "id": generate_id(name, event_start or ""),
        "name": name,
        "url": website,
        "startDate": event_start or "",
        "endDate": event_end or event_start or "",
        "location": {
            "city": city,
            "country": country,
            "raw": location,
            "lat": coords.get("lat"),
            "lng": coords.get("lng")
        },
        "continent": get_continent(country) if country else "Other",
        "online": "online" in location.lower() or "virtual" in location.lower(),
        "hybrid": False,
        "cfp": cfp,
        "financialAid": financial_aid,
        "domain": classify_domain(name, ""),
        "tags": extract_tags(name, ""),
        "description": None,
        "twitter": None,
        "mastodon": None,
        "cocUrl": None,
        "source": "sessionize",
        "lastUpdated": datetime.now().isoformat()
    }


def parse_sessionize_date(date_str: str) -> Optional[str]:
    """Parse Sessionize date format (e.g., '15 Mar 2026') to ISO format."""
    try:
        parsed = parse_date(date_str, dayfirst=True)
        return parsed.strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def parse_location(location: str) -> tuple:
    """Parse location string into city and country."""
    if not location:
        return "", ""
    
    parts = [p.strip() for p in location.split(",")]
    if len(parts) >= 2:
        return parts[0], parts[-1]
    return location, ""


def detect_sessionize_financial_aid(h3_tags) -> dict:
    """Detect financial aid from Sessionize right column h3 tags."""
    types = []
    
    for h3 in h3_tags[-3:] if len(h3_tags) >= 3 else h3_tags:
        text = h3.get_text(strip=True).lower()
        # Check next sibling for Yes/No
        sibling = h3.find_next_sibling()
        if sibling:
            sibling_text = sibling.get_text(strip=True).lower()
            if "yes" in sibling_text:
                if "travel" in text:
                    types.append("travel")
                elif "accommodation" in text:
                    types.append("accommodation")
                elif "fee" in text or "ticket" in text:
                    types.append("ticket")
    
    return {
        "available": len(types) > 0,
        "types": types,
        "url": None,
        "notes": None
    }


def parse_sessionize_card(card) -> Optional[dict]:
    """Parse a Sessionize event card into conference format."""
    # Not implemented - Sessionize doesn't have a public CFP listing page
    return None


def deduplicate_conferences(conferences: list) -> list:
    """Remove duplicate conferences based on name, URL, and start date."""
    seen = set()
    unique = []

    for conf in conferences:
        # Create a unique key
        key = f"{conf['name'].lower()}|{conf['url']}|{conf['startDate']}"
        key_hash = hashlib.md5(key.encode()).hexdigest()

        if key_hash not in seen:
            seen.add(key_hash)
            unique.append(conf)

    return unique


def filter_upcoming_conferences(conferences: list) -> list:
    """Filter to only include upcoming conferences."""
    today = date.today()
    upcoming = []

    for conf in conferences:
        try:
            conf_date = datetime.strptime(conf['startDate'], "%Y-%m-%d").date()
            if conf_date >= today:
                upcoming.append(conf)
        except (ValueError, TypeError):
            # Include conferences with invalid dates (better to show than hide)
            upcoming.append(conf)

    return sorted(upcoming, key=lambda x: x['startDate'])


def generate_domains(conferences: list) -> list:
    """Generate domain metadata from conferences."""
    domain_counts = {}
    for conf in conferences:
        domain = conf.get('domain', 'general')
        domain_counts[domain] = domain_counts.get(domain, 0) + 1

    domain_metadata = {
        "ai": {"name": "AI & Machine Learning", "icon": "robot", "color": "#8B5CF6", "description": "Artificial intelligence, ML, and data science conferences"},
        "web": {"name": "Web Development", "icon": "globe", "color": "#3B82F6", "description": "Frontend, backend, and full-stack web development"},
        "mobile": {"name": "Mobile Development", "icon": "mobile", "color": "#10B981", "description": "iOS, Android, and cross-platform mobile development"},
        "devops": {"name": "DevOps & Cloud", "icon": "cloud", "color": "#F59E0B", "description": "DevOps, cloud infrastructure, and platform engineering"},
        "security": {"name": "Security", "icon": "lock", "color": "#EF4444", "description": "Cybersecurity, AppSec, and privacy"},
        "data": {"name": "Data Engineering", "icon": "chart", "color": "#06B6D4", "description": "Data engineering, analytics, and databases"},
        "gaming": {"name": "Gaming & Game Dev", "icon": "gamepad", "color": "#EC4899", "description": "Game development and gaming industry"},
        "blockchain": {"name": "Blockchain & Web3", "icon": "chain", "color": "#6366F1", "description": "Blockchain, cryptocurrency, and Web3"},
        "ux": {"name": "UX & Design", "icon": "palette", "color": "#F472B6", "description": "User experience, UI design, and product design"},
        "opensource": {"name": "Open Source", "icon": "heart", "color": "#22C55E", "description": "Open source software and community"},
        "general": {"name": "General Tech", "icon": "laptop", "color": "#6B7280", "description": "General technology conferences"}
    }

    domains = []
    for slug, count in sorted(domain_counts.items(), key=lambda x: x[1], reverse=True):
        meta = domain_metadata.get(slug, {
            "name": slug.title(),
            "icon": "pin",
            "color": "#6B7280",
            "description": f"{slug.title()} conferences"
        })
        domains.append({
            "slug": slug,
            "name": meta["name"],
            "description": meta["description"],
            "icon": meta["icon"],
            "color": meta["color"],
            "conferenceCount": count
        })

    return domains


def generate_stats(conferences: list, domains: list) -> dict:
    """Generate statistics for the data."""
    open_cfps = sum(1 for c in conferences if c.get('cfp') and c['cfp'].get('isOpen'))
    with_financial_aid = sum(1 for c in conferences if c.get('financialAid', {}).get('available'))

    by_continent = {}
    for conf in conferences:
        continent = conf.get('continent', 'Other')
        by_continent[continent] = by_continent.get(continent, 0) + 1

    return {
        "totalConferences": len(conferences),
        "openCfps": open_cfps,
        "withFinancialAid": with_financial_aid,
        "byContinent": by_continent
    }


def main():
    """Main entry point."""
    print("=" * 60)
    print("Conference Data Fetcher v2.0")
    print(f"Started at: {datetime.now().isoformat()}")
    print("=" * 60)
    
    load_cache()

    # Collect conferences from all sources
    all_conferences = []

    # 1. Fetch from confs.tech (GitHub)
    print("\n[1/2] Fetching from tech-conferences/conference-data...")
    confs_tech_data = fetch_confs_tech_data()
    all_conferences.extend(confs_tech_data)

    # 2. Fetch from Sessionize
    print("\n[2/2] Fetching from Sessionize...")
    sessionize_data = fetch_sessionize_cfps()
    all_conferences.extend(sessionize_data)

    # Deduplicate
    print(f"\n[Processing] Deduplicating {len(all_conferences)} conferences...")
    unique_conferences = deduplicate_conferences(all_conferences)
    print(f"  → {len(unique_conferences)} unique conferences")

    # Filter to upcoming only
    print("[Processing] Filtering to upcoming conferences...")
    upcoming_conferences = filter_upcoming_conferences(unique_conferences)
    print(f"  → {len(upcoming_conferences)} upcoming conferences")

    # Generate domains
    domains = generate_domains(upcoming_conferences)

    # Generate stats
    stats = generate_stats(upcoming_conferences, domains)

    # Create output structure
    output = {
        "lastUpdated": datetime.now().isoformat(),
        "source": "github-actions",
        "version": "2.0.0",
        "stats": stats,
        "domains": domains,
        "conferences": upcoming_conferences
    }

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Write output
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        
    save_cache()

    print(f"\n{'=' * 60}")
    print(f"[SUCCESS] Wrote {len(upcoming_conferences)} conferences to {OUTPUT_PATH}")
    print(f"   - Open CFPs: {stats['openCfps']}")
    print(f"   - With Financial Aid: {stats['withFinancialAid']}")
    print(f"   - Domains: {len(domains)}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
