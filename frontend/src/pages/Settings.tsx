import React, { useEffect, useState } from 'react';
import { clubSettingsAPI } from '../api/client';
import { useNotification } from '../context/NotificationContext';

type RankingSystemType = 'int_range' | 'letter_range' | 'custom';

interface ClubSettings {
  id: number;
  ranking_system_type: RankingSystemType;
  int_range_start?: number;
  int_range_end?: number;
  letter_range_start?: string;
  letter_range_end?: string;
  custom_levels?: string[];
  created_at: string;
  updated_at: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [rankingType, setRankingType] = useState<RankingSystemType>('custom');
  const [intStart, setIntStart] = useState<number>(1);
  const [intEnd, setIntEnd] = useState<number>(10);
  const [letterStart, setLetterStart] = useState<string>('A');
  const [letterEnd, setLetterEnd] = useState<string>('F');
  const [customLevels, setCustomLevels] = useState<string>('Beginner,Intermediate,Advanced');
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await clubSettingsAPI.getSettings();
      const data = response.data;
      setSettings(data);
      setRankingType(data.ranking_system_type);
      if (data.int_range_start) setIntStart(data.int_range_start);
      if (data.int_range_end) setIntEnd(data.int_range_end);
      if (data.letter_range_start) setLetterStart(data.letter_range_start);
      if (data.letter_range_end) setLetterEnd(data.letter_range_end);
      if (data.custom_levels) setCustomLevels(data.custom_levels.join(','));
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      showNotification('error', 'Failed to load club settings');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSystemDescription = () => {
    if (!settings) return 'Loading...';
    
    switch (settings.ranking_system_type) {
      case 'int_range':
        return `Integer Range: ${settings.int_range_start} - ${settings.int_range_end}`;
      case 'letter_range':
        return `Letter Range: ${settings.letter_range_start} - ${settings.letter_range_end}`;
      case 'custom':
        return `Custom Levels: ${settings.custom_levels?.join(', ') || 'None'}`;
      default:
        return 'Not configured';
    }
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        ranking_system_type: rankingType,
      };

      if (rankingType === 'int_range') {
        payload.int_range_start = intStart;
        payload.int_range_end = intEnd;
      } else if (rankingType === 'letter_range') {
        payload.letter_range_start = letterStart;
        payload.letter_range_end = letterEnd;
      } else if (rankingType === 'custom') {
        payload.custom_levels = customLevels.split(',').map(l => l.trim()).filter(l => l);
      }

      await clubSettingsAPI.updateSettings(payload);
      showNotification('success', 'Club settings saved successfully');
      setShowForm(false);
      loadSettings();
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save settings';
      showNotification('error', errorMessage);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Club Settings</h1>

      {!showForm ? (
        <div 
          onClick={() => setShowForm(true)}
          className="card max-w-2xl cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 hover:border-blue-400"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold">Player Division System</h2>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                  ✓ Currently Active
                </span>
              </div>
              <p className="text-gray-600">{getCurrentSystemDescription()}</p>
            </div>
            <div className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        <div className="card max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Configure Division System</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
        
          <div className="space-y-4">
            {/* Ranking Type Selection */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Division System Type
            </label>
            <select
              value={rankingType}
              onChange={(e) => setRankingType(e.target.value as RankingSystemType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="int_range">Integer Range (e.g., 1-10)</option>
              <option value="letter_range">Letter Range (e.g., A-F)</option>
              <option value="custom">Custom Levels</option>
            </select>
          </div>

          {/* Integer Range Configuration */}
          {rankingType === 'int_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Level
                </label>
                <input
                  type="number"
                  value={intStart}
                  onChange={(e) => setIntStart(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Level
                </label>
                <input
                  type="number"
                  value={intEnd}
                  onChange={(e) => setIntEnd(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Letter Range Configuration */}
          {rankingType === 'letter_range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Letter
                </label>
                <input
                  type="text"
                  maxLength={1}
                  value={letterStart}
                  onChange={(e) => setLetterStart(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Letter
                </label>
                <input
                  type="text"
                  maxLength={1}
                  value={letterEnd}
                  onChange={(e) => setLetterEnd(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Custom Levels Configuration */}
          {rankingType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Levels (comma-separated)
              </label>
              <input
                type="text"
                value={customLevels}
                onChange={(e) => setCustomLevels(e.target.value)}
                placeholder="e.g., Beginner, Intermediate, Advanced"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Enter levels separated by commas. Example: Beginner, Intermediate, Advanced, Expert
              </p>
            </div>
          )}

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview of Levels:</p>
            <div className="flex flex-wrap gap-2">
              {rankingType === 'int_range' && 
                Array.from({ length: intEnd - intStart + 1 }, (_, i) => intStart + i).map(level => (
                  <span key={level} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {level}
                  </span>
                ))
              }
              {rankingType === 'letter_range' && 
                Array.from(
                  { length: letterEnd.charCodeAt(0) - letterStart.charCodeAt(0) + 1 }, 
                  (_, i) => String.fromCharCode(letterStart.charCodeAt(0) + i)
                ).map(level => (
                  <span key={level} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {level}
                  </span>
                ))
              }
              {rankingType === 'custom' && 
                customLevels.split(',').map(l => l.trim()).filter(l => l).map(level => (
                  <span key={level} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {level}
                  </span>
                ))
              }
            </div>
          </div>

          <button onClick={handleSave} className="btn btn-primary w-full">
            Save Settings
          </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
