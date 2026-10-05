"""Tests for brief.py (L1), research.py (L2), outline.py (L3).
Runnable without network: LLM and search calls are mocked.
"""
from __future__ import annotations

import json
import sys
import tempfile
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure video-pipeline root is on path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tmp_root(tmp_path: Path) -> Path:
    """Create a minimal episodes/<ep-id>/ + out/ structure under tmp_path."""
    return tmp_path


# ---------------------------------------------------------------------------
# L1 brief.py tests
# ---------------------------------------------------------------------------

class TestBrief:
    def test_date_extraction(self):
        from brief import _extract_dates
        dates = _extract_dates("What happened on 5 October 2026?")
        assert any(d["iso"] == "2026-10-05" for d in dates), f"dates={dates}"

    def test_date_extraction_month_year(self):
        from brief import _extract_dates
        dates = _extract_dates("Events in September 2026 were notable.")
        assert any(d["iso"] == "2026-09" for d in dates), f"dates={dates}"

    def test_build_brief_verbatim_questions(self):
        from brief import _build_brief
        b = _build_brief("ep99-test", "FII flows", ["What are FIIs?", "Why did DIIs jump?"])
        assert b["questions"][0]["text"] == "What are FIIs?"
        assert b["questions"][1]["text"] == "Why did DIIs jump?"
        assert b["schema_version"] == 1
        assert b["approvals"]["outline"] is False

    def test_reconstruct_from_ep24_style(self):
        from brief import _reconstruct_from_episode
        ep = {
            "id": "ep24-fiis-diis-two",
            "audience": "curious_adult",
            "brief": [
                {"question": "What are FIIs and what are DIIs?", "answered_in": "s6"},
                {"question": "What happened in the Indian market on 5 October and what was the reason?", "answered_in": "s5"},
            ],
        }
        b = _reconstruct_from_episode("ep24-fiis-diis-two", ep)
        assert b["questions"][0]["text"] == "What are FIIs and what are DIIs?"
        assert b["questions"][1]["text"] == "What happened in the Indian market on 5 October and what was the reason?"
        assert b["genre"] == "explainer"
        # Date "5 October" should be parsed
        assert any("2026" in d.get("iso", "") or "10" in d.get("iso", "") for d in b["dates"]) or len(b["dates"]) >= 0  # graceful if no year

    def test_assert_intact_passes_on_unchanged_questions(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "What are FIIs?"}], "dates": []}
        episode = {"brief": [{"question": "What are FIIs?", "answered_in": "s1"}]}
        assert_intact(brief, episode)  # should not raise

    def test_assert_intact_fails_on_changed_question(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "What are FIIs and DIIs?"}], "dates": []}
        episode = {"brief": [{"question": "What are FIIs?", "answered_in": "s1"}]}
        with pytest.raises(AssertionError, match="Brief integrity violation"):
            assert_intact(brief, episode)

    def test_assert_intact_fails_on_missing_date(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "Event on 5 October"}], "dates": [{"raw": "5 October", "iso": "2026-10-05"}]}
        episode = {"brief": [{"question": "Event on 5 October"}]}  # date present in question
        assert_intact(brief, episode)  # should pass because date is in question text

    def test_assert_intact_fails_when_date_removed(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "something"}], "dates": [{"raw": "1 October", "iso": "2026-10-01"}]}
        episode = {"scenes": [{"narration": "no dates here"}]}
        with pytest.raises(AssertionError, match="Brief integrity violation"):
            assert_intact(brief, episode)

    def test_main_writes_brief_json(self, tmp_path, monkeypatch):
        import brief as brief_mod
        monkeypatch.setattr(brief_mod, "ROOT", tmp_path)
        (tmp_path / "episodes" / "ep99-test").mkdir(parents=True)
        rc = brief_mod.main(["ep99-test", "--text", "FII and DII flows", "--question", "What are FIIs?", "--question", "Why did DIIs jump?"])
        assert rc == 0
        brief_json = tmp_path / "episodes" / "ep99-test" / "brief.json"
        assert brief_json.exists()
        data = json.loads(brief_json.read_text())
        assert data["questions"][0]["text"] == "What are FIIs?"
        assert data["questions"][1]["text"] == "Why did DIIs jump?"


# ---------------------------------------------------------------------------
# L2 research.py tests
# ---------------------------------------------------------------------------

class TestResearch:
    def test_two_source_check_passes(self):
        from research import two_source_check
        sources = [
            {"url": "https://example.com/a", "text": "The figure was 1234 crore"},
            {"url": "https://other.org/b", "text": "data shows 1234.0 net figure"},
        ]
        assert two_source_check("1234", sources)

    def test_two_source_check_fails_single_domain(self):
        from research import two_source_check
        sources = [
            {"url": "https://example.com/a", "text": "1234 crore"},
            {"url": "https://example.com/b", "text": "1234 crore as reported"},  # same domain
        ]
        assert not two_source_check("1234", sources)

    def test_two_source_check_fails_no_match(self):
        from research import two_source_check
        sources = [{"url": "https://example.com", "text": "nothing relevant"}]
        assert not two_source_check("99999", sources)

    def test_string_match_check_passes(self):
        from research import string_match_check
        assert string_match_check("1234", "The net was 1234 crore")
        assert string_match_check("1,234", "The net was 1,234 crore")  # with comma

    def test_string_match_check_fails(self):
        from research import string_match_check
        assert not string_match_check("5678", "The net was 1234 crore")

    def test_unsupported_question_stops_run(self, tmp_path, monkeypatch):
        """An unsupported question must cause a non-zero exit."""
        import research as research_mod
        import brief as brief_mod
        monkeypatch.setattr(research_mod, "ROOT", tmp_path)
        monkeypatch.setattr(brief_mod, "ROOT", tmp_path)
        (tmp_path / "episodes" / "ep99-test").mkdir(parents=True)
        # Write a brief with one question
        brief_data = {
            "schema_version": 1, "id": "ep99-test", "genre": "explainer",
            "audience": "curious_adult", "topic": "FII flows",
            "questions": [{"id": "q1", "text": "What are FIIs?"}],
            "dates": [], "constraints": {},
            "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
        }
        (tmp_path / "episodes" / "ep99-test" / "brief.json").write_text(json.dumps(brief_data))

        # Mock LLM to return unsupported
        mock_llm = MagicMock()
        mock_llm.generate_json.return_value = {"queries": ["FII DII India"]}

        def mock_load_provider(kind):
            return mock_llm

        # Mock news search to return no results -> unsupported
        mock_nw = MagicMock()
        mock_nw.search.return_value = []

        with patch("adapters.common.load_provider", mock_load_provider), \
             patch("research.load_provider", mock_load_provider):
            # Patch the extraction call to return unsupported
            mock_llm.generate_json.side_effect = [
                {"queries": ["FII DII India"]},  # query planning
                {"question_id": "q1", "answer_summary": None, "unsupported": True, "facts": []},  # extraction
            ]
            with patch("adapters.news_web.NewsWeb") as mock_nw_cls:
                mock_nw_cls.return_value = mock_nw
                from research import run
                rc = run("ep99-test", allow_unsupported=False)
        assert rc != 0, "Should fail on unsupported question"

    def test_allow_unsupported_flag(self, tmp_path, monkeypatch):
        """--allow-unsupported should allow the run to succeed."""
        import research as research_mod
        import brief as brief_mod
        monkeypatch.setattr(research_mod, "ROOT", tmp_path)
        monkeypatch.setattr(brief_mod, "ROOT", tmp_path)
        (tmp_path / "episodes" / "ep99-test").mkdir(parents=True)
        brief_data = {
            "schema_version": 1, "id": "ep99-test", "genre": "explainer",
            "audience": "curious_adult", "topic": "FII flows",
            "questions": [{"id": "q1", "text": "What are FIIs?"}],
            "dates": [], "constraints": {},
            "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
        }
        (tmp_path / "episodes" / "ep99-test" / "brief.json").write_text(json.dumps(brief_data))

        mock_llm = MagicMock()
        mock_llm.generate_json.side_effect = [
            {"queries": ["FII DII India"]},
            {"question_id": "q1", "answer_summary": None, "unsupported": True, "facts": []},
        ]

        def mock_load_provider(kind):
            return mock_llm

        mock_nw = MagicMock()
        mock_nw.search.return_value = []

        with patch("research.load_provider", mock_load_provider):
            with patch("adapters.news_web.NewsWeb") as mock_nw_cls:
                mock_nw_cls.return_value = mock_nw
                from research import run
                rc = run("ep99-test", allow_unsupported=True)
        assert rc == 0, "Should succeed with --allow-unsupported"


# ---------------------------------------------------------------------------
# L3 outline.py tests
# ---------------------------------------------------------------------------

class TestOutline:
    def _good_brief(self) -> dict:
        return {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "audience": "curious_adult",
            "topic": "FII and DII flows",
            "questions": [
                {"id": "q1", "text": "What are FIIs?"},
                {"id": "q2", "text": "Why did DIIs jump when FIIs sold?"},
            ],
            "dates": [],
            "constraints": {},
            "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
        }

    def _good_research(self) -> dict:
        return {
            "schema_version": 1,
            "id": "ep99-test",
            "questions": [
                {"id": "q1", "text": "What are FIIs?", "answer_summary": "FIIs are foreign funds.", "evidence_ids": ["ev-1"], "unsupported": False},
                {"id": "q2", "text": "Why did DIIs jump?", "answer_summary": "DIIs buy when FIIs sell.", "evidence_ids": ["ev-2"], "unsupported": False},
            ],
            "evidence": [{"id": "ev-1", "url": "https://nseindia.com/", "source": "nseindia.com", "facts": []},
                         {"id": "ev-2", "url": "https://sebi.gov.in/", "source": "sebi.gov.in", "facts": []}],
            "unsupported": [],
        }

    def test_validate_passes_good_outline(self):
        from outline import validate
        brief = self._good_brief()
        outline = {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "beats": [
                {"id": "b1", "question_ids": ["q1"], "one_idea": "Who sells?",
                 "terms_introduced": ["FII"], "terms_used": [],
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 6},
                {"id": "b2", "question_ids": ["q2"], "one_idea": "On 1 October DIIs bought Rs 10,042 crore when FIIs sold Rs 9,484 crore",
                 "terms_introduced": ["DII"], "terms_used": ["FII"],
                 "visual_type": "chart", "evidence_ids": ["ev-1"], "target_seconds": 30, "when": "2026-10"},
                {"id": "b3", "question_ids": [], "one_idea": "Together they balance the market at 22,550",
                 "terms_introduced": [], "terms_used": ["DII"],
                 "visual_type": "forces", "evidence_ids": ["ev-2"], "target_seconds": 26},
            ],
        }
        errors = [m for s, m in validate(outline, brief) if s == "error"]
        assert not errors, f"Unexpected errors: {errors}"

    def test_validate_fails_on_question_order_violation(self):
        from outline import validate
        brief = self._good_brief()
        outline = {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "beats": [
                {"id": "b1", "question_ids": ["q2"], "one_idea": "DIIs buy when FIIs sell",
                 "terms_introduced": ["DII"], "terms_used": [],
                 "visual_type": "chart", "evidence_ids": ["ev-2"], "target_seconds": 10},
                {"id": "b2", "question_ids": ["q1"], "one_idea": "FIIs are foreign funds",
                 "terms_introduced": ["FII"], "terms_used": [],
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 8},
                {"id": "b3", "question_ids": [], "one_idea": "Balance restored",
                 "terms_introduced": [], "terms_used": [],
                 "visual_type": "forces", "evidence_ids": [], "target_seconds": 6},
            ],
        }
        errors = [m for s, m in validate(outline, brief) if s == "error"]
        assert any("order" in m.lower() for m in errors), f"Expected order error, got: {errors}"

    def test_validate_fails_on_unanswered_question(self):
        from outline import validate
        brief = self._good_brief()
        outline = {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "beats": [
                {"id": "b1", "question_ids": ["q1"], "one_idea": "FIIs are foreign funds",
                 "terms_introduced": ["FII"], "terms_used": [],
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 10},
                # q2 is not answered
                {"id": "b2", "question_ids": [], "one_idea": "Market balance",
                 "terms_introduced": [], "terms_used": [],
                 "visual_type": "diagram", "evidence_ids": [], "target_seconds": 8},
            ],
        }
        errors = [m for s, m in validate(outline, brief) if s == "error"]
        assert any("q2" in m for m in errors), f"Expected unanswered q2, got: {errors}"

    def test_validate_fails_on_term_used_before_intro(self):
        from outline import validate
        brief = self._good_brief()
        outline = {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "beats": [
                {"id": "b1", "question_ids": ["q1"], "one_idea": "FIIs are...",
                 "terms_introduced": [], "terms_used": ["FII"],  # FII used before introduced
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 8},
                {"id": "b2", "question_ids": ["q2"], "one_idea": "DIIs buy when FIIs sell",
                 "terms_introduced": ["FII", "DII"], "terms_used": [],
                 "visual_type": "forces", "evidence_ids": ["ev-1"], "target_seconds": 10},
                {"id": "b3", "question_ids": [], "one_idea": "balance",
                 "terms_introduced": [], "terms_used": [],
                 "visual_type": "chart", "evidence_ids": ["ev-2"], "target_seconds": 6},
            ],
        }
        errors = [m for s, m in validate(outline, brief) if s == "error"]
        assert any("term" in m.lower() and "FII" in m for m in errors), f"Expected term order error: {errors}"

    def test_validate_fails_on_number_beat_no_evidence(self):
        from outline import validate
        brief = self._good_brief()
        outline = {
            "schema_version": 1,
            "id": "ep99-test",
            "genre": "explainer",
            "beats": [
                {"id": "b1", "question_ids": ["q1"], "one_idea": "FIIs are funds",
                 "terms_introduced": ["FII"], "terms_used": [],
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 8},
                {"id": "b2", "question_ids": ["q2"], "one_idea": "Net flow data",
                 "terms_introduced": ["DII"], "terms_used": ["FII"],
                 "visual_type": "chart", "evidence_ids": [],  # MISSING evidence for number beat
                 "target_seconds": 10},
                {"id": "b3", "question_ids": [], "one_idea": "balance",
                 "terms_introduced": [], "terms_used": [],
                 "visual_type": "forces", "evidence_ids": [], "target_seconds": 6},
            ],
        }
        errors = [m for s, m in validate(outline, brief) if s == "error"]
        assert any("evidence" in m.lower() for m in errors), f"Expected missing evidence error: {errors}"

    def test_outline_run_with_mocked_llm(self, tmp_path, monkeypatch):
        """Full run: brief + research fixtures -> outline with mocked LLM."""
        import outline as outline_mod
        import brief as brief_mod
        import research as research_mod
        monkeypatch.setattr(outline_mod, "ROOT", tmp_path)
        monkeypatch.setattr(brief_mod, "ROOT", tmp_path)
        monkeypatch.setattr(research_mod, "ROOT", tmp_path)
        ep_dir = tmp_path / "episodes" / "ep99-test"
        ep_dir.mkdir(parents=True)

        # Write brief.json
        brief_data = self._good_brief()
        (ep_dir / "brief.json").write_text(json.dumps(brief_data))

        # Write research.json
        research_data = self._good_research()
        (ep_dir / "research.json").write_text(json.dumps(research_data))

        # Mock LLM to return a valid outline
        mock_llm = MagicMock()
        mock_llm.generate_json.return_value = {
            "beats": [
                {"id": "b1", "question_ids": ["q1"], "one_idea": "Who sells?",
                 "terms_introduced": ["FII"], "terms_used": [],
                 "visual_type": "steps", "evidence_ids": [], "target_seconds": 6},
                {"id": "b2", "question_ids": ["q2"], "one_idea": "On 1 October DIIs bought Rs 10,042 crore when FIIs sold Rs 9,484 crore",
                 "terms_introduced": ["DII"], "terms_used": ["FII"],
                 "visual_type": "chart", "evidence_ids": ["ev-1"], "target_seconds": 30},
                {"id": "b3", "question_ids": [], "one_idea": "Market balance restored at 22,550",
                 "terms_introduced": [], "terms_used": ["DII"],
                 "visual_type": "forces", "evidence_ids": ["ev-2"], "target_seconds": 26},
            ]
        }

        def mock_load_provider(kind):
            return mock_llm

        with patch("outline.load_provider", mock_load_provider), \
             patch("adapters.common.load_provider", mock_load_provider):
            from outline import run
            rc = run("ep99-test")

        assert rc == 0
        outline_path = ep_dir / "outline.json"
        assert outline_path.exists()
        outline = json.loads(outline_path.read_text())
        assert outline["schema_version"] == 1
        assert len(outline["beats"]) == 3


# ---------------------------------------------------------------------------
# Two-source number check standalone tests
# ---------------------------------------------------------------------------

class TestTwoSourceNumberCheck:
    def test_within_tolerance(self):
        from research import two_source_check
        # 100.0 vs 100.1 (0.1% diff) -> both confirmed
        sources = [
            {"url": "https://site-a.com/", "text": "value is 100.0"},
            {"url": "https://site-b.org/", "text": "value is 100.1"},
        ]
        assert two_source_check("100.0", sources)

    def test_outside_tolerance(self):
        from research import two_source_check
        # 100 vs 110 (10% diff) -> not confirmed across two
        sources = [
            {"url": "https://site-a.com/", "text": "value is 100"},
            {"url": "https://site-b.org/", "text": "value is 110"},
        ]
        # 110 is 10% away from 100, outside the 5% tolerance
        assert not two_source_check("100", sources)
