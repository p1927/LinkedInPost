"""Regression tests for github.py bug fixes."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


class TestSyncGithubSecretsRuntimeErrorNotSilentlySwallowed:
    """Test that RuntimeError from run_command is NOT silently swallowed."""

    def test_runtimeerror_is_raised_when_gh_secret_set_fails(self, tmp_path: Path) -> None:
        """When gh secret set fails with RuntimeError, the error must be propagated, not swallowed."""
        with patch("setup.github.ROOT", tmp_path):
            with patch("setup.github.WORKER_DEV_VARS", tmp_path / ".dev.vars"):
                (tmp_path / ".dev.vars").write_text("")

                # Patch locally-imported functions with create=True since they're imported inside the function
                with patch("setup.cloudflare.get_cloudflare_account_id", return_value="test-account-id", create=True):
                    with patch("setup.verification.verify_worker_endpoint", create=True):
                        from setup.worker_config import WorkerBootstrap
                        bootstrap = WorkerBootstrap(
                            allowed_emails="test@example.com",
                            admin_emails="admin@example.com",
                            google_client_id="test-client-id",
                            google_cloud_storage_bucket="",
                            delete_unused_generated_images="true",
                            cors_allowed_origins=["http://localhost:5173"],
                            encryption_key="test-key",
                            scheduler_secret="test-scheduler-secret",
                            generation_worker_secret="test-gen-secret",
                            github_repo="test/repo",
                            instagram_app_id="",
                            instagram_app_secret="",
                            linkedin_client_id="",
                            linkedin_client_secret="",
                            linkedin_person_urn="",
                            telegram_bot_token="",
                            meta_app_id="",
                            meta_app_secret="",
                            whatsapp_phone_number_id="",
                            gmail_client_id="",
                            gmail_client_secret="",
                            worker_url="",  # Empty to skip verify_worker_endpoint
                        )

                        # Simulate gh command failing with RuntimeError
                        with patch("setup.github.run_command", side_effect=RuntimeError("gh secret set failed")) as mock_run:
                            with pytest.raises(RuntimeError, match="Failed to sync GitHub secrets"):
                                from setup.github import sync_github_secrets
                                sync_github_secrets(bootstrap, None)
                            assert mock_run.call_count >= 1, "run_command should be called at least once before raising"

    def test_runtimeerror_for_single_secret_propagates_failure(self, tmp_path: Path) -> None:
        """When one secret fails, RuntimeError is raised listing the failed secret."""
        with patch("setup.github.ROOT", tmp_path):
            with patch("setup.github.WORKER_DEV_VARS", tmp_path / ".dev.vars"):
                (tmp_path / ".dev.vars").write_text("DEV_GOOGLE_AUTH_BYPASS_SECRET=test-bypass\nE2E_BYPASS_SECRET=test-e2e\n")

                with patch("setup.cloudflare.get_cloudflare_account_id", return_value="test-account-id", create=True):
                    with patch("setup.verification.verify_worker_endpoint", create=True):
                        from setup.worker_config import WorkerBootstrap
                        bootstrap = WorkerBootstrap(
                            allowed_emails="test@example.com",
                            admin_emails="admin@example.com",
                            google_client_id="test-client-id",
                            google_cloud_storage_bucket="",
                            delete_unused_generated_images="true",
                            cors_allowed_origins=["http://localhost:5173"],
                            encryption_key="test-key",
                            scheduler_secret="test-scheduler-secret",
                            generation_worker_secret="test-gen-secret",
                            github_repo="test/repo",
                            instagram_app_id="",
                            instagram_app_secret="",
                            linkedin_client_id="",
                            linkedin_client_secret="",
                            linkedin_person_urn="",
                            telegram_bot_token="",
                            meta_app_id="",
                            meta_app_secret="",
                            whatsapp_phone_number_id="",
                            gmail_client_id="",
                            gmail_client_secret="",
                            worker_url="",
                        )

                        # Make gh secret set fail only for VITE_GOOGLE_CLIENT_ID
                        def run_command_side_effect(cmd, cwd, capture_output):
                            if "VITE_GOOGLE_CLIENT_ID" in cmd:
                                raise RuntimeError("gh secret set failed")
                            return MagicMock()

                        with patch("setup.github.run_command", side_effect=run_command_side_effect) as mock_run:
                            with pytest.raises(RuntimeError, match="VITE_GOOGLE_CLIENT_ID"):
                                from setup.github import sync_github_secrets
                                sync_github_secrets(bootstrap, None)
                            assert mock_run.call_count >= 1

    def test_successful_sync_does_not_raise(self, tmp_path: Path) -> None:
        """When all secrets sync successfully, no RuntimeError is raised."""
        with patch("setup.github.ROOT", tmp_path):
            with patch("setup.github.WORKER_DEV_VARS", tmp_path / ".dev.vars"):
                (tmp_path / ".dev.vars").write_text("DEV_GOOGLE_AUTH_BYPASS_SECRET=test-bypass\nE2E_BYPASS_SECRET=test-e2e\n")

                with patch("setup.cloudflare.get_cloudflare_account_id", return_value="test-account-id", create=True):
                    with patch("setup.verification.verify_worker_endpoint", create=True):
                        from setup.worker_config import WorkerBootstrap
                        bootstrap = WorkerBootstrap(
                            allowed_emails="test@example.com",
                            admin_emails="admin@example.com",
                            google_client_id="test-client-id",
                            google_cloud_storage_bucket="",
                            delete_unused_generated_images="true",
                            cors_allowed_origins=["http://localhost:5173"],
                            encryption_key="test-key",
                            scheduler_secret="test-scheduler-secret",
                            generation_worker_secret="test-gen-secret",
                            github_repo="test/repo",
                            instagram_app_id="",
                            instagram_app_secret="",
                            linkedin_client_id="",
                            linkedin_client_secret="",
                            linkedin_person_urn="",
                            telegram_bot_token="",
                            meta_app_id="",
                            meta_app_secret="",
                            whatsapp_phone_number_id="",
                            gmail_client_id="",
                            gmail_client_secret="",
                            worker_url="",
                        )

                        with patch("setup.github.run_command", return_value=MagicMock()) as mock_run:
                            from setup.github import sync_github_secrets
                            # Should NOT raise
                            sync_github_secrets(bootstrap, None)
                            assert mock_run.call_count >= 1, "run_command should be called for each secret"
                            # Verify gh secret set was called (all secrets should be synced)
                            call_args_list = [str(args) for args, kwargs in mock_run.call_args_list]
                            assert any('gh' in c for c in call_args_list), "gh command should be in run_command calls"
