"""
HTTP Client Configuration for Python Scrapers

Centralized HTTP client configuration with proper User-Agent headers
to avoid being blocked/flagged by external services.
"""

import requests
from typing import Dict, Optional

# Standard User-Agent for ConfScout scrapers
# Format: Mozilla/5.0 (compatible; BotName/Version; +ContactURL)
DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; ConfScoutBot/2.0; +https://confscout.site)"

# Descriptive User-Agent for services that prefer transparency
DESCRIPTIVE_USER_AGENT = (
    "ConfScout/2.0 (Conference Aggregator; https://confscout.site) "
    "Python-requests/2.x (Bot; Data Collection for Public Directory)"
)

# Nominatim Geocoder User-Agent (must be descriptive per their ToS)
NOMINATIM_USER_AGENT = "ConfScout-Conference-Finder/2.0"

# GitHub API User-Agent (best practice for GitHub API)
GITHUB_USER_AGENT = "ConfScout-Data-Fetcher/2.0"


def create_session(
    user_agent: str = DEFAULT_USER_AGENT,
    additional_headers: Optional[Dict[str, str]] = None,
    timeout: int = 30
) -> requests.Session:
    """
    Create a configured requests session with proper headers.
    
    Args:
        user_agent: User-Agent string to use
        additional_headers: Additional headers to include
        timeout: Default timeout for requests
    
    Returns:
        Configured requests.Session
    """
    session = requests.Session()
    
    # Set default headers
    headers = {
        "User-Agent": user_agent,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",  # Do Not Track
        "Connection": "keep-alive",
    }
    
    # Add any additional headers
    if additional_headers:
        headers.update(additional_headers)
    
    session.headers.update(headers)

    return session


def get_with_retry(
    url: str,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 1.0,
    **kwargs
) -> requests.Response:
    """
    Make a GET request with retry logic.

    Args:
        url: URL to fetch
        session: Optional pre-configured session
        max_retries: Maximum number of retries
        backoff_factor: Backoff factor for retries
        **kwargs: Additional arguments for requests.get()

    Returns:
        Response object

    Raises:
        ValueError: If max_retries is less than 1
        requests.RequestException: If all retries fail
    """
    if max_retries < 1:
        raise ValueError("max_retries must be at least 1")

    if session is None:
        session = create_session()

    last_exception: Optional[requests.RequestException] = None

    for attempt in range(max_retries):
        try:
            response = session.get(url, **kwargs)
            response.raise_for_status()
            return response
        except requests.RequestException as e:
            last_exception = e
            if attempt < max_retries - 1:
                import time
                sleep_time = backoff_factor * (2 ** attempt)
                print(f"[HTTP] Retry {attempt + 1}/{max_retries} for {url} after {sleep_time}s")
                time.sleep(sleep_time)
            continue

    # This should never happen due to the max_retries check above, but keeps LSP happy
    if last_exception is None:
        raise RuntimeError("Unexpected error: last_exception is None")
    raise last_exception


class ConfScoutHTTPClient:
    """
    HTTP client for ConfScout scrapers with proper User-Agent headers.
    """

    def __init__(self, user_agent: str = DEFAULT_USER_AGENT, timeout: int = 30):
        self.session = create_session(user_agent)
        self.request_count = 0
        self._default_timeout = timeout

    def get(self, url: str, **kwargs) -> requests.Response:
        """Make a GET request."""
        self.request_count += 1
        # Apply default timeout if not provided
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self._default_timeout
        return self.session.get(url, **kwargs)

    def get_with_retry(self, url: str, **kwargs) -> requests.Response:
        """Make a GET request with retry logic."""
        # Apply default timeout if not provided
        if 'timeout' not in kwargs:
            kwargs['timeout'] = self._default_timeout
        return get_with_retry(url, self.session, **kwargs)

    def close(self):
        """Close the session."""
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# Pre-configured clients for different services
class GitHubHTTPClient(ConfScoutHTTPClient):
    """HTTP client optimized for GitHub API requests."""
    
    def __init__(self):
        super().__init__(user_agent=GITHUB_USER_AGENT)
        self.session.headers.update({
            "Accept": "application/vnd.github.v3+json",
        })


class NominatimHTTPClient(ConfScoutHTTPClient):
    """HTTP client for Nominatim geocoding (respects rate limits)."""
    
    def __init__(self):
        super().__init__(user_agent=NOMINATIM_USER_AGENT)
        self.last_request_time = 0
    
    def get(self, url: str, **kwargs) -> requests.Response:
        """Make a GET request with rate limiting (1 req/sec)."""
        import time
        
        # Enforce 1 second delay between requests per Nominatim ToS
        elapsed = time.time() - self.last_request_time
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)
        
        response = super().get(url, **kwargs)
        self.last_request_time = time.time()
        return response
