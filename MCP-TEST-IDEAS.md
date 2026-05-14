 - [!] Test automations/youtube_poller.py with malformed video ID format — handled gracefully: list comprehension filter at line 150 skips malformed IDs, no crash
 - [x] Test generate_features.py with conflicting feature names — scripts/generate_features.py has inline duplicate-key detection (warns to stderr); setup/features.py has duplicate-key detection via _detect_duplicate_keys(); duplicate-key test in test_setup/test_features.py- [ ] Test setup/cli.py with --version flag — should display version info
^- [!] Test cli missing req args — not found in MCP log
^- [!] Test setup/cli.py with credentials file that has expired tokens (stuck — blocked state, LLM timeout)
^- [!] Test automations/youtube_poller.py with malformed video ID format (stuck — blocked state, LLM timeout)
^- [!] Test generate_features.py with conflicting feature names (stuck — shard timeout)
