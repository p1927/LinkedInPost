import sys

# Pre-import setup modules before test collection
# This ensures setup.* is in sys.modules before pytest tries to import test files
sys.path.insert(0, '/home/openclaw/workspaces/linkedin-post')
import setup
import setup.cloudflare
import setup.constants
import setup.utils

def pytest_configure(config):
    # Ensure project root is in sys.path
    if sys.path[0] != '/home/openclaw/workspaces/linkedin-post':
        sys.path.insert(0, '/home/openclaw/workspaces/linkedin-post')