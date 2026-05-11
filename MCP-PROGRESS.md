# MCP Progress — linkedin-post source files (correct scope)
# Format: - [ ] pending | - [>] in-progress | - [x] done
# Scope: ~22 Python files we wrote (no deps/generated/node_modules)
# Quality: [x] = non-smoke test with real assertions exists

^- [x] automations/youtube_poller.py  <!-- done 555f186 2026-05-11 -->
^- [x] scripts/generate_features.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup.py  <!-- done cf46098 2026-05-11 -->
^- [x] setup/cli.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/cloudflare.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/constants.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/features.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/github.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/google_resources.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/python_requirements.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/utils.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/verification.py  <!-- done 968cdfc 2026-05-11 -->
- [x] setup/wizard/server.py  <!-- done dfd7534 2026-05-11 -->
- [x] setup/wizard/state.py  <!-- real tests verified -->
^- [x] setup/wizard/steps/apikeys.py  <!-- done 968cdfc 2026-05-11 -->
- [ ] setup/wizard/steps/cloudflare.py
- [ ] setup/wizard/steps/deploy.py
- [x] setup/wizard/steps/google.py  <!-- real tests verified -->
- [ ] setup/wizard/steps/mode.py
- [ ] setup/wizard/steps/prereqs.py
^- [x] setup/wizard/steps/verify.py  <!-- done 968cdfc 2026-05-11 -->
^- [x] setup/worker_config.py  <!-- done 968cdfc 2026-05-11 -->

# 2 done, 20 pending, 22 total
