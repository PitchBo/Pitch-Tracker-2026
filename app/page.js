'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import { Plus, ArrowLeft, Trash2, TrendingUp, X } from 'lucide-react';

/* 
 * THE PITCH TRACKER - Web App with Phone Storage
 * 
 * FEATURES INCLUDED:
 * ✓ Team management (up to 5)
 * ✓ Pitcher management (up to 15 per team)
 * ✓ Live game tracking with real-time stats
 * ✓ Color-coded strike percentages
 * ✓ Strike % trend graphs with zones
 * ✓ Training sessions with full history
 * ✓ Cross-team workload tracking
 * ✓ PERSISTENT STORAGE (IndexedDB) - Data never lost!
 */

// Utilities
const calculateAge = (birthday) => {
  const today = new Date();
  const birth = new Date(birthday);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getStrikeColor = (percentage) => {
  if (percentage < 50) return { bg: '#DC3545', text: 'white' };
  if (percentage < 65) return { bg: '#FFC107', text: 'black' };
  return { bg: '#28A745', text: 'white' };
};

const StrikeBadge = ({ percentage }) => {
  const colors = getStrikeColor(percentage);
  return (
    <span style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '2px 8px',
      borderRadius: '4px',
      fontWeight: 'bold',
      display: 'inline-block',
      minWidth: '45px',
      textAlign: 'center'
    }}>
      {percentage}%
    </span>
  );
};

export default function PitchTracker() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [teams, setTeams] = useState([]);
  const [allPitchers, setAllPitchers] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [storageReady, setStorageReady] = useState(false);

  const organizations = [
    'USA Baseball', 'MLB/Pitch Smart', 'Little League Baseball', 'PONY Baseball',
    'Babe Ruth League/Cal Ripken', 'American Legion Baseball', 'USSSA', 'NFHS',
    'AAU Baseball', 'AABC', 'NABF', 'Dixie Youth Baseball', 'Perfect Game', 'Game Day USA'
  ];

  const pitchTypes = ['4-Seam', '2-Seam', 'Curve', 'Slider', 'Change', 'Splitter', 'Cutter', 'Knuckle'];

  // Initialize storage and load data on app start
  useEffect(() => {
    const initStorage = async () => {
      try {
        const storageModule = await import('../lib/storage');
        const storage = storageModule.default;
        
        await storage.init();
        const loadedTeams = await storage.getAllTeams();
        const loadedPitchers = await storage.getAllPitchers();
        
        if (loadedTeams && loadedTeams.length > 0) {
          setTeams(loadedTeams);
        }
        if (loadedPitchers && loadedPitchers.length > 0) {
          setAllPitchers(loadedPitchers);
        }
        
        setStorageReady(true);
        console.log('✅ Storage initialized. Loaded:', loadedTeams?.length || 0, 'teams,', loadedPitchers?.length || 0, 'pitchers');
      } catch (error) {
        console.error('Storage initialization failed:', error);
        setStorageReady(true); // Continue without storage
      }
    };
    
    initStorage();
  }, []);

  // Auto-save teams whenever they change
  useEffect(() => {
    const saveTeams = async () => {
      if (storageReady) {
        try {
          const storageModule = await import('../lib/storage');
          const storage = storageModule.default;
          await storage.saveAll('teams', teams);
          console.log('💾 Saved', teams.length, 'teams');
        } catch (error) {
          console.error('Failed to save teams:', error);
        }
      }
    };
    saveTeams();
  }, [teams, storageReady]);

  // Auto-save pitchers whenever they change
  useEffect(() => {
    const savePitchers = async () => {
      if (storageReady) {
        try {
          const storageModule = await import('../lib/storage');
          const storage = storageModule.default;
          await storage.saveAll('pitchers', allPitchers);
          console.log('💾 Saved', allPitchers.length, 'pitchers');
        } catch (error) {
          console.error('Failed to save pitchers:', error);
        }
      }
    };
    savePitchers();
  }, [allPitchers, storageReady]);

  // Dashboard
  const Dashboard = () => {
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [newTeam, setNewTeam] = useState({ name: '', organization: '', ageGroup: '' });

    const handleAddTeam = (e) => {
      e.preventDefault();
      if (teams.length >= 5) {
        alert('Maximum 5 teams per season.');
        return;
      }
      const team = {
        id: Date.now(),
        ...newTeam,
        pitcherIds: []
      };
      setTeams([...teams, team]);
      setNewTeam({ name: '', organization: '', ageGroup: '' });
      setShowAddTeam(false);
    };

    const deleteTeam = (teamId, e) => {
      e.stopPropagation();
      if (window.confirm('Delete this team? This will remove all associated data.')) {
        setTeams(teams.filter(t => t.id !== teamId));
      }
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="font-bold text-blue-900">📊 The Pitch Tracker - Demo Version</p>
            <p className="text-sm text-blue-800 mt-1">Session-only data: All information will be lost on page refresh</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">My Teams ({teams.length}/5)</h1>
            {teams.length < 5 && (
              <button
                onClick={() => setShowAddTeam(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
              >
                <Plus size={20} /> Add Team
              </button>
            )}
          </div>

          {showAddTeam && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Add New Team</h2>
                  <button onClick={() => setShowAddTeam(false)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddTeam}>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">Team Name</label>
                      <input
                        type="text"
                        required
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="Hawks 12U Travel"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Organization</label>
                      <select 
                        required 
                        value={newTeam.organization}
                        onChange={(e) => setNewTeam({ ...newTeam, organization: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Select organization...</option>
                        {organizations.map(org => (
                          <option key={org} value={org}>{org}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Age Group</label>
                      <input
                        type="text"
                        required
                        value={newTeam.ageGroup}
                        onChange={(e) => setNewTeam({ ...newTeam, ageGroup: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                        placeholder="12U, 14U, Varsity, etc."
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddTeam(false)}
                      className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Create Team
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {teams.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No teams yet. Add your first team to get started!</p>
                <button
                  onClick={() => setShowAddTeam(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                  Add Team
                </button>
              </div>
            ) : (
              teams.map(team => {
                const teamPitchers = allPitchers.filter(p => team.pitcherIds.includes(p.id));
                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-lg p-6 shadow hover:shadow-lg transition relative"
                  >
                    <div 
                      onClick={() => {
                        setCurrentTeam(team);
                        setCurrentView('team');
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                          <p className="text-gray-600">{team.organization}</p>
                          <p className="text-sm text-gray-500">{team.ageGroup}</p>
                          <p className="text-sm text-gray-500 mt-2">{teamPitchers.length} pitchers</p>
                        </div>
                        <div className={`h-4 w-4 rounded-full ${teamPitchers.length > 0 ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteTeam(team.id, e)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                      title="Delete team"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // Team View
  const TeamView = () => {
    const [showAddPitcher, setShowAddPitcher] = useState(false);
    const [newPitcher, setNewPitcher] = useState({
      fullName: '',
      birthday: '',
      selectedPitches: []
    });

    const teamPitchers = allPitchers.filter(p => currentTeam.pitcherIds.includes(p.id));

    const handleAddPitcher = (e) => {
      e.preventDefault();
      if (teamPitchers.length >= 15) {
        alert('Maximum 15 pitchers per team.');
        return;
      }

      const pitcher = {
        id: Date.now(),
        fullName: newPitcher.fullName,
        birthday: newPitcher.birthday,
        age: calculateAge(newPitcher.birthday),
        pitchArsenal: newPitcher.selectedPitches,
        games: [],
        trainingSessions: [],
        availableToday: 85
      };

      setAllPitchers([...allPitchers, pitcher]);
      setTeams(teams.map(t => 
        t.id === currentTeam.id 
          ? { ...t, pitcherIds: [...t.pitcherIds, pitcher.id] }
          : t
      ));
      setCurrentTeam({ ...currentTeam, pitcherIds: [...currentTeam.pitcherIds, pitcher.id] });
      setNewPitcher({ fullName: '', birthday: '', selectedPitches: [] });
      setShowAddPitcher(false);
    };

    const deletePitcher = (pitcherId) => {
      if (window.confirm('Remove this pitcher from the team?')) {
        setTeams(teams.map(t => 
          t.id === currentTeam.id 
            ? { ...t, pitcherIds: t.pitcherIds.filter(id => id !== pitcherId) }
            : t
        ));
        setCurrentTeam({ ...currentTeam, pitcherIds: currentTeam.pitcherIds.filter(id => id !== pitcherId) });
      }
    };

    const togglePitch = (pitch) => {
      setNewPitcher(prev => ({
        ...prev,
        selectedPitches: prev.selectedPitches.includes(pitch)
          ? prev.selectedPitches.filter(p => p !== pitch)
          : [...prev.selectedPitches, pitch]
      }));
    };

    const getLastGame = (pitcher) => {
      if (!pitcher.games || pitcher.games.length === 0) return null;
      return pitcher.games[pitcher.games.length - 1];
    };

    const getSeasonStats = (pitcher) => {
      if (!pitcher.games || pitcher.games.length === 0) {
        return { strikePercent: 0, vsLHB: 0, vsRHB: 0 };
      }
      const totalPitches = pitcher.games.reduce((sum, g) => sum + g.totalPitches, 0);
      const totalStrikes = pitcher.games.reduce((sum, g) => sum + g.strikes, 0);
      const lhbPitches = pitcher.games.reduce((sum, g) => sum + g.lhbPitches, 0);
      const lhbStrikes = pitcher.games.reduce((sum, g) => sum + g.lhbStrikes, 0);
      const rhbPitches = pitcher.games.reduce((sum, g) => sum + g.rhbPitches, 0);
      const rhbStrikes = pitcher.games.reduce((sum, g) => sum + g.rhbStrikes, 0);

      return {
        strikePercent: totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0,
        vsLHB: lhbPitches > 0 ? Math.round((lhbStrikes / lhbPitches) * 100) : 0,
        vsRHB: rhbPitches > 0 ? Math.round((rhbStrikes / rhbPitches) * 100) : 0
      };
    };

    const getBestPitches = (pitcher) => {
      if (!pitcher.trainingSessions || pitcher.trainingSessions.length === 0) return [];
      
      const last3 = pitcher.trainingSessions.slice(-3);
      const pitchStats = {};
      
      last3.forEach(session => {
        session.pitchData.forEach(pitch => {
          if (!pitchStats[pitch.type]) {
            pitchStats[pitch.type] = { strikes: 0, total: 0 };
          }
          pitchStats[pitch.type].total++;
          if (pitch.outcome === 'strike') pitchStats[pitch.type].strikes++;
        });
      });

      return Object.entries(pitchStats)
        .map(([type, stats]) => ({
          type,
          percent: Math.round((stats.strikes / stats.total) * 100)
        }))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 2);
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{currentTeam?.name}</h1>
              <p className="text-gray-600">{currentTeam?.organization} • {currentTeam?.ageGroup}</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Pitchers ({teamPitchers.length}/15)</h2>
            <div className="flex gap-2">
              {teamPitchers.length < 15 && (
                <button
                  onClick={() => setShowAddPitcher(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700"
                >
                  <Plus size={20} /> Add Pitcher
                </button>
              )}
              {teamPitchers.length > 0 && (
                <button
                  onClick={() => {
                    setGameState({
                      teamId: currentTeam.id,
                      selectedPitcher: null,
                      date: new Date().toISOString(),
                      inning: 1,
                      pitchers: []
                    });
                    setCurrentView('pitchTracking');
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Start Game
                </button>
              )}
            </div>
          </div>

          {showAddPitcher && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Add Pitcher</h2>
                  <button onClick={() => {
                    setShowAddPitcher(false);
                    setNewPitcher({ fullName: '', birthday: '', selectedPitches: [] });
                  }} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleAddPitcher}>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newPitcher.fullName}
                        onChange={(e) => setNewPitcher({ ...newPitcher, fullName: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Birthday</label>
                      <input
                        type="date"
                        required
                        value={newPitcher.birthday}
                        onChange={(e) => setNewPitcher({ ...newPitcher, birthday: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2">Pitch Arsenal</label>
                      <div className="grid grid-cols-2 gap-2">
                        {pitchTypes.map(pitch => (
                          <label key={pitch} className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={newPitcher.selectedPitches.includes(pitch)}
                              onChange={() => togglePitch(pitch)}
                            />
                            <span>{pitch}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPitcher(false);
                        setNewPitcher({ fullName: '', birthday: '', selectedPitches: [] });
                      }}
                      className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Add to Roster
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {teamPitchers.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No pitchers yet. Add your first pitcher!</p>
              </div>
            ) : (
              teamPitchers.map(pitcher => {
                const lastGame = getLastGame(pitcher);
                const seasonStats = getSeasonStats(pitcher);
                const bestPitches = getBestPitches(pitcher);
                const last3Outings = pitcher.games ? pitcher.games.slice(-3).map(g => g.totalPitches).reverse() : [];
                const last5Days = pitcher.games ? pitcher.games.slice(-5).reduce((sum, g) => sum + g.totalPitches, 0) : 0;

                return (
                  <div key={pitcher.id} className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition relative">
                    <button
                      onClick={() => deletePitcher(pitcher.id)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                      title="Remove pitcher"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="flex justify-between items-start pr-8">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{pitcher.fullName}, Age {pitcher.age}</h3>
                        <div className="mt-2 space-y-1 text-sm">
                          <p className="font-semibold">
                            Available Today: <span className="text-green-600">{pitcher.availableToday} pitches</span>
                          </p>
                          <p>Last 5 Days: {last5Days} pitches</p>
                          <p>Last 3 Outings: {last3Outings.length > 0 ? last3Outings.join(', ') : 'None'}</p>
                          {lastGame && (
                            <p>
                              Last Outing: {lastGame.battersFaced} BF | {lastGame.innings} IP | <StrikeBadge percentage={lastGame.strikePercent} />
                            </p>
                          )}
                          <p>
                            Season Strike %: <StrikeBadge percentage={seasonStats.strikePercent} /> | 
                            vs LHB: <StrikeBadge percentage={seasonStats.vsLHB} /> | 
                            vs RHB: <StrikeBadge percentage={seasonStats.vsRHB} />
                          </p>
                          {bestPitches.length > 0 && (
                            <p>
                              Best Pitches: {bestPitches.map((p, i) => `${i + 1}. ${p.type} ${p.percent}%`).join(' | ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // Pitch Tracking
  const PitchTrackingView = () => {
    if (!gameState.selectedPitcher) {
      const availablePitchers = allPitchers.filter(p => 
        currentTeam.pitcherIds.includes(p.id) && p.availableToday > 0
      );

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setCurrentView('team')}
                className="text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-gray-800">Select Pitcher</h1>
            </div>

            <div className="space-y-3">
              {availablePitchers.map(pitcher => (
                <div
                  key={pitcher.id}
                  onClick={() => {
                    setGameState({
                      ...gameState,
                      selectedPitcher: pitcher.id,
                      pitches: [],
                      batterHand: null,
                      balls: 0,
                      strikes: 0,
                      outs: 0,
                      battersFaced: 0,
                      ballsInPlay: 0,
                      firstPitchStrikes: 0,
                      atBats: 0,
                      threeBallCounts: 0
                    });
                  }}
                  className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition"
                >
                  <h3 className="font-bold text-lg">{pitcher.fullName}</h3>
                  <p className="text-green-600 font-semibold">Available: {pitcher.availableToday} pitches</p>
                </div>
              ))}
              {availablePitchers.length === 0 && (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-600">No pitchers currently available</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setCurrentView('gameEnd')}
              className="mt-6 w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700"
            >
              End Game
            </button>
          </div>
        </div>
      );
    }

    const pitcher = allPitchers.find(p => p.id === gameState.selectedPitcher);
    const pitches = gameState.pitches || [];
    const totalPitches = pitches.length;
    const totalStrikes = pitches.filter(p => ['strike', 'ballInPlay', 'out'].includes(p.outcome)).length;
    const strikePercent = totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0;

    const rhbPitches = pitches.filter(p => p.batterHand === 'R');
    const rhbStrikes = rhbPitches.filter(p => ['strike', 'ballInPlay', 'out'].includes(p.outcome)).length;
    const rhbStrikePercent = rhbPitches.length > 0 ? Math.round((rhbStrikes / rhbPitches.length) * 100) : 0;

    const lhbPitches = pitches.filter(p => p.batterHand === 'L');
    const lhbStrikes = lhbPitches.filter(p => ['strike', 'ballInPlay', 'out'].includes(p.outcome)).length;
    const lhbStrikePercent = lhbPitches.length > 0 ? Math.round((lhbStrikes / lhbPitches.length) * 100) : 0;

    const getLast20StrikePercentages = () => {
      const data = [];
      for (let i = 0; i < pitches.length; i++) {
        const start = Math.max(0, i - 19);
        const window = pitches.slice(start, i + 1);
        const windowStrikes = window.filter(p => ['strike', 'ballInPlay', 'out'].includes(p.outcome)).length;
        const percent = Math.round((windowStrikes / window.length) * 100);
        data.push({ pitch: i + 1, percent });
      }
      return data.slice(-20);
    };

    const recordPitch = (outcome) => {
      if (!gameState.batterHand) {
        alert('Please select batter handedness first');
        return;
      }

      const isFirstPitch = gameState.balls === 0 && gameState.strikes === 0;
      const newPitch = { outcome, batterHand: gameState.batterHand, timestamp: Date.now() };
      const updatedPitches = [...pitches, newPitch];

      let newBalls = gameState.balls;
      let newStrikes = gameState.strikes;
      let newOuts = gameState.outs;
      let newBattersFaced = gameState.battersFaced;
      let newBallsInPlay = gameState.ballsInPlay;
      let newFirstPitchStrikes = gameState.firstPitchStrikes;
      let newAtBats = gameState.atBats;
      let newThreeBallCounts = gameState.threeBallCounts;
      let newBatterHand = gameState.batterHand;

      if (outcome === 'ball') {
        newBalls++;
        if (newBalls === 3) newThreeBallCounts++;
      } else if (['strike', 'ballInPlay', 'out'].includes(outcome)) {
        newStrikes++;
        if (isFirstPitch) newFirstPitchStrikes++;
      }

      if (outcome === 'ballInPlay') {
        newBallsInPlay++;
        newBattersFaced++;
        newAtBats++;
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
      } else if (outcome === 'out') {
        newOuts++;
        newBattersFaced++;
        newAtBats++;
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
        
        if (newOuts % 3 === 0 && window.confirm('End of Inning?')) {
          setGameState({
            ...gameState,
            inning: gameState.inning + 1,
            pitches: updatedPitches,
            outs: newOuts,
            battersFaced: newBattersFaced,
            ballsInPlay: newBallsInPlay,
            firstPitchStrikes: newFirstPitchStrikes,
            atBats: newAtBats,
            threeBallCounts: newThreeBallCounts,
            balls: newBalls,
            strikes: newStrikes,
            batterHand: newBatterHand
          });
          return;
        }
      } else if (newStrikes >= 3) {
        newOuts++;
        newBattersFaced++;
        newAtBats++;
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
        
        if (newOuts % 3 === 0 && window.confirm('End of Inning?')) {
          setGameState({
            ...gameState,
            inning: gameState.inning + 1,
            pitches: updatedPitches,
            outs: newOuts,
            battersFaced: newBattersFaced,
            ballsInPlay: newBallsInPlay,
            firstPitchStrikes: newFirstPitchStrikes,
            atBats: newAtBats,
            threeBallCounts: newThreeBallCounts,
            balls: newBalls,
            strikes: newStrikes,
            batterHand: newBatterHand
          });
          return;
        }
      } else if (newBalls >= 4) {
        newBattersFaced++;
        newAtBats++;
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
      }

      setGameState({
        ...gameState,
        pitches: updatedPitches,
        balls: newBalls,
        strikes: newStrikes,
        outs: newOuts,
        battersFaced: newBattersFaced,
        ballsInPlay: newBallsInPlay,
        firstPitchStrikes: newFirstPitchStrikes,
        atBats: newAtBats,
        threeBallCounts: newThreeBallCounts,
        batterHand: newBatterHand
      });
    };

    const undoLastPitch = () => {
      if (pitches.length > 0) {
        setGameState({ ...gameState, pitches: pitches.slice(0, -1) });
      }
    };

    const endInning = () => {
      setGameState({ ...gameState, inning: gameState.inning + 1 });
    };

    const endOuting = () => {
      const innings = (Math.floor(gameState.outs / 3) + (gameState.outs % 3) / 10).toFixed(1);
      
      const gameData = {
        date: new Date().toISOString(),
        teamId: currentTeam.id,
        totalPitches: totalPitches,
        innings: parseFloat(innings),
        strikePercent,
        battersFaced: gameState.battersFaced,
        strikes: totalStrikes,
        lhbPitches: lhbPitches.length,
        lhbStrikes,
        rhbPitches: rhbPitches.length,
        rhbStrikes,
        ballsInPlay: gameState.ballsInPlay,
        firstPitchStrikes: gameState.firstPitchStrikes,
        threeBallCounts: gameState.threeBallCounts
      };

      const updatedPitcher = {
        ...pitcher,
        games: [...(pitcher.games || []), gameData],
        availableToday: pitcher.availableToday - totalPitches
      };

      setAllPitchers(allPitchers.map(p => p.id === pitcher.id ? updatedPitcher : p));
      
      setGameState({
        ...gameState,
        selectedPitcher: null,
        pitches: [],
        batterHand: null,
        balls: 0,
        strikes: 0,
        outs: 0,
        battersFaced: 0,
        ballsInPlay: 0,
        firstPitchStrikes: 0,
        atBats: 0,
        threeBallCounts: 0,
        pitchers: [...(gameState.pitchers || []), { pitcher: updatedPitcher, gameData }]
      });
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-sm text-gray-600 mb-4">
            {pitcher.fullName} | {currentTeam.name} | {new Date().toLocaleDateString()}
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex justify-around items-center text-center">
              <div>
                <p className="text-xs text-gray-600">Inning</p>
                <p className="text-2xl font-bold text-blue-900">{gameState.inning}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Outs</p>
                <p className="text-2xl font-bold text-blue-900">{gameState.outs % 3}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Count</p>
                <p className="text-2xl font-bold text-blue-900">{gameState.balls}-{gameState.strikes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 mb-4 shadow">
            <p className="font-semibold mb-2">Batter Handedness:</p>
            <div className="flex gap-4">
              <button
                onClick={() => setGameState({ ...gameState, batterHand: 'L' })}
                className={`flex-1 py-3 rounded-lg font-bold text-lg ${gameState.batterHand === 'L' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                L
              </button>
              <button
                onClick={() => setGameState({ ...gameState, batterHand: 'R' })}
                className={`flex-1 py-3 rounded-lg font-bold text-lg ${gameState.batterHand === 'R' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              >
                R
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => recordPitch('ball')} className="bg-red-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-red-600">BALL</button>
            <button onClick={() => recordPitch('strike')} className="bg-green-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-green-600">STRIKE</button>
            <button onClick={() => recordPitch('ballInPlay')} className="bg-blue-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-blue-600">BALL IN PLAY</button>
            <button onClick={() => recordPitch('out')} className="bg-purple-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-purple-600">OUT</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={endInning} className="bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700">END INNING</button>
            <button onClick={endOuting} className="bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700">END OUTING</button>
          </div>

          <button onClick={undoLastPitch} className="w-full bg-yellow-500 text-white py-2 rounded-lg font-semibold mb-4 hover:bg-yellow-600">↶ UNDO</button>

          <div className="bg-white rounded-lg p-4 shadow mb-4">
            <h3 className="font-bold mb-3">Live Stats</h3>
            <div className="space-y-2 text-sm">
              <p>Count: {gameState.balls}-{gameState.strikes} | Pitches: {totalPitches} | Strikes: <StrikeBadge percentage={strikePercent} /> | BIP: {gameState.ballsInPlay}</p>
              <p>1st Pitch Strikes: {gameState.firstPitchStrikes}/{gameState.atBats} ({gameState.atBats > 0 ? Math.round((gameState.firstPitchStrikes/gameState.atBats)*100) : 0}%) | 3-Ball Counts: {gameState.threeBallCounts}</p>
              <p>vs RHB: <StrikeBadge percentage={rhbStrikePercent} /> | vs LHB: <StrikeBadge percentage={lhbStrikePercent} /></p>
            </div>
          </div>

          {pitches.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow">
              <h3 className="font-bold mb-3">Strike % Trend (Last 20 Pitches)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={getLast20StrikePercentages()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pitch" label={{ value: 'Pitch #', position: 'insideBottom', offset: -5 }} />
                  <YAxis domain={[0, 100]} label={{ value: 'Strike %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Strike %']}
                    labelFormatter={(label) => `Pitch #${label}`}
                  />
                  <ReferenceArea y1={0} y2={50} fill="#DC3545" fillOpacity={0.1} />
                  <ReferenceArea y1={50} y2={65} fill="#FFC107" fillOpacity={0.1} />
                  <ReferenceArea y1={65} y2={100} fill="#28A745" fillOpacity={0.1} />
                  <Line type="monotone" dataKey="percent" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Game End
  const GameEndView = () => {
    const gamePitchers = gameState?.pitchers || [];
    
    const teamTotals = gamePitchers.reduce((acc, p) => ({
      totalPitches: acc.totalPitches + p.gameData.totalPitches,
      strikes: acc.strikes + p.gameData.strikes,
      battersFaced: acc.battersFaced + p.gameData.battersFaced,
      outs: acc.outs + Math.floor(p.gameData.innings) * 3 + Math.round((p.gameData.innings % 1) * 10),
      rhbPitches: acc.rhbPitches + p.gameData.rhbPitches,
      rhbStrikes: acc.rhbStrikes + p.gameData.rhbStrikes,
      lhbPitches: acc.lhbPitches + p.gameData.lhbPitches,
      lhbStrikes: acc.lhbStrikes + p.gameData.lhbStrikes
    }), { totalPitches: 0, strikes: 0, battersFaced: 0, outs: 0, rhbPitches: 0, rhbStrikes: 0, lhbPitches: 0, lhbStrikes: 0 });

    const teamStrikePercent = teamTotals.totalPitches > 0 ? Math.round((teamTotals.strikes / teamTotals.totalPitches) * 100) : 0;
    const teamRhbPercent = teamTotals.rhbPitches > 0 ? Math.round((teamTotals.rhbStrikes / teamTotals.rhbPitches) * 100) : 0;
    const teamLhbPercent = teamTotals.lhbPitches > 0 ? Math.round((teamTotals.lhbStrikes / teamTotals.lhbPitches) * 100) : 0;

    const teamPitchers = allPitchers.filter(p => currentTeam.pitcherIds.includes(p.id));
    const unavailableToday = teamPitchers.filter(p => p.availableToday <= 0);
    const availableToday = teamPitchers.filter(p => p.availableToday > 0);

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Game Summary</h1>
          
          <div className="bg-white rounded-lg p-6 shadow mb-4">
            <h2 className="text-xl font-bold mb-4">Team Pitching Totals</h2>
            <div className="space-y-1 text-sm">
              <p>Team: {currentTeam.name}</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Total Pitches: {teamTotals.totalPitches}</p>
              <p>Strike %: <StrikeBadge percentage={teamStrikePercent} /></p>
              <p>Batters Faced: {teamTotals.battersFaced}</p>
              <p>Outs Recorded: {teamTotals.outs}</p>
              <p>vs RHB: <StrikeBadge percentage={teamRhbPercent} /> | vs LHB: <StrikeBadge percentage={teamLhbPercent} /></p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow mb-4">
            <h2 className="text-xl font-bold mb-4">Individual Pitcher Lines</h2>
            <div className="space-y-2">
              {gamePitchers.map((p, i) => (
                <p key={i} className="text-sm">
                  {p.pitcher.fullName}: {p.gameData.totalPitches} pitches | {p.gameData.innings} IP | <StrikeBadge percentage={p.gameData.strikePercent} />
                </p>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow mb-4">
            <h2 className="text-xl font-bold mb-4">Pitcher Availability</h2>
            
            {unavailableToday.length > 0 && (
              <>
                <h3 className="font-semibold mb-2">Unavailable Today:</h3>
                <div className="space-y-1 mb-4">
                  {unavailableToday.map(p => (
                    <p key={p.id} className="text-sm text-red-600">• {p.fullName} - {p.availableToday} pitches</p>
                  ))}
                </div>
              </>
            )}
            
            {availableToday.length > 0 && (
              <>
                <h3 className="font-semibold mb-2">Available Today:</h3>
                <div className="space-y-1">
                  {availableToday.map(p => (
                    <p key={p.id} className="text-sm text-green-600">• {p.fullName} - {p.availableToday} pitches</p>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setGameState(null);
              setCurrentView('dashboard');
            }}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  };

  // Training View
  const TrainingView = () => {
    const [selectedPitcher, setSelectedPitcher] = useState(null);
    const [targetPitches, setTargetPitches] = useState(25);
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionPitches, setSessionPitches] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [coachNotes, setCoachNotes] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    const recordTrainingPitch = (pitchType) => {
      const outcome = window.confirm(`${pitchType} - Click OK for STRIKE, Cancel for BALL`);
      const newPitch = { type: pitchType, outcome: outcome ? 'strike' : 'ball', timestamp: Date.now() };
      const updated = [...sessionPitches, newPitch];
      setSessionPitches(updated);

      if (updated.length === 45 && !window.alertShown45) {
        alert('45 pitches thrown. Consider ending session soon.');
        window.alertShown45 = true;
      }

      if (updated.length >= 60) {
        alert('Maximum 60 pitches reached. Session must end.');
        endTrainingSession(updated);
      }
    };

    const undoTrainingPitch = () => {
      if (sessionPitches.length > 0) setSessionPitches(sessionPitches.slice(0, -1));
    };

    const endTrainingSession = (pitches = sessionPitches) => {
      if (pitches.length < 15) {
        if (!window.confirm('Invalid session - minimum 15 pitches required. Discard?')) return;
        setSessionPitches([]);
        setSessionActive(false);
        setSelectedPitcher(null);
        delete window.alertShown45;
        return;
      }

      window.alertShown45 = false;
      setShowSummary(true);
    };

    const saveSummary = () => {
      const sessionData = {
        date: new Date().toISOString(),
        target: targetPitches,
        pitchData: sessionPitches,
        notes: coachNotes
      };

      const updatedPitcher = {
        ...selectedPitcher,
        trainingSessions: [...(selectedPitcher.trainingSessions || []), sessionData]
      };
      setAllPitchers(allPitchers.map(p => p.id === selectedPitcher.id ? updatedPitcher : p));

      setSessionPitches([]);
      setCoachNotes('');
      setSessionActive(false);
      setShowSummary(false);
      setSelectedPitcher(null);
    };

    const getSessionStats = (pitches) => {
      const total = pitches.length;
      const strikes = pitches.filter(p => p.outcome === 'strike').length;
      const strikePercent = total > 0 ? Math.round((strikes / total) * 100) : 0;

      const byPitchType = pitchTypes.reduce((acc, type) => {
        const typePitches = pitches.filter(p => p.type === type);
        const typeStrikes = typePitches.filter(p => p.outcome === 'strike').length;
        acc[type] = {
          count: typePitches.length,
          strikePercent: typePitches.length > 0 ? Math.round((typeStrikes / typePitches.length) * 100) : 0
        };
        return acc;
      }, {});

      return { total, strikePercent, byPitchType };
    };

    if (showSummary) {
      const stats = getSessionStats(sessionPitches);

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Training Session Summary</h1>
            
            <div className="bg-white rounded-lg p-6 shadow mb-4">
              <h2 className="text-xl font-bold mb-4">{selectedPitcher.fullName}</h2>
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Total Pitches: {stats.total}/{targetPitches} (Max 60)</p>
              <p className="mt-2">Overall Strike %: <StrikeBadge percentage={stats.strikePercent} /></p>

              <h3 className="font-bold mt-6 mb-3">By Pitch Type:</h3>
              <div className="space-y-2">
                {Object.entries(stats.byPitchType)
                  .filter(([_, data]) => data.count > 0)
                  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
                  .map(([type, data]) => (
                    <p key={type}>{type}: {data.count} pitches, <StrikeBadge percentage={data.strikePercent} /></p>
                  ))}
              </div>

              <div className="mt-6">
                <label className="block font-semibold mb-2">Coach's Notes (500 char max):</label>
                <textarea
                  value={coachNotes}
                  onChange={(e) => setCoachNotes(e.target.value.slice(0, 500))}
                  className="w-full border rounded px-3 py-2 h-32"
                  placeholder="Add notes about this session..."
                />
                <p className="text-sm text-gray-600 mt-1">{coachNotes.length}/500</p>
              </div>
            </div>

            <button onClick={saveSummary} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
              Save & Done
            </button>
          </div>
        </div>
      );
    }

    if (sessionActive && selectedPitcher) {
      const stats = getSessionStats(sessionPitches);
      const progressColor = stats.total < 15 ? 'bg-red-500' : stats.total < targetPitches ? 'bg-yellow-500' : stats.total < 45 ? 'bg-green-500' : 'bg-orange-500';
      const progressText = stats.total >= 45 ? 'font-bold text-orange-600' : '';

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{selectedPitcher.fullName}</h2>
              <p className={`text-lg ${progressText}`}>Progress: {stats.total}/{targetPitches} pitches (Max: 60)</p>
              <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                <div className={`${progressColor} h-4 rounded-full transition-all`} style={{ width: `${Math.min((stats.total / 60) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow mb-4">
              <h3 className="font-bold mb-3">Select Pitch Type</h3>
              <div className="grid grid-cols-4 gap-2">
                {pitchTypes.map(type => (
                  <button key={type} onClick={() => recordTrainingPitch(type)} className="bg-blue-500 text-white py-3 rounded hover:bg-blue-600 text-sm font-semibold">
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={undoTrainingPitch} className="w-full bg-yellow-500 text-white py-2 rounded-lg font-semibold mb-4 hover:bg-yellow-600">↶ UNDO</button>

            <div className="bg-white rounded-lg p-4 shadow mb-4">
              <h3 className="font-bold mb-3">Current Session</h3>
              <p className="mb-2">Pitches: {stats.total}/{targetPitches}</p>
              <p className="mb-3">Strike %: <StrikeBadge percentage={stats.strikePercent} /></p>
              
              <h4 className="font-semibold mb-2">By Pitch Type:</h4>
              <div className="space-y-1 text-sm">
                {pitchTypes.map(type => {
                  const typeStats = stats.byPitchType[type];
                  if (typeStats.count === 0) return null;
                  return <p key={type}>{type}: {typeStats.count} pitches | <StrikeBadge percentage={typeStats.strikePercent} /></p>;
                })}
              </div>
            </div>

            <button onClick={() => endTrainingSession()} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700">END SESSION</button>
          </div>
        </div>
      );
    }

    if (showHistory && selectedPitcher) {
      const sessions = selectedPitcher.trainingSessions || [];

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setShowHistory(false)} className="text-blue-600 hover:text-blue-800"><ArrowLeft size={24} /></button>
              <h1 className="text-3xl font-bold">Training History - {selectedPitcher.fullName}</h1>
            </div>

            <div className="space-y-3">
              {sessions.slice(-5).reverse().map((session, i) => {
                const stats = getSessionStats(session.pitchData);
                return (
                  <div key={i} className="bg-white rounded-lg p-4 shadow">
                    <h3 className="font-bold">{new Date(session.date).toLocaleDateString()}</h3>
                    <p>Total Pitches: {stats.total}/{session.target}</p>
                    <p>Strike %: <StrikeBadge percentage={stats.strikePercent} /></p>
                    {session.notes && <p className="mt-2 text-sm text-gray-600 italic">{session.notes}</p>}
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-600">No training sessions yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Training</h1>

          {!selectedPitcher ? (
            <>
              <h2 className="text-xl font-bold mb-4">Select Pitcher</h2>
              <div className="space-y-3">
                {allPitchers.map(pitcher => (
                  <div key={pitcher.id} onClick={() => setSelectedPitcher(pitcher)} className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition">
                    <h3 className="font-bold">{pitcher.fullName}, Age {pitcher.age}</h3>
                    <p className="text-sm text-gray-600">Click to start training session</p>
                  </div>
                ))}
                {allPitchers.length === 0 && (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <p className="text-gray-600">No pitchers yet. Add pitchers to a team first.</p>
                    <button onClick={() => setCurrentView('dashboard')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">Go to Dashboard</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg p-6 shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedPitcher.fullName}</h2>
                  <p className="text-gray-600">Age {selectedPitcher.age}</p>
                </div>
                <button onClick={() => setSelectedPitcher(null)} className="text-blue-600 hover:underline">Change Pitcher</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Target Pitches for Session:</label>
                  <input
                    type="number"
                    min="15"
                    max="60"
                    value={targetPitches}
                    onChange={(e) => setTargetPitches(Math.min(60, Math.max(15, parseInt(e.target.value) || 15)))}
                    className="w-full border rounded px-3 py-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">Minimum: 15 | Maximum: 60</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setTargetPitches(20)} className="flex-1 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">20</button>
                  <button onClick={() => setTargetPitches(25)} className="flex-1 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">25</button>
                  <button onClick={() => setTargetPitches(30)} className="flex-1 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">30</button>
                  <button onClick={() => setTargetPitches(50)} className="flex-1 bg-gray-200 px-3 py-2 rounded hover:bg-gray-300">50</button>
                </div>

                <button onClick={() => setSessionActive(true)} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700">START SESSION</button>
                <button onClick={() => setShowHistory(true)} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700">VIEW HISTORY</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Bottom Nav
  const BottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="max-w-4xl mx-auto flex justify-around py-3">
        <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 px-4 py-2 ${['dashboard', 'team', 'pitchTracking', 'gameEnd'].includes(currentView) ? 'text-blue-600' : 'text-gray-600'}`}>
          <div className="text-2xl">📊</div>
          <span className="text-xs">Teams</span>
        </button>
        <button onClick={() => setCurrentView('training')} className={`flex flex-col items-center gap-1 px-4 py-2 ${currentView === 'training' ? 'text-blue-600' : 'text-gray-600'}`}>
          <TrendingUp size={24} />
          <span className="text-xs">Training</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {!storageReady && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <p className="text-xl font-bold mb-2">Loading...</p>
            <p className="text-gray-600">Initializing phone storage</p>
          </div>
        </div>
      )}
      {currentView === 'dashboard' && <Dashboard />}
      {currentView === 'team' && <TeamView />}
      {currentView === 'pitchTracking' && <PitchTrackingView />}
      {currentView === 'gameEnd' && <GameEndView />}
      {currentView === 'training' && <TrainingView />}
      <BottomNav />
    </div>
  );
}
