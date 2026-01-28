import asyncio
import random
from typing import Callable, Type, Tuple, TypeVar
from functools import wraps


T = TypeVar('T')


class RetryError(Exception):
    pass


async def retry_with_backoff(
    func: Callable,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    exponential_base: float = 2,
    jitter: bool = True,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
) -> T:
    last_exception = None

    for attempt in range(max_attempts):
        try:
            return await func()
        except exceptions as e:
            last_exception = e
            
            if attempt == max_attempts - 1:
                break

            delay = min(base_delay * (exponential_base ** attempt), max_delay)
            if jitter:
                delay *= (0.5 + random.random() * 0.5)

            print(f"[RETRY] Attempt {attempt + 1}/{max_attempts} failed: {str(e)}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)

    raise RetryError(f"All {max_attempts} attempts failed") from last_exception


def retry_async(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    exponential_base: float = 2,
    jitter: bool = True,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            async def attempt():
                return await func(*args, **kwargs)
            
            return await retry_with_backoff(
                attempt,
                max_attempts=max_attempts,
                base_delay=base_delay,
                max_delay=max_delay,
                exponential_base=exponential_base,
                jitter=jitter,
                exceptions=exceptions,
            )
        return wrapper
    return decorator


def retry_sync(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
    exponential_base: float = 2,
    jitter: bool = True,
    exceptions: Tuple[Type[Exception], ...] = (Exception,),
):
    def decorator(func: Callable):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            last_exception = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_attempts - 1:
                        break

                    delay = min(base_delay * (exponential_base ** attempt), max_delay)
                    if jitter:
                        delay *= (0.5 + random.random() * 0.5)

                    print(f"[RETRY] Attempt {attempt + 1}/{max_attempts} failed: {str(e)}. Retrying in {delay:.2f}s...")
                    time.sleep(delay)

            raise RetryError(f"All {max_attempts} attempts failed") from last_exception
        return wrapper
    return decorator