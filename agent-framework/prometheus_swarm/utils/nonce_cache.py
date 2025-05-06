import redis
import hashlib
import time
from typing import Optional, Union

class NonceCache:
    """
    A utility class for managing nonce (number used once) caching via Redis.
    Helps prevent replay attacks and ensures request uniqueness.
    """
    def __init__(
        self, 
        redis_host: str = 'localhost', 
        redis_port: int = 6379, 
        redis_db: int = 0, 
        expiration_time: int = 3600
    ):
        """
        Initialize Redis nonce cache.

        Args:
            redis_host (str): Redis server hostname. Defaults to 'localhost'.
            redis_port (int): Redis server port. Defaults to 6379.
            redis_db (int): Redis database number. Defaults to 0.
            expiration_time (int): Nonce expiration time in seconds. Defaults to 1 hour.
        """
        self.redis_client = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            db=redis_db
        )
        self.expiration_time = expiration_time

    def generate_nonce_key(self, payload: Union[str, dict, list]) -> str:
        """
        Generate a unique hash key for a given payload.

        Args:
            payload (Union[str, dict, list]): Input payload to generate nonce for.

        Returns:
            str: Hashed nonce key.
        """
        payload_str = str(payload)
        timestamp = str(int(time.time()))
        combined = f"{payload_str}:{timestamp}"
        return hashlib.sha256(combined.encode()).hexdigest()

    def store_nonce(self, nonce_key: str) -> bool:
        """
        Store a nonce in Redis with an expiration time.

        Args:
            nonce_key (str): Unique nonce key to store.

        Returns:
            bool: True if nonce was successfully stored, False otherwise.
        """
        try:
            result = self.redis_client.setex(
                name=nonce_key, 
                time=self.expiration_time, 
                value=1
            )
            return bool(result)
        except redis.exceptions.RedisError:
            return False

    def is_nonce_valid(self, nonce_key: str) -> bool:
        """
        Check if a nonce is valid (not previously used).

        Args:
            nonce_key (str): Nonce key to validate.

        Returns:
            bool: True if nonce is valid (not used), False otherwise.
        """
        try:
            # Atomically check and delete the nonce
            return bool(self.redis_client.delete(nonce_key))
        except redis.exceptions.RedisError:
            return False

    def process_request(self, payload: Union[str, dict, list]) -> Optional[str]:
        """
        Process a request by generating and validating a nonce.

        Args:
            payload (Union[str, dict, list]): Request payload to generate nonce for.

        Returns:
            Optional[str]: Generated nonce if successfully stored, None otherwise.
        """
        nonce_key = self.generate_nonce_key(payload)
        if self.store_nonce(nonce_key):
            return nonce_key
        return None