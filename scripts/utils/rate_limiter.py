import time
import asyncio
from functools import wraps
from typing import Callable
from datetime import datetime, timedelta


class RateLimiter:
    def __init__(self, calls: int, period: float):
        self.calls = calls
        self.period = period
        self.timestamps = []
        self._lock = asyncio.Lock()

    async def acquire(self):
        async with self._lock:
            now = time.time()
            # Remove timestamps older than period
            self.timestamps = [t for t in self.timestamps if now - t < self.period]

            if len(self.timestamps) >= self.calls:
                # Calculate wait time
                sleep_time = self.period - (now - self.timestamps[0])
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    # Clean up old timestamps after waiting
                    now = time.time()
                    self.timestamps = [t for t in self.timestamps if now - t < self.period]

            self.timestamps.append(now)


def rate_limit(calls: int, period: float):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            limiter = getattr(wrapper, '_limiter', None)
            if limiter is None:
                limiter = RateLimiter(calls, period)
                wrapper._limiter = limiter

            await limiter.acquire()
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self._lock = asyncio.Lock()

    async def consume(self, tokens: int = 1):
        async with self._lock:
            now = time.time()
            elapsed = now - self.last_update
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_update = now

            if self.tokens < tokens:
                wait_time = (tokens - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= tokens


def token_bucket(rate: float, capacity: int):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            bucket = getattr(wrapper, '_bucket', None)
            if bucket is None:
                bucket = TokenBucket(rate, capacity)
                wrapper._bucket = bucket

            await bucket.consume()
            return await func(*args, **kwargs)
        return wrapper
    return decorator