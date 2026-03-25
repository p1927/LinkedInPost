import { useEffect, useState } from 'react';
import { Bot, Plus, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import { BackendApi, isAuthErrorMessage, type AppSession } from '../services/backendApi';
import {
  AVAILABLE_GOOGLE_MODELS,
  loadAvailableGoogleModels,
  type BotConfig,
  type BotConfigUpdate,
  type GoogleModelOption,
} from '../services/configService';
import { type SheetRow } from '../services/sheets';
import { VariantSelection } from './VariantSelection';

export function Dashboard({
  idToken,
  session,
  api,
  onSaveConfig,
  onAuthExpired,
}: {
  idToken: string;
  session: AppSession;
  api: BackendApi;
  onSaveConfig: (config: BotConfigUpdate) => Promise<BotConfig>;
  onAuthExpired: () => void;
}) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState(session.config.spreadsheetId);
  const [githubRepo, setGithubRepo] = useState(session.config.githubRepo);
  const [githubTokenInput, setGithubTokenInput] = useState('');
  const [googleModel, setGoogleModel] = useState(session.config.googleModel);
  const [availableModels, setAvailableModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  const [showSettings, setShowSettings] = useState(
    session.isAdmin && (!session.config.spreadsheetId || !session.config.githubRepo || !session.config.hasGitHubToken)
  );
  const [selectedRowForReview, setSelectedRowForReview] = useState<SheetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);

  useEffect(() => {
    setSheetIdInput(session.config.spreadsheetId);
    setGithubRepo(session.config.githubRepo);
    setGoogleModel(session.config.googleModel);
    setShowSettings(
      session.isAdmin && (!session.config.spreadsheetId || !session.config.githubRepo || !session.config.hasGitHubToken)
    );
  }, [session.config.githubRepo, session.config.googleModel, session.config.hasGitHubToken, session.config.spreadsheetId, session.isAdmin]);

  useEffect(() => {
    loadAvailableGoogleModels().then((models) => {
      setAvailableModels(models);
      if (!models.some((model) => model.value === googleModel)) {
        setGoogleModel(models[0]?.value || session.config.googleModel);
      }
    });
  }, [googleModel, session.config.googleModel]);

  useEffect(() => {
    if (!session.config.spreadsheetId) {
      setRows([]);
      return;
    }

    void loadData(true);
  }, [idToken, session.config.spreadsheetId]);

  const handleFailure = (error: unknown, fallbackMessage: string) => {
    const message = error instanceof Error ? error.message : fallbackMessage;
    console.error(error);

    if (isAuthErrorMessage(message)) {
      onAuthExpired();
      return;
    }

    alert(message || fallbackMessage);
  };

  const loadData = async (quiet = false) => {
    if (!session.config.spreadsheetId) return;

    setLoading(true);
    try {
      const data = await api.getRows(idToken);
      setRows(data.reverse());
    } catch (error) {
      if (!quiet) {
        handleFailure(error, 'Failed to load data. Verify the backend deployment and spreadsheet configuration.');
      } else if (error instanceof Error && isAuthErrorMessage(error.message)) {
        onAuthExpired();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !session.config.spreadsheetId) return;
    
    setLoading(true);
    try {
      await api.addTopic(idToken, newTopic.trim());
      setNewTopic('');
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVariant = async (selectedText: string, selectedImageId: string, postTime: string) => {
    if (!selectedRowForReview) return;
    
    try {
      await api.updateRowStatus(
        idToken,
        selectedRowForReview,
        'Approved', 
        selectedText, 
        selectedImageId, 
        postTime
      );
      setSelectedRowForReview(null);
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to approve variant.');
    }
  };

  const dispatchGithubAction = async (
    action: 'draft' | 'publish' | 'refine',
    eventType: 'trigger-draft' | 'trigger-publish',
    payload: Record<string, unknown>,
    successMessage: string,
  ) => {
    if (!session.config.githubRepo || !session.config.hasGitHubToken) {
      if (session.isAdmin) {
        alert('Complete the GitHub settings first.');
        setShowSettings(true);
      } else {
        alert('A workspace admin still needs to configure GitHub dispatch settings.');
      }
      return;
    }

    setActionLoading(action);
    try {
      await api.triggerGithubAction(idToken, action, eventType, {
        google_model: googleModel,
        ...payload,
      });
      alert(successMessage);
    } catch (error) {
      handleFailure(error, 'Failed to trigger the GitHub Action.');
      throw error;
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefineVariant = async (baseText: string, instructions: string) => {
    if (!selectedRowForReview) return;

    await dispatchGithubAction(
      'refine',
      'trigger-draft',
      {
        draft_mode: 'refine',
        refine_topic: selectedRowForReview.topic,
        refine_date: selectedRowForReview.date,
        refine_base_text: baseText,
        refine_instructions: instructions,
      },
      `Requested 4 refined variants for "${selectedRowForReview.topic}" using ${googleModel}. Refresh the dashboard in a minute to review the updated drafts.`
    );

    setSelectedRowForReview(null);
  };

  const saveSettings = async () => {
    if (!session.isAdmin) return;

    setSavingConfig(true);
    try {
      await onSaveConfig({
        spreadsheetId: sheetIdInput.trim(),
        githubRepo: githubRepo.trim(),
        googleModel,
        githubToken: githubTokenInput.trim() || undefined,
      });
      setGithubTokenInput('');
      setShowSettings(false);
      if (sheetIdInput.trim()) {
        await loadData(true);
      }
    } catch (error) {
      handleFailure(error, 'Failed to save shared configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const triggerGithubAction = async (action: 'draft' | 'publish') => {
    const modelSuffix = action === 'draft' ? ` using ${googleModel}` : '';
    await dispatchGithubAction(
      action,
      action === 'draft' ? 'trigger-draft' : 'trigger-publish',
      {},
      `Successfully triggered the ${action} action${modelSuffix}. It may take a few minutes to complete.`
    );
  };

  const handleDeleteTopic = async (row: SheetRow) => {
    const confirmed = window.confirm(`Delete "${row.topic}" from the content calendar?`);
    if (!confirmed) return;

    setDeletingRowIndex(row.rowIndex);
    try {
      await api.deleteRow(idToken, row);
      if (selectedRowForReview?.rowIndex === row.rowIndex) {
        setSelectedRowForReview(null);
      }
      await loadData(true);
    } catch (error) {
      handleFailure(error, 'Failed to delete topic entry. Please try again.');
    } finally {
      setDeletingRowIndex(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'drafted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-purple-100 text-purple-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!session.config.spreadsheetId && !session.isAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-left max-w-xl mx-auto mt-8 p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-amber-900">Workspace setup pending</h2>
        <p className="mt-3 text-sm leading-6 text-amber-800">
          You are signed in as <strong>{session.email}</strong>, but an admin still needs to add the shared spreadsheet and GitHub dispatch settings in the backend.
        </p>
      </div>
    );
  }

  if (showSettings && session.isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-left max-w-xl mx-auto mt-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" /> Settings
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Spreadsheet ID</label>
            <input 
              type="text" 
              value={sheetIdInput}
              onChange={(e) => setSheetIdInput(e.target.value)}
              placeholder="e.g. 1BxiMVs0XRYFgwnV_v..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">Found in the URL of your Google Sheet</p>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-3">GitHub Actions Configuration</h3>
            <p className="text-xs text-gray-500 mb-3">These values live in the backend config store and are shared across all approved users.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Repository</label>
                <input 
                  type="text" 
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="e.g. username/repo-name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Model</label>
                <select
                  value={googleModel}
                  onChange={(e) => setGoogleModel(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                >
                  {availableModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Used for manual draft runs triggered from this dashboard.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Replace GitHub Personal Access Token</label>
                <input 
                  type="password" 
                  value={githubTokenInput}
                  onChange={(e) => setGithubTokenInput(e.target.value)}
                  placeholder={session.config.hasGitHubToken ? 'Leave blank to keep the current token' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {session.config.hasGitHubToken
                    ? 'A token is already stored. Enter a new one only when you want to rotate it.'
                    : 'Required once so the backend can dispatch the GitHub workflows.'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Secrets stay in the backend. The browser no longer talks to Google Sheets or GitHub directly.
          </p>
          <button
            onClick={saveSettings}
            disabled={savingConfig}
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full mt-3 disabled:opacity-50"
          >
            {savingConfig ? 'Saving shared configuration...' : 'Save Settings'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Content Pipeline</h2>
          <p className="mt-1 text-sm text-gray-500">Signed in as {session.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm">
            <Bot className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500">Model</span>
            <select
              value={googleModel}
              onChange={(e) => setGoogleModel(e.target.value)}
              className="bg-transparent font-medium text-gray-900 outline-none"
            >
              {availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <button 
            onClick={() => triggerGithubAction('draft')}
            disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-medium"
          >
            {actionLoading === 'draft' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            )}
            Generate Posts
          </button>
          <button 
            onClick={() => triggerGithubAction('publish')}
            disabled={actionLoading !== null || !session.config.githubRepo || !session.config.hasGitHubToken}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium"
          >
            {actionLoading === 'publish' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Approved
          </button>
          {session.isAdmin && (
            <>
              <div className="w-px bg-gray-300 mx-1"></div>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={() => void loadData(false)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <form onSubmit={handleAddTopic} className="flex gap-2">
        <input 
          type="text" 
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Add a new topic for research..."
          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-gray-900 bg-white"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !newTopic.trim()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Topic
        </button>
      </form>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No topics found. Add one to get started.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.sourceSheet}-${row.rowIndex}-${row.topic}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {row.topic}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(row.status)}`}>
                      {row.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-4">
                      {row.status?.toLowerCase() === 'drafted' && (
                        <button 
                          onClick={() => setSelectedRowForReview(row)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Review Variants
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTopic(row)}
                        disabled={deletingRowIndex === row.rowIndex}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingRowIndex === row.rowIndex ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRowForReview && (
        <VariantSelection 
          row={selectedRowForReview} 
          onApprove={handleApproveVariant}
          onRefine={handleRefineVariant}
          onCancel={() => setSelectedRowForReview(null)}
        />
      )}
    </div>
  );
}