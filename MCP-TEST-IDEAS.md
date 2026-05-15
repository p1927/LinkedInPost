# MCP-TEST-IDEAS — linkedin-post bug hunt via shard MCP
# Format: - [ ] pending | - [>] assigned | - [~] hermes done | - [v] verified | - [x] done | - [!] bounced

## Seeded from source files
- [x] find and fix bugs in automations/youtube_poller.py
- [x] find and fix bugs in scripts/generate_features.py
- [x] find and fix bugs in setup.py
- [x] find and fix bugs in setup/cli.py
- [x] find and fix bugs in setup/cloudflare.py
- [x] find and fix bugs in setup/constants.py
- [x] find and fix bugs in setup/features.py
- [x] find and fix bugs in setup/github.py
- [x] find and fix bugs in setup/google_resources.py
- [x] find and fix bugs in setup/python_requirements.py
- [x] find and fix bugs in setup/utils.py
- [x] find and fix bugs in setup/verification.py
- [x] find and fix bugs in setup/wizard/server.py
- [x] find and fix bugs in setup/wizard/state.py
- [x] find and fix bugs in setup/wizard/steps/apikeys.py
- [x] find and fix bugs in setup/wizard/steps/cloudflare.py
- [x] find and fix bugs in setup/wizard/steps/deploy.py
- [x] find and fix bugs in setup/wizard/steps/google.py
- [x] find and fix bugs in setup/wizard/steps/mode.py
- [x] find and fix bugs in setup/wizard/steps/prereqs.py
- [x] find and fix bugs in setup/wizard/steps/verify.py
- [x] find and fix bugs in setup/worker_config.py

## Integration test ideas
- [x] Test setup/cli.py with missing environment variables
- [x] Test setup/cli.py with malformed Cloudflare credentials
- [x] Test setup/google_resources.py with invalid GCP project ID format
- [x] Test setup/features.py with conflicting feature flag names
- [x] Test the YouTube poller with a video that has no transcripts available
- [x] Test the YouTube poller with a private/unavailable video ID
- [x] Test generate_features.py with extremely long input text
- [x] Test generate_features.py with special characters and Unicode
- [x] Test setup/cli.py with --help flag
- [x] Test setup/cli.py with invalid subcommand
- [x] Concurrent test: run setup/cli.py twice simultaneously
- [x] Test setup/worker_config.py when wrangler.toml is missing entirely
- [x] End-to-end: fresh python setup.py with valid API keys end-to-end
- [x] Test automations/youtube_poller.py with an empty YouTube video ID
- [x] Test automations/youtube_poller.py with a rate-limited YouTube API response
- [x] Test setup/wizard/steps/deploy.py with missing Cloudflare credentials
- [x] Test setup/wizard/steps/deploy.py with invalid deployment region
- [x] Test setup/github.py with expired GitHub App token
- [x] Test setup/github.py with repository not found error
- [x] Test setup/google_resources.py with quota exceeded error
- [x] Test mutation_tester.py on a file with syntax errors
- [x] Test mutation_tester.py on an empty source file
- [x] Test automations/youtube_poller.py with malformed video ID format (handled gracefully)
- [x] Test generate_features.py with conflicting feature names (inline duplicate detection works)
- [x] Test setup/cli.py with --version flag
- [x] Test setup/cli.py with valid subcommand but missing required args — exits 1 with clear error

## Bounced (infrastructure limits — shard LLM gateway timeouts)
- [!] Test setup/cli.py with credentials file that has expired tokens — infrastructure unavailable
- [!] Test setup/cli.py with empty argument — infrastructure issue
- [x] Test assert_density_check.py: correctly exits 1 for 1-assertion file (verified)
- [x] Test assert_density_check.py: correctly exits 1 for zero-assertion file (expected behavior)

## New ideas — worker/backend coverage
- [ ] Test worker auth middleware with malformed Authorization header
- [ ] Test worker D1 database queries with invalid SQL parameters
- [ ] Test worker/llm client with missing API credentials
- [ ] Test generation-worker image pipeline with empty variant text
- [ ] Test generation-worker image pipeline with very long variant text (>2000 chars)

## New ideas — frontend coverage  
- [ ] Test frontend App.tsx bootstrap with missing backend URL
- [ ] Test frontend services/backendApi.ts with network timeout
- [ ] Test frontend feature/feed with empty news feed response

## New ideas — packages coverage
- [ ] Test packages/llm-core provider config with missing model key
- [ ] Test packages/researcher search with rate-limited API response
