#!/usr/bin/env python3
"""
Tests for HTTP Client User-Agent Configuration

This module tests that all scrapers use proper User-Agent headers
to avoid being blocked by external services.
"""

import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add scripts directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

from utils.http_client import (
    ConfScoutHTTPClient,
    GitHubHTTPClient,
    NominatimHTTPClient,
    create_session,
    get_with_retry,
    DEFAULT_USER_AGENT,
    DESCRIPTIVE_USER_AGENT,
    NOMINATIM_USER_AGENT,
    GITHUB_USER_AGENT,
)


class TestUserAgentConstants(unittest.TestCase):
    """Test that User-Agent constants are properly defined."""

    def test_default_user_agent_format(self):
        """Default User-Agent should follow standard format."""
        self.assertIn("ConfScoutBot", DEFAULT_USER_AGENT)
        self.assertIn("2.0", DEFAULT_USER_AGENT)
        self.assertIn("https://confscout.site", DEFAULT_USER_AGENT)
        self.assertTrue(DEFAULT_USER_AGENT.startswith("Mozilla/5.0"))

    def test_descriptive_user_agent_content(self):
        """Descriptive User-Agent should contain project info."""
        self.assertIn("ConfScout", DESCRIPTIVE_USER_AGENT)
        self.assertIn("Conference Aggregator", DESCRIPTIVE_USER_AGENT)
        self.assertIn("Bot", DESCRIPTIVE_USER_AGENT)

    def test_nominatim_user_agent(self):
        """Nominatim User-Agent should be descriptive per their ToS."""
        self.assertIn("ConfScout", NOMINATIM_USER_AGENT)
        self.assertIn("Conference-Finder", NOMINATIM_USER_AGENT)
        self.assertNotIn("Mozilla", NOMINATIM_USER_AGENT)

    def test_github_user_agent(self):
        """GitHub User-Agent should identify the project."""
        self.assertIn("ConfScout", GITHUB_USER_AGENT)
        self.assertIn("Data-Fetcher", GITHUB_USER_AGENT)


class TestCreateSession(unittest.TestCase):
    """Test session creation with proper headers."""

    def test_session_has_user_agent(self):
        """Created session should have User-Agent header."""
        session = create_session()
        self.assertIn("User-Agent", session.headers)
        self.assertEqual(session.headers["User-Agent"], DEFAULT_USER_AGENT)

    def test_session_has_other_headers(self):
        """Session should have all standard headers."""
        session = create_session()
        self.assertIn("Accept", session.headers)
        self.assertIn("Accept-Language", session.headers)
        self.assertIn("DNT", session.headers)

    def test_custom_user_agent(self):
        """Should accept custom User-Agent."""
        custom_ua = "CustomBot/1.0"
        session = create_session(user_agent=custom_ua)
        self.assertEqual(session.headers["User-Agent"], custom_ua)

    def test_additional_headers(self):
        """Should accept additional headers."""
        extra = {"X-Custom": "value", "Authorization": "Bearer token"}
        session = create_session(additional_headers=extra)
        self.assertEqual(session.headers["X-Custom"], "value")
        self.assertEqual(session.headers["Authorization"], "Bearer token")


class TestConfScoutHTTPClient(unittest.TestCase):
    """Test ConfScoutHTTPClient class."""

    def test_client_initialization(self):
        """Client should initialize with proper User-Agent."""
        client = ConfScoutHTTPClient()
        self.assertEqual(client.session.headers["User-Agent"], DEFAULT_USER_AGENT)
        self.assertEqual(client.request_count, 0)
        client.close()

    def test_client_tracks_requests(self):
        """Client should track request count."""
        client = ConfScoutHTTPClient()
        
        # Mock the session.get method
        client.session.get = Mock(return_value=Mock(status_code=200))
        
        client.get("http://example.com")
        self.assertEqual(client.request_count, 1)
        
        client.get("http://example.com")
        self.assertEqual(client.request_count, 2)
        
        client.close()

    def test_context_manager(self):
        """Client should work as context manager."""
        with ConfScoutHTTPClient() as client:
            self.assertIsNotNone(client.session)
        # After exiting context, session should be closed

    @patch('utils.http_client.get_with_retry')
    def test_get_with_retry(self, mock_retry):
        """get_with_retry should delegate to utility function."""
        mock_retry.return_value = Mock(status_code=200)
        
        client = ConfScoutHTTPClient()
        response = client.get_with_retry("http://example.com", max_retries=5)
        
        mock_retry.assert_called_once()
        self.assertEqual(response.status_code, 200)
        client.close()


class TestGitHubHTTPClient(unittest.TestCase):
    """Test GitHubHTTPClient class."""

    def test_github_specific_headers(self):
        """GitHub client should have API-specific headers."""
        client = GitHubHTTPClient()
        
        self.assertEqual(client.session.headers["User-Agent"], GITHUB_USER_AGENT)
        self.assertEqual(
            client.session.headers["Accept"],
            "application/vnd.github.v3+json"
        )
        
        client.close()


class TestNominatimHTTPClient(unittest.TestCase):
    """Test NominatimHTTPClient class."""

    def test_nominatim_user_agent(self):
        """Nominatim client should have proper User-Agent."""
        client = NominatimHTTPClient()
        self.assertEqual(client.session.headers["User-Agent"], NOMINATIM_USER_AGENT)
        client.close()

    @patch('time.time')
    @patch('time.sleep')
    def test_rate_limiting(self, mock_sleep, mock_time):
        """Nominatim client should enforce 1 second delay between requests."""
        # Provide four time values: first call (init), second call (after first get), 
        # third call (before second get), fourth call (after second get)
        mock_time.side_effect = [1.0, 1.0, 1.5, 2.5]

        client = NominatimHTTPClient()
        client.session.get = Mock(return_value=Mock(status_code=200))

        # First request - no sleep needed
        client.get("http://example.com")
        mock_sleep.assert_not_called()

        # Second request - should sleep for remaining time (0.5s)
        client.get("http://example.com")
        mock_sleep.assert_called_once_with(0.5)

        client.close()


class TestGetWithRetry(unittest.TestCase):
    """Test get_with_retry function."""

    @patch('utils.http_client.requests.Session.get')
    @patch('time.sleep')
    def test_success_on_first_try(self, mock_sleep, mock_get):
        """Should return response on first successful request."""
        mock_get.return_value = Mock(status_code=200, raise_for_status=Mock())
        
        session = create_session()
        response = get_with_retry("http://example.com", session)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_get.call_count, 1)

    @patch('utils.http_client.requests.Session.get')
    @patch('time.sleep')
    def test_retry_on_failure(self, mock_sleep, mock_get):
        """Should retry on request failure."""
        from requests import RequestException
        
        mock_get.side_effect = [
            RequestException("Network error"),
            Mock(status_code=200, raise_for_status=Mock())
        ]
        
        session = create_session()
        response = get_with_retry("http://example.com", session, max_retries=3)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_get.call_count, 2)
        mock_sleep.assert_called_once()

    @patch('utils.http_client.requests.Session.get')
    @patch('time.sleep')
    def test_exhaust_retries(self, mock_sleep, mock_get):
        """Should raise exception after exhausting retries."""
        from requests import RequestException
        
        mock_get.side_effect = RequestException("Network error")
        
        session = create_session()
        
        with self.assertRaises(RequestException):
            get_with_retry("http://example.com", session, max_retries=2)
        
        self.assertEqual(mock_get.call_count, 2)


class TestSecurityCompliance(unittest.TestCase):
    """Test security compliance of User-Agent usage."""

    def test_no_sensitive_info_in_user_agent(self):
        """User-Agent should not contain sensitive information."""
        user_agents = [
            DEFAULT_USER_AGENT,
            DESCRIPTIVE_USER_AGENT,
            NOMINATIM_USER_AGENT,
            GITHUB_USER_AGENT,
        ]
        
        sensitive_patterns = [
            "password", "secret", "key", "token", "api_key",
            "admin", "root", "administrator", "@gmail", "@example",
        ]
        
        for ua in user_agents:
            ua_lower = ua.lower()
            for pattern in sensitive_patterns:
                self.assertNotIn(
                    pattern, ua_lower,
                    f"User-Agent should not contain '{pattern}'"
                )

    def test_user_agent_identifies_project(self):
        """User-Agent should clearly identify the project."""
        user_agents = [
            DEFAULT_USER_AGENT,
            DESCRIPTIVE_USER_AGENT,
            NOMINATIM_USER_AGENT,
            GITHUB_USER_AGENT,
        ]
        
        for ua in user_agents:
            self.assertIn("ConfScout", ua, "User-Agent should identify ConfScout project")


if __name__ == "__main__":
    unittest.main()
