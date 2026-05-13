# MCP-TEST-IDEAS — linkedin-post bug hunt via shard MCP
# Format: - [ ] pending | - [>] assigned | - [~] hermes done | - [v] verified | - [x] done | - [!] bounced

## Seeded from source files
- [!] find and fix bugs in assert_density_check.py  <!-- shard CPU 100%, LLM coder missing cycle markers -->
- [x] find and fix bugs in automations/youtube_poller.py  <!-- 7872f89: fix committed -->
- [!] find and fix bugs in mutation_tester.py  <!-- Hermes corrupted, reverted -->
- [>] find and fix bugs in scripts/generate_features.py
- [x] find and fix bugs in setup.py  <!-- inverted if not args.skip_google: fix -->
- [>] find and fix bugs in setup/cli.py
- [ ] find and fix bugs in setup/cloudflare.py
- [ ] find and fix bugs in setup/constants.py
- [ ] find and fix bugs in setup/features.py
- [ ] find and fix bugs in setup/github.py
- [ ] find and fix bugs in setup/google_resources.py
- [ ] find and fix bugs in setup/python_requirements.py
- [ ] find and fix bugs in setup/utils.py
- [ ] find and fix bugs in setup/verification.py
- [ ] find and fix bugs in setup/wizard/server.py
- [ ] find and fix bugs in setup/wizard/state.py
- [ ] find and fix bugs in setup/wizard/steps/apikeys.py
- [ ] find and fix bugs in setup/wizard/steps/cloudflare.py
- [ ] find and fix bugs in setup/wizard/steps/deploy.py
- [ ] find and fix bugs in setup/wizard/steps/google.py
- [ ] find and fix bugs in setup/wizard/steps/mode.py
- [ ] find and fix bugs in setup/wizard/steps/prereqs.py
- [ ] find and fix bugs in setup/wizard/steps/verify.py
- [ ] find and fix bugs in setup/worker_config.py

## Creative ideas (child-2 will expand)
- [ ] Test setup/cli.py with missing environment variables — setup should fail gracefully
- [ ] Test setup/cli.py with malformed Cloudflare credentials — validation should catch it
- [ ] Test setup/github.py with revoked GitHub token — should report auth error clearly
- [ ] Test setup/google_resources.py with invalid GCP project ID format
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