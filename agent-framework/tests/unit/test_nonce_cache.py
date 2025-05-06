import pytest
import time
from unittest.mock import MagicMock, patch
from prometheus_swarm.utils.nonce_cache import NonceCache

class TestNonceCache:
    @pytest.fixture
    def mock_redis(self):
        """Create a mock Redis client for testing."""
        with patch('redis.Redis') as mock_redis_client:
            mock_client = MagicMock()
            mock_redis_client.return_value = mock_client
            yield mock_client

    def test_nonce_generation(self, mock_redis):
        """Test that nonce generation creates a valid hash."""
        nonce_cache = NonceCache()
        payload = {"user_id": 123, "action": "login"}
        nonce_key = nonce_cache.generate_nonce_key(payload)
        
        assert isinstance(nonce_key, str)
        assert len(nonce_key) == 64  # SHA-256 hash
        assert nonce_key != nonce_cache.generate_nonce_key(payload)  # Different each time

    def test_store_nonce_success(self, mock_redis):
        """Test storing a nonce successfully."""
        mock_redis.setex.return_value = True
        nonce_cache = NonceCache()
        
        result = nonce_cache.store_nonce("test_nonce")
        
        assert result is True
        mock_redis.setex.assert_called_once()

    def test_store_nonce_failure(self, mock_redis):
        """Test storing a nonce when Redis fails."""
        mock_redis.setex.side_effect = Exception("Redis connection error")
        nonce_cache = NonceCache()
        
        result = nonce_cache.store_nonce("test_nonce")
        
        assert result is False

    def test_is_nonce_valid(self, mock_redis):
        """Test nonce validation."""
        mock_redis.delete.return_value = 1  # True deletion
        nonce_cache = NonceCache()
        
        result = nonce_cache.is_nonce_valid("valid_nonce")
        
        assert result is True
        mock_redis.delete.assert_called_once_with("valid_nonce")

    def test_is_nonce_invalid(self, mock_redis):
        """Test when nonce is invalid."""
        mock_redis.delete.return_value = 0  # False deletion
        nonce_cache = NonceCache()
        
        result = nonce_cache.is_nonce_valid("invalid_nonce")
        
        assert result is False

    def test_process_request(self, mock_redis):
        """Test complete request processing."""
        mock_redis.setex.return_value = True
        nonce_cache = NonceCache()
        payload = {"user_id": 456, "timestamp": time.time()}
        
        nonce_key = nonce_cache.process_request(payload)
        
        assert nonce_key is not None
        assert isinstance(nonce_key, str)
        assert len(nonce_key) == 64

    def test_process_request_failure(self, mock_redis):
        """Test request processing when storage fails."""
        mock_redis.setex.return_value = False
        nonce_cache = NonceCache()
        payload = {"user_id": 789, "timestamp": time.time()}
        
        nonce_key = nonce_cache.process_request(payload)
        
        assert nonce_key is None