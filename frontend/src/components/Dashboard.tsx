import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bot, Plus, RefreshCw, Send, Settings, Trash2 } from 'lucide-react';
import { type SheetRow, SheetsService } from '../services/sheets';
import { AVAILABLE_GOOGLE_MODELS, loadAvailableGoogleModels, type BotConfig, type GoogleModelOption } from '../services/configService';
import { VariantSelection } from './VariantSelection';

export function Dashboard({
  token,
  config,
  onSaveConfig,
  configSource = 'none',
}: {
  token: string,
  config: BotConfig,
  onSaveConfig: (config: BotConfig) => Promise<void>,
  configSource?: 'env' | 'drive' | 'none',
}) {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [sheetIdInput, setSheetIdInput] = useState(config.spreadsheetId);
  const [githubToken, setGithubToken] = useState<string>(config.githubToken);
  const [githubRepo, setGithubRepo] = useState<string>(config.githubRepo);
  const [googleModel, setGoogleModel] = useState<string>(config.googleModel);
  const [availableModels, setAvailableModels] = useState<GoogleModelOption[]>(AVAILABLE_GOOGLE_MODELS);
  // Show settings only if config is incomplete and not from environment variables
  const [showSettings, setShowSettings] = useState(
    configSource !== 'env' && (!config.spreadsheetId || !config.githubToken || !config.githubRepo)
  );
  const [selectedRowForReview, setSelectedRowForReview] = useState<SheetRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);

  const sheetsService = new SheetsService(token, config.spreadsheetId);

  useEffect(() => {
    loadAvailableGoogleModels().then(models => {
      setAvailableModels(models);
      if (!models.some(model => model.value === googleModel)) {
        setGoogleModel(models[0]?.value || config.googleModel);
      }
    });
  }, [config.googleModel]);

  const loadData = async () => {
    if (!config.spreadsheetId) return;
    setLoading(true);
    try {
      const data = await sheetsService.getRows();
      // Reverse array so newest is at the top
      setRows(data.reverse());
    } catch (error) {
      console.error(error);
      alert('Failed to load data. Please check your Spreadsheet ID and permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.trim() || !config.spreadsheetId) return;
    
    setLoading(true);
    try {
      await sheetsService.addTopic(newTopic);
      setNewTopic('');
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveVariant = async (selectedText: string, selectedImageId: string, postTime: string) => {
    if (!selectedRowForReview) return;
    
    try {
      await sheetsService.updateRowStatus(
        selectedRowForReview.rowIndex, 
        'Approved', 
        selectedText, 
        selectedImageId, 
        postTime
      );
      setSelectedRowForReview(null);
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Failed to approve variant.');
    }
  };

  const saveSettings = async () => {
    setSavingConfig(true);
    try {
      await onSaveConfig({ spreadsheetId: sheetIdInput, githubToken, githubRepo, googleModel });
      setShowSettings(false);
      if (sheetIdInput) {
        setTimeout(loadData, 100);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save configuration to Google Drive. Please try again.';
      alert(message);
    } finally {
      setSavingConfig(false);
    }
  };

  const triggerGithubAction = async (action: 'draft' | 'publish') => {
    if (!githubToken || !githubRepo) {
      alert('Please configure GitHub Settings first.');
      setShowSettings(true);
      return;
    }

    setActionLoading(action);
    try {
      // Expecting repo format: "owner/repo"
      const response = await axios.post(
        `https://api.github.com/repos/${githubRepo}/dispatches`,
        {
          event_type: action === 'draft' ? 'trigger-draft' : 'trigger-publish',
          client_payload: {
            google_model: googleModel,
          },
        },
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            Authorization: `token ${githubToken}`
          }
        }
      );
      
      if (response.status === 204) {
        const modelSuffix = action === 'draft' ? ` using ${googleModel}` : '';
        alert(`Successfully triggered the ${action} action${modelSuffix}. It may take a few minutes to complete.`);
      }
    } catch (error) {
      console.error(error);
      alert(`Failed to trigger GitHub Action. Make sure your token has repo scope and repository name is correct (owner/repo).`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTopic = async (row: SheetRow) => {
    const confirmed = window.confirm(`Delete "${row.topic}" from the content calendar?`);
    if (!confirmed) return;

    setDeletingRowIndex(row.rowIndex);
    try {
      await sheetsService.deleteRow(row.rowIndex);
      if (selectedRowForReview?.rowIndex === row.rowIndex) {
        setSelectedRowForReview(null);
      }
      await loadData();
    } catch (error) {
      console.error(error);
      alert('Failed to delete topic entry. Please try again.');
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

  if (showSettings) {
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
            <p className="text-xs text-gray-500 mb-3">Required to manually trigger generation and publishing scripts</p>
            
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
                <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Stored locally in your browser. Needs 'repo' scope.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {configSource === 'env' 
              ? 'Configuration loaded from environment variables.'
              : 'Settings are encrypted in your private Google Drive app data — never stored in this browser or your code.'
            }
          </p>
          <button
            onClick={saveSettings}
            disabled={savingConfig}
            className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 w-full mt-3 disabled:opacity-50"
          >
            {savingConfig ? 'Saving to Drive...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Content Pipeline</h2>
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
            disabled={actionLoading !== null}
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
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 font-medium"
          >
            {actionLoading === 'publish' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Approved
          </button>
          <div className="w-px bg-gray-300 mx-1"></div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={loadData}
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
                  No topics found. Add one to get started!
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.rowIndex} className="hover:bg-gray-50">
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
          onCancel={() => setSelectedRowForReview(null)}
        />
      )}
    </div>
  );
}