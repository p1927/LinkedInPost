"""Unit tests for packaging.py (rules: direction/packaging.md). Run: python3 -m unittest discover -s tests"""
import copy
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import packaging  # noqa: E402

SRC = "https://www.nasa.gov/blogs/spacestation/"


def good_ep() -> dict:
    return {
        "id": "ep99-test", "audience": "curious_adult", "sources": [{"url": SRC}],
        "packaging": {
            "primary_keyword": "how spacecraft dock with the space station",
            "title": "How a spacecraft docks with the space station",
            "title_options": ["a", "b", "c"],
            "description": "How a spacecraft docks with the space station: it drops lower to catch up.\nSources: " + SRC,
            "instagram_caption": "How a spacecraft catches the space station: drop lower, not faster.",
            "pinned_comment": "Which machine should we take apart next? Source: " + SRC,
            "tags": ["space station"], "thumbnail": {"text": "DROP TO CATCH UP"},
        },
        "scenes": [
            {"id": "s1", "beat": "hook", "narration": "How does a spacecraft catch the space station?", "visual": {"type": "illustration"}},
            {"id": "s2", "beat": "payoff", "narration": "It drops lower, docks, and climbs back.", "visual": {"type": "illustration"}},
            {"id": "s3", "beat": "cta", "narration": "Send this to someone who thinks you fly straight at it.", "visual": {"type": "illustration"}},
        ],
    }


def ids(issues, rid):
    return [i for i in issues if i[1] == rid]


class BaitTests(unittest.TestCase):
    BAD = ["Comment YES if you knew this", "Tag a friend who needs this", "Like for part 2", "Share with 5 friends",
           "Follow for more space facts", "Smash that like button", "Stop scrolling! This is wild.",
           "Comment ORBIT and I'll DM you the link", "Like, save, share and follow!", "Subscribe for more."]
    GOOD = ["Send this to someone who thinks you fly straight at it.", "Tell me I'm wrong about the orbit.",
            "Next: why rockets launch east. Follow to see it.", "Save this for the next launch you watch.",
            "Subscribe and watch \"Why rockets launch east\" next.", "Which machine should we take apart next?"]

    def test_bad_lines_warn(self):
        for line in self.BAD:
            out = []
            packaging.bait_checks("x", line, out)
            self.assertTrue(ids(out, "packaging_bait"), f"not flagged: {line}")
            self.assertTrue(all(i[0] == "warn" for i in out))

    def test_good_lines_pass(self):
        for line in self.GOOD:
            out = []
            packaging.bait_checks("x", line, out)
            self.assertEqual(out, [], f"falsely flagged: {line}")

    def test_bait_in_narration_via_run(self):
        ep = good_ep()
        ep["scenes"][2]["narration"] = "Tag a friend who needs this!"
        self.assertTrue(ids(packaging.run(ep), "packaging_bait"))

    def test_rewrite_hint_present(self):
        out = []
        packaging.bait_checks("x", "Tag a friend", out)
        self.assertIn("Send this to the friend who", out[0][2])


class CtaTests(unittest.TestCase):
    def test_good_episode_clean(self):
        new = {"packaging_bait", "cta_content_type", "cta_recipient", "bridge_pointer", "pinned_comment", "keyword_surfaces"}
        self.assertEqual([i for i in packaging.run(good_ep()) if i[1] in new], [])

    def test_explainer_without_ask_warns(self):
        ep = good_ep()
        ep["scenes"][2]["narration"] = "That is how docking works."
        self.assertTrue(ids(packaging.run(ep), "cta_content_type"))

    def test_explainer_next_pointer_ok(self):
        ep = good_ep()
        ep["scenes"][2]["narration"] = "Next: why rockets launch east."
        self.assertFalse(ids(packaging.run(ep), "cta_content_type"))

    def test_kids_grownup_ok_and_recipient_exempt(self):
        ep = good_ep()
        ep["audience"] = "kids"
        ep["scenes"][2]["narration"] = "Ask a grown-up, then share this with a friend."
        out = packaging.run(ep)
        self.assertFalse(ids(out, "cta_content_type") + ids(out, "cta_recipient"))

    def test_share_without_recipient_warns(self):
        ep = good_ep()
        ep["scenes"][2]["narration"] = "Share this."
        self.assertTrue(ids(packaging.run(ep), "cta_recipient"))

    def test_opinion_needs_stance(self):
        ep = good_ep()
        ep["packaging"]["content_type"] = "opinion"
        self.assertTrue(ids(packaging.run(ep), "cta_content_type"))
        ep["scenes"][2]["narration"] = "Tell me I'm wrong about the drop."
        self.assertFalse(ids(packaging.run(ep), "cta_content_type"))

    def test_entertainment_no_cta(self):
        ep = good_ep()
        ep["packaging"]["content_type"] = "entertainment"
        self.assertTrue(ids(packaging.run(ep), "cta_content_type"))

    def test_unknown_content_type(self):
        ep = good_ep()
        ep["packaging"]["content_type"] = "listicle"
        self.assertTrue(ids(packaging.run(ep), "cta_content_type"))


class BridgeAndPinnedTests(unittest.TestCase):
    def test_longform_promise_without_destination(self):
        ep = good_ep()
        ep["scenes"][2]["narration"] = "The full breakdown is on my channel. Send this to someone who flies."
        self.assertTrue(ids(packaging.run(ep), "bridge_pointer"))

    def test_longform_vague_extra(self):
        ep = good_ep()
        ep["packaging"]["long_form"] = {"title": "Every burn of Crew-13", "url": "https://youtu.be/x", "extra": "longer version"}
        ep["packaging"]["pinned_comment"] = "Full burn-by-burn video: https://youtu.be/x Which part surprised you?"
        msgs = [i[2] for i in ids(packaging.run(ep), "bridge_pointer")]
        self.assertTrue(any("concrete" in m for m in msgs))

    def test_longform_good(self):
        ep = good_ep()
        ep["packaging"]["long_form"] = {"title": "Every burn of Crew-13", "url": "https://youtu.be/x", "extra": "the burn-by-burn timeline with NASA's numbers"}
        ep["packaging"]["pinned_comment"] = "Burn-by-burn timeline: https://youtu.be/x Which burn surprised you?"
        self.assertFalse(ids(packaging.run(ep), "bridge_pointer"))

    def test_pinned_without_link(self):
        ep = good_ep()
        ep["packaging"]["pinned_comment"] = "Which machine should we take apart next?"
        self.assertTrue(ids(packaging.run(ep), "pinned_comment"))

    def test_pinned_objection_killer_ok(self):
        ep = good_ep()
        ep["packaging"]["pinned_comment"] = "Yes, it really speeds up by dropping lower. Source: " + SRC
        self.assertFalse(ids(packaging.run(ep), "pinned_comment"))

    def test_pinned_dm_bait(self):
        ep = good_ep()
        ep["packaging"]["pinned_comment"] = "Comment ORBIT and I'll DM you the source? " + SRC
        self.assertTrue(ids(packaging.run(ep), "packaging_bait"))


class KeywordSurfaceTests(unittest.TestCase):
    def test_missing_from_voiceover(self):
        ep = good_ep()
        for s in ep["scenes"]:
            s["narration"] = "It drops lower and catches up."
        out = ids(packaging.run(ep), "keyword_surfaces")
        self.assertTrue(out and "voiceover" in out[0][2])

    def test_plural_matches(self):
        self.assertTrue(packaging._has_kw(["bond", "stocks"], "Bonds versus the stock market"))

    def test_on_screen_visual_text_counts(self):
        ep = copy.deepcopy(good_ep())
        ep["packaging"]["title"] = "Why you drop lower to catch up"
        ep["scenes"][0]["visual"] = {"type": "steps", "title": "Spacecraft meets space station", "steps": ["drop"]}
        self.assertFalse(ids(packaging.run(ep), "keyword_surfaces"))


if __name__ == "__main__":
    unittest.main()
