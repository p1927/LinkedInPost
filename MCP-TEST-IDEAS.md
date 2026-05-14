# MCP-TEST-IDEAS — linkedin-post bug hunt via shard MCP
# Format: - [ ] pending | - [>] assigned | - [~] hermes done | - [v] verified | - [x] done | - [!] bounced

## Seeded from source files
- [!] find and fix bugs in assert_density_check.py  <!-- shard CPU 100%, LLM coder missing cycle markers -->
- [x] find and fix bugs in automations/youtube_poller.py  <!-- 7872f89: fix committed -->
- [!] find and fix bugs in mutation_tester.py  <!-- Hermes corrupted, reverted -->
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
- [x] find and fix bugs in setup/wizard/steps/apikeys.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/cloudflare.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/deploy.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/google.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/mode.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/prereqs.py  <!-- no bugs -->
- [x] find and fix bugs in setup/wizard/steps/verify.py  <!-- no bugs -->
- [x] find and fix bugs in setup/worker_config.py  <!-- no bugs -->

## Creative ideas (child-2 will expand)
- [x] Test setup/cli.py with missing environment variables  <!-- fails gracefully with clear error + exit 1 -->
- [>] Test setup/cli.py with malformed Cloudflare credentials — validation should catch it
- [!] Test setup/github.py with revoked GitHub token — Hermes 503/LLM coder cycle markers
- [~] Test setup/google_resources.py with invalid GCP project ID format
- [ ] Test setup/features.py with conflicting feature flag names
- [ ] Test the YouTube poller with a video that has no transcripts available
- [ ] Test the YouTube poller with a private/unavailable video ID
- [ ] Test mutation_tester.py on a file with syntax errors — should handle gracefully
- [ ] Test mutation_tester.py on an empty source file
- [ ] Test generate_features.py with extremely long input text
- [ ] Test generate_features.py with special characters and Unicode
- [ ] Test setup/wizard/steps/google.py OAuth flow with expired refresh token
- [ ] Test setup/wizard/steps/cloudflare.py with zone read permission but not write
- [ ] Test wizard deploy step with Workers script size at the 1MB limit
- [ ] Test wizard verify step when no GitHub app is installed
- [ ] Concurrent test: run setup/cli.py twice simultaneously — should not corrupt state
- [ ] Test setup/worker_config.py when wrangler.toml is missing entirely
- [ ] End-to-end: fresh `python setup.py` with valid API keys end-to-end