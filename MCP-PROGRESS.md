# MCP Progress — linkedin-post source files (correct scope)
# Format: - [ ] pending | - [>] in-progress | - [x] done
# Scope: ~22 Python files we wrote (no deps/generated/node_modules)
# Quality: [x] = non-smoke test with real assertions exists

^- [x] automations/youtube_poller.py  <!-- done 555f186 2026-05-11 -->
- [ ] scripts/generate_features.py
- [ ] setup.py
- [ ] setup/cli.py
- [ ] setup/cloudflare.py
- [ ] setup/constants.py
- [ ] setup/features.py
- [ ] setup/github.py
- [ ] setup/google_resources.py
- [ ] setup/python_requirements.py
- [ ] setup/utils.py
- [ ] setup/verification.py
- [ ] setup/wizard/server.py
- [x] setup/wizard/state.py  <!-- real tests verified -->
- [ ] setup/wizard/steps/apikeys.py
- [ ] setup/wizard/steps/cloudflare.py
- [ ] setup/wizard/steps/deploy.py
- [x] setup/wizard/steps/google.py  <!-- real tests verified -->
- [ ] setup/wizard/steps/mode.py
- [ ] setup/wizard/steps/prereqs.py
- [ ] setup/wizard/steps/verify.py
- [ ] setup/worker_config.py

# 2 done, 20 pending, 22 total
