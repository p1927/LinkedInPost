"""Integration tests for Slice 1 integrator work.
  - director.py --from-brief prompt assembly (mock LLM)
  - brief.assert_intact failure path
  - verify.gates_view merging
All tests run offline (no network, no LLM).
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure video-pipeline root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

BRIEF_JSON = {
    "schema_version": 1,
    "id": "ep99-test",
    "genre": "explainer",
    "audience": "curious_adult",
    "topic": "What are FIIs and DIIs?",
    "questions": [
        {"id": "q1", "text": "What are FIIs and what are DIIs?"},
        {"id": "q2", "text": "Why did DIIs jump in when FIIs sold?"},
    ],
    "dates": [],
    "constraints": {},
    "approvals": {"outline": False, "script": True, "preview": True, "publish": True},
}

RESEARCH_JSON = {
    "schema_version": 1,
    "id": "ep99-test",
    "questions": [
        {
            "id": "q1",
            "question_text": "What are FIIs and what are DIIs?",
            "sources": [
                {"url": "https://example.com/fii", "title": "FII explainer", "text": "FIIs are foreign institutional investors."},
                {"url": "https://example.com/dii", "title": "DII explainer", "text": "DIIs are domestic institutional investors."},
            ],
            "evidence_ids": ["ev-1", "ev-2"],
            "answer_summary": "FIIs are foreign, DIIs are domestic institutional investors.",
        },
        {
            "id": "q2",
            "question_text": "Why did DIIs jump in when FIIs sold?",
            "sources": [
                {"url": "https://example.com/market", "title": "Market crash", "text": "DIIs jumped in to provide liquidity."},
            ],
            "evidence_ids": ["ev-3"],
            "answer_summary": "DIIs provide stabilising liquidity during FII sell-offs.",
        },
    ],
    "evidence": [
        {"id": "ev-1", "url": "https://example.com/fii", "text": "FIIs are foreign institutional investors."},
        {"id": "ev-2", "url": "https://example.com/dii", "text": "DIIs are domestic institutional investors."},
        {"id": "ev-3", "url": "https://example.com/market", "text": "DIIs jumped in to provide liquidity."},
    ],
    "unsupported": [],
}

OUTLINE_JSON = {
    "schema_version": 1,
    "id": "ep99-test",
    "genre": "explainer",
    "beats": [
        {
            "id": "b1",
            "question_ids": ["q1"],
            "one_idea": "FIIs are foreign investors; DIIs are domestic ones",
            "terms_introduced": ["FII", "DII"],
            "terms_used": [],
            "visual_type": "compare",
            "evidence_ids": ["ev-1", "ev-2"],
            "target_seconds": 12,
        },
        {
            "id": "b2",
            "question_ids": ["q2"],
            "one_idea": "DIIs stepped in to stabilise when FIIs sold",
            "terms_introduced": [],
            "terms_used": ["FII", "DII"],
            "visual_type": "chart",
            "evidence_ids": ["ev-3"],
            "target_seconds": 10,
        },
    ],
}

MOCK_EPISODE = {
    "id": "ep99-test",
    "title": "What are FIIs and DIIs?",
    "audience": "curious_adult",
    "genre": "explainer",
    "schema_version": 1,
    "format_id": "news_explainer",
    "one_idea": "FIIs and DIIs are opposing market forces",
    "analogy": None,
    "mechanism": [],
    "concepts": [],
    "loops": [],
    "claims": [],
    "sources": [],
    "news_hook": None,
    "original_contribution": "Plain-language explainer of FII/DII dynamics",
    "packaging": {
        "title": "FII vs DII: who moves the market?",
        "description": "Explainer on FII and DII dynamics",
        "instagram_caption": "Why does Nifty crash then recover?",
    },
    "direction": {
        "mode": "explainer",
        "mode_reason": "from-brief",
        "skills_used": ["mode-selection"],
        "style_segments": [{"id": "seg1", "medium": "native", "scene_ids": ["b1", "b2"]}],
    },
    "continuity": {"characters": [], "locations": [], "props": [], "ledger": []},
    "style": {"illustration_style": "flat editorial illustration", "palette": {"bg": "#FFFFFF", "ink": "#000000",
              "sunny": "#FFD700", "coral": "#FF6B6B", "sky": "#87CEEB", "mint": "#98FF98", "grape": "#9B59B6", "white": "#FFFFFF"}},
    "brief": [
        {"question": "What are FIIs and what are DIIs?", "answered_in": "b1"},
        {"question": "Why did DIIs jump in when FIIs sold?", "answered_in": "b2"},
    ],
    "scenes": [
        {
            "id": "b1",
            "beat": "hook",
            "narration": "What are FIIs and what are DIIs?",
            "visual": {"type": "compare", "colA": "FII (foreign)", "colB": "DII (domestic)", "rows": [], "winner": None},
            "shot": {"size": "ms"},
        },
        {
            "id": "b2",
            "beat": "cta",
            "narration": "Why did DIIs jump in when FIIs sold? DIIs stepped in to stabilise.",
            "visual": {"type": "chart", "kind": "bar", "series": [], "title": "FII vs DII flows"},
            "shot": {"size": "ms"},
        },
    ],
}


# ---------------------------------------------------------------------------
# Helper: write episode files to a tmp dir patching ROOT
# ---------------------------------------------------------------------------

def _write_fixtures(tmp_path: Path) -> Path:
    ep_dir = tmp_path / "episodes" / "ep99-test"
    ep_dir.mkdir(parents=True)
    (ep_dir / "brief.json").write_text(json.dumps(BRIEF_JSON))
    (ep_dir / "research.json").write_text(json.dumps(RESEARCH_JSON))
    (ep_dir / "outline.json").write_text(json.dumps(OUTLINE_JSON))
    (tmp_path / "out" / "ep99-test").mkdir(parents=True)
    return tmp_path


# ---------------------------------------------------------------------------
# Test: outline contract block contains one entry per beat
# ---------------------------------------------------------------------------

class TestOutlineContractBlock:
    def test_one_entry_per_beat(self):
        from director import _outline_contract_block
        items = [
            {"url": "https://example.com/fii", "title": "FII", "source": "example.com", "text": "FII text", "summary": "", "published": ""},
            {"url": "https://example.com/dii", "title": "DII", "source": "example.com", "text": "DII text", "summary": "", "published": ""},
            {"url": "https://example.com/market", "title": "Market", "source": "example.com", "text": "market text", "summary": "", "published": ""},
        ]
        block = _outline_contract_block(OUTLINE_JSON, RESEARCH_JSON, items)
        assert "b1" in block, "beat b1 missing from contract"
        assert "b2" in block, "beat b2 missing from contract"
        assert "compare" in block, "visual_type=compare missing"
        assert "chart" in block, "visual_type=chart missing"
        # One entry per beat
        beat_count = block.count("beat b")
        assert beat_count == len(OUTLINE_JSON["beats"]), f"expected {len(OUTLINE_JSON['beats'])} beats, got {beat_count}"

    def test_evidence_mapped_to_source_ids(self):
        from director import _outline_contract_block
        items = [
            {"url": "https://example.com/fii", "title": "FII", "source": "example.com", "text": "", "summary": "", "published": ""},
        ]
        block = _outline_contract_block(OUTLINE_JSON, RESEARCH_JSON, items)
        # S1 should map to the first URL
        assert "S1" in block, "source id S1 should appear in contract for ev-1"


# ---------------------------------------------------------------------------
# Test: brief questions are verbatim in write_episode prompt
# ---------------------------------------------------------------------------

class TestFromBriefPromptAssembly:
    """The LLM is mocked; we inspect the prompt sent to it."""

    def test_questions_verbatim_in_prompt(self, tmp_path):
        """write_episode must pass the question texts verbatim via brief_block."""
        from director import brief_block

        q_texts = [q["text"] for q in BRIEF_JSON["questions"]]
        block = brief_block(q_texts)
        for q in q_texts:
            assert q in block, f"Question {q!r} missing from brief_block output"

    def test_brief_block_sets_answered_in_instruction(self):
        from director import brief_block
        block = brief_block(["What are FIIs?"])
        assert "answered_in" in block
        assert "What are FIIs?" in block

    def test_contract_block_injected_into_prompt(self, tmp_path):
        """write_episode prompt must contain the outline contract text when contract_block is passed."""
        import director

        # Build minimal items and mocked LLM
        items = [
            {"url": "https://example.com/fii", "title": "FII", "source": "x.com", "text": "", "summary": "", "published": ""},
        ]

        captured_prompt = {}
        def fake_call(llm, label, prompt, system=None, expect_out=6000):
            captured_prompt["prompt"] = prompt
            return MOCK_EPISODE.copy()

        budget_mock = MagicMock()
        budget_mock.call.side_effect = fake_call

        contract = director._outline_contract_block(OUTLINE_JSON, RESEARCH_JSON, items)
        assert contract  # non-empty

        # Patch system_prompt, source_ids, sources_block so they return cheap stubs
        with patch.object(director, "system_prompt", return_value="SYSTEM"), \
             patch.object(director, "source_ids", return_value={"S1": "https://example.com/fii"}), \
             patch.object(director, "sources_block", return_value="S1: FII"), \
             patch.object(director, "from_ids", return_value=(MOCK_EPISODE.copy(), [])), \
             patch("registry.read", return_value={}), \
             patch("registry.episodes", return_value=[]):
            director.write_episode(
                MagicMock(), {"headline": "test", "angle": "", "why_now": "", "audience_misconception": "", "source_urls": []},
                items, {"audience": "curious_adult", "card": {"length_sec": [30, 60], "pace_wps": 2.5, "sentence_words_max": 18},
                        "formats": ["news_explainer"], "domains": ["finance"], "mode": "explainer"},
                "ep99-test", [], budget_mock,
                brief=["What are FIIs?"],
                contract_block=contract,
            )

        prompt = captured_prompt.get("prompt", "")
        assert "OUTLINE CONTRACT" in prompt, "outline contract not injected into prompt"
        assert "b1" in prompt, "beat b1 not in prompt"
        assert "What are FIIs?" in prompt, "question text not verbatim in prompt"


# ---------------------------------------------------------------------------
# Test: assert_intact failure path
# ---------------------------------------------------------------------------

class TestAssertIntact:
    def test_fails_when_question_altered(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "What are FIIs and what are DIIs?"}], "dates": []}
        # Episode with a modified question
        episode = {"brief": [{"question": "What is FII?", "answered_in": "b1"}]}
        with pytest.raises(AssertionError, match="Brief integrity violation"):
            assert_intact(brief, episode)

    def test_passes_when_question_verbatim(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "What are FIIs and what are DIIs?"}], "dates": []}
        episode = {"brief": [{"question": "What are FIIs and what are DIIs?", "answered_in": "b1"}]}
        assert_intact(brief, episode)  # must not raise

    def test_fails_when_date_dropped(self):
        from brief import assert_intact
        brief = {"questions": [{"id": "q1", "text": "What happened?"}], "dates": [{"raw": "5 October 2026", "iso": "2026-10-05"}]}
        episode = {"brief": [{"question": "What happened?", "answered_in": "b1"}], "scenes": []}
        with pytest.raises(AssertionError, match="Brief integrity violation"):
            assert_intact(brief, episode)


# ---------------------------------------------------------------------------
# Test: _fill_answered_in maps beat question_ids to scene ids
# ---------------------------------------------------------------------------

class TestFillAnsweredIn:
    def test_fills_from_outline_when_beat_id_matches_scene_id(self):
        from director import _fill_answered_in

        ep = {
            "scenes": [{"id": "b1"}, {"id": "b2"}],
            "brief": [
                {"question": "What are FIIs and what are DIIs?", "answered_in": ""},
                {"question": "Why did DIIs jump in when FIIs sold?", "answered_in": ""},
            ],
        }
        result = _fill_answered_in(ep, BRIEF_JSON, OUTLINE_JSON)
        assert result["brief"][0]["answered_in"] == "b1"
        assert result["brief"][1]["answered_in"] == "b2"

    def test_keeps_existing_answered_in_when_valid(self):
        from director import _fill_answered_in

        ep = {
            "scenes": [{"id": "s1"}, {"id": "s2"}],
            "brief": [
                {"question": "What are FIIs and what are DIIs?", "answered_in": "s1"},
                {"question": "Why did DIIs jump in when FIIs sold?", "answered_in": "s2"},
            ],
        }
        result = _fill_answered_in(ep, BRIEF_JSON, OUTLINE_JSON)
        # Existing valid scene IDs are kept
        assert result["brief"][0]["answered_in"] == "s1"
        assert result["brief"][1]["answered_in"] == "s2"


# ---------------------------------------------------------------------------
# Test: gates_view merging
# ---------------------------------------------------------------------------

class TestGatesView:
    def test_blocked_on_non_advisory_error(self, tmp_path):
        import gate_report
        ep_id = "ep99-test-gates"
        gr_path = tmp_path / "out" / ep_id / "gate_report.json"
        gr_path.parent.mkdir(parents=True)

        gate_report.write(gr_path, [
            {"layer": "F1", "rule": "flash_wcag231", "severity": "error", "evidence": "5 flash pairs/s",
             "root_cause": "fast flash", "fix_hint": "remove flash", "advisory": False, "waived": False},
        ])

        import verify
        with patch.object(verify, "ROOT", tmp_path):
            approved, report = verify.gates_view(ep_id)

        assert not approved, "should be blocked by non-advisory error"
        assert "ERROR" in report
        assert "flash_wcag231" in report

    def test_clear_when_only_advisory_errors(self, tmp_path):
        import gate_report
        ep_id = "ep99-test-gates2"
        gr_path = tmp_path / "out" / ep_id / "gate_report.json"
        gr_path.parent.mkdir(parents=True)

        gate_report.write(gr_path, [
            {"layer": "F1", "rule": "pixel_clipping", "severity": "error", "evidence": "14 frames",
             "root_cause": "bright bg", "fix_hint": "none", "advisory": True, "waived": False},
        ])

        import verify
        with patch.object(verify, "ROOT", tmp_path):
            approved, report = verify.gates_view(ep_id)

        assert approved, "advisory error should not block"
        assert "warn" in report.lower() or "advisory" in report

    def test_caps_warnings_at_8_plus_count(self, tmp_path):
        import gate_report
        ep_id = "ep99-test-gates3"
        gr_path = tmp_path / "out" / ep_id / "gate_report.json"
        gr_path.parent.mkdir(parents=True)

        entries = [
            {"layer": "F1", "rule": f"warn_{i}", "severity": "warn", "evidence": f"evidence {i}",
             "root_cause": "", "fix_hint": "", "advisory": True, "waived": False}
            for i in range(12)
        ]
        gate_report.write(gr_path, entries)

        import verify
        with patch.object(verify, "ROOT", tmp_path):
            approved, report = verify.gates_view(ep_id)

        assert approved
        assert "and 4 more" in report, f"expected '4 more' count in: {report}"

    def test_merges_gate_and_lint_errors(self, tmp_path):
        """Errors from gate_report + lint appear in the same view."""
        import gate_report
        ep_id = "ep99-test-merge"
        gr_path = tmp_path / "out" / ep_id / "gate_report.json"
        gr_path.parent.mkdir(parents=True)

        gate_report.write(gr_path, [
            {"layer": "A1", "rule": "audio_lufs", "severity": "warn", "evidence": "-16 LUFS",
             "root_cause": "quiet", "fix_hint": "re-mix", "advisory": True, "waived": False},
        ])

        # Minimal episode that will generate at least one lint warning (no claims)
        ep_stub = {
            "id": ep_id, "audience": "curious_adult", "title": "test",
            "scenes": [
                {"id": "s1", "beat": "hook", "narration": "test.", "visual": {"type": "number", "value": "1", "unit": "x", "label": "y"}},
            ],
        }

        import verify
        import lint as _lint
        with patch.object(verify, "ROOT", tmp_path), \
             patch.object(_lint, "run", return_value=[("warn", "test_rule", "test message")]):
            approved, report = verify.gates_view(ep_id, ep_stub)

        assert "audio_lufs" in report
        assert "test_rule" in report
