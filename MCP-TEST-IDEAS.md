# MCP-TEST-IDEAS — linkedin-post bug hunt via shard MCP
# Format: - [ ] pending | - [>] assigned | - [~] hermes done | - [v] verified | - [x] done | - [!] bounced
## Seeded from source files
- [x] find and fix bugs in automations/youtube_poller.py  <!-- 7872f89: fix committed -->
- [x] find and fix bugs in scripts/generate_features.py  <!-- verified: load_feature_map + emit_ts + update_wrangler_deployment_mode OK -->
- [x] find and fix bugs in setup.py  <!-- inverted if not args.skip_google: fix -->
- [x] find and fix bugs in setup/cli.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/cloudflare.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/constants.py  <!-- PIPELINE_TAB_HEADERS missing 'Delivery channel' and 'Generation model' -->
- [x] find and fix bugs in setup/features.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/github.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/google_resources.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/python_requirements.py  <!-- no bugs -->
- [x] find and fix bugs in setup/utils.py  <!-- no bugs -->
- [x] find and fix bugs in setup/verification.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/server.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/state.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/apikeys.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/cloudflare.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/deploy.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/google.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/mode.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/prereqs.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/wizard/steps/verify.py  <!-- no bugs found -->
- [x] find and fix bugs in setup/worker_config.py  <!-- no bugs -->
## Creative ideas (child-2 will expand)
- [x] Test setup/cli.py with missing environment variables  <!-- fails gracefully with clear error + exit 1 -->
- [x] Test setup/cli.py with malformed Cloudflare credentials — validation should catch it
- [x] Test setup/google_resources.py with invalid GCP project ID format
- [x] Test setup/features.py with conflicting feature flag names
- [x] Test the YouTube poller with a video that has no transcripts available — not a python poller issue (yt API handles this)
- [x] Test the YouTube poller with a private/unavailable video ID — yt_get returns {} on 403, graceful skip
- [x] Test mutation_tester.py on a file with syntax errors — exits 2 (no mutable lines), no crash
- [x] Test mutation_tester.py on an empty source file — exits 2 (no mutable lines), no crash
- [x] Test generate_features.py with extremely long input text  <!-- test added: test_handles_100kb_string_value in tests/scripts/test_generate_features.py -->
- [x] Test generate_features.py with special characters and Unicode  <!-- test added: TestEmitTsSpecialChars + unicode case in TestEmitTs -->
- [!] Test worker OAuth handlers (worker/src/index.ts:3900+ / 3927+) — Hermes down (LLM gateway 503)
- [!] Test cloudflare perms — Hermes timeout + CPU 100%
- [!] Test wizard deploy step with Workers script size at the 1MB limit — Hermes down
- [ ] Test wizard verify step when no GitHub app is installed
- [ ] Concurrent test: run setup/cli.py twice simultaneously — should not corrupt state
- [ ] Test setup/worker_config.py when wrangler.toml is missing entirely
- [ ] End-to-end: fresh `python setup.py` with valid API keys end-to-end
- [ ] Test automations/youtube_poller.py with an empty YouTube video ID
- [ ] Test automations/youtube_poller.py with a rate-limited YouTube API response
- [ ] Test setup/wizard/steps/deploy.py with missing Cloudflare credentials
- [ ] Test setup/wizard/steps/deploy.py with invalid deployment region
- [ ] Test setup/github.py with expired GitHub App token
- [ ] Test setup/github.py with repository not found error
- [ ] Test setup/google_resources.py with quota exceeded error
## Hermes task (assigned)
- [x] Test mutation_tester.py on a file with syntax errors — exits 2 with no mutable lines found
  <!-- Expected outcome: mutation_tester.py exits 1 or returns error, no crash, no partial output -->
  <!-- Cycle markers NOT required — return results directly with exit code -->