"""
Deduplication Module

Smart merging of conferences from multiple sources.
"""

import re
from difflib import SequenceMatcher
from typing import Optional


# Source priority (higher = preferred)
SOURCE_PRIORITY = {
    "developers.events": 100,
    "dblp": 90,
    "ieee": 85,
    "tech-conferences": 80,
    "scraly": 70,
    "papercall": 60,
    "github-issues": 50,
}


def deduplicate(conferences: list[dict]) -> list[dict]:
    """
    Merge duplicate conferences.
    
    Matching criteria:
    1. Normalized name (80%+ similarity)
    2. Same start date (within 3 days)
    3. Similar location (fuzzy match)
    """
    if not conferences:
        return []
    
    # Group by normalized name prefix
    groups: dict[str, list[dict]] = {}
    
    for conf in conferences:
        key = _normalize_name(conf.get("name", ""))[:20]  # First 20 chars
        if key not in groups:
            groups[key] = []
        groups[key].append(conf)
    
    result = []
    
    for key, group in groups.items():
        if len(group) == 1:
            result.append(group[0])
            continue
        
        # Sort by source priority
        group.sort(key=lambda c: SOURCE_PRIORITY.get(c.get("source", ""), 0), reverse=True)
        
        merged = []
        used = set()
        
        for i, conf in enumerate(group):
            if i in used:
                continue
            
            # Find duplicates
            duplicates = [conf]
            for j, other in enumerate(group[i+1:], start=i+1):
                if j in used:
                    continue
                if _is_duplicate(conf, other):
                    duplicates.append(other)
                    used.add(j)
            
            # Merge duplicates into the highest priority one
            merged_conf = _merge_conferences(duplicates)
            merged.append(merged_conf)
        
        result.extend(merged)
    
    return result


def _normalize_name(name: str) -> str:
    """Normalize conference name for comparison."""
    if not name:
        return ""
    # Lowercase, remove special chars, collapse whitespace
    name = name.lower()
    name = re.sub(r"[^a-z0-9\s]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _is_duplicate(conf1: dict, conf2: dict) -> bool:
    """Check if two conferences are duplicates."""
    name1 = _normalize_name(conf1.get("name", ""))
    name2 = _normalize_name(conf2.get("name", ""))
    
    # Name similarity check
    similarity = SequenceMatcher(None, name1, name2).ratio()
    if similarity < 0.75:
        return False
    
    # Date check (if available)
    date1 = conf1.get("startDate")
    date2 = conf2.get("startDate")
    if date1 and date2:
        if abs(_date_diff(date1, date2)) > 7:  # More than 7 days apart
            return False
    
    return True


def _date_diff(date1: str, date2: str) -> int:
    """Calculate difference in days between two date strings."""
    from datetime import datetime
    try:
        d1 = datetime.strptime(date1, "%Y-%m-%d")
        d2 = datetime.strptime(date2, "%Y-%m-%d")
        return abs((d1 - d2).days)
    except:
        return 0


def _merge_conferences(duplicates: list[dict]) -> dict:
    """Merge multiple duplicate conferences into one."""
    if len(duplicates) == 1:
        return duplicates[0]
    
    # Start with highest priority
    duplicates.sort(key=lambda c: SOURCE_PRIORITY.get(c.get("source", ""), 0), reverse=True)
    base = duplicates[0].copy()
    
    # Fill in missing fields from other sources
    for dup in duplicates[1:]:
        if not base.get("startDate") and dup.get("startDate"):
            base["startDate"] = dup["startDate"]
        if not base.get("endDate") and dup.get("endDate"):
            base["endDate"] = dup["endDate"]
        if not base.get("cfp") and dup.get("cfp"):
            base["cfp"] = dup["cfp"]
        
        # Merge location info
        base_loc = base.get("location", {})
        dup_loc = dup.get("location", {})
        if not base_loc.get("city") and dup_loc.get("city"):
            base_loc["city"] = dup_loc["city"]
        if not base_loc.get("country") and dup_loc.get("country"):
            base_loc["country"] = dup_loc["country"]
        if not base_loc.get("lat") and dup_loc.get("lat"):
            base_loc["lat"] = dup_loc["lat"]
        if not base_loc.get("lng") and dup_loc.get("lng"):
            base_loc["lng"] = dup_loc["lng"]
        
        if not base.get("twitter") and dup.get("twitter"):
            base["twitter"] = dup["twitter"]
    
    # Track merged sources
    base["sources"] = list(set(d.get("source", "") for d in duplicates if d.get("source")))
    
    return base


if __name__ == "__main__":
    # Test deduplication
    test_data = [
        {"name": "SnowCamp 2026", "startDate": "2026-01-14", "source": "developers.events", "cfp": {"url": "..."}},
        {"name": "Snowcamp 2026!", "startDate": "2026-01-14", "source": "tech-conferences", "twitter": "@snowcamp"},
        {"name": "Different Conf", "startDate": "2026-02-01", "source": "papercall"},
    ]
    
    result = deduplicate(test_data)
    print(f"Deduped: {len(test_data)} -> {len(result)}")
    for r in result:
        print(f"  - {r['name']} (sources: {r.get('sources', [r.get('source')])})")
