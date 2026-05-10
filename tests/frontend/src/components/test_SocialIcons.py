"""Tests for frontend/src/components/SocialIcons.tsx module."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[4]))


class TestSocialIcons:
    def test_file_exports_youtube_icon(self):
        icons_path = Path(__file__).resolve().parents[4] / 'frontend/src/components/SocialIcons.tsx'
        content = icons_path.read_text()
        assert 'YouTubeIcon' in content
        assert 'InstagramIcon' in content
        assert 'LinkedInIcon' in content
        assert 'svg' in content
        assert 'viewBox' in content

    def test_icon_functions_have_classname_prop(self):
        icons_path = Path(__file__).resolve().parents[4] / 'frontend/src/components/SocialIcons.tsx'
        content = icons_path.read_text()
        assert 'IconProps' in content
        assert 'className' in content
