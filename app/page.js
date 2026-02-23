'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ResponsiveContainer } from 'recharts';
import { Plus, ArrowLeft, Trash2, TrendingUp, X, Edit } from 'lucide-react';

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

export default function PitchTracker() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [teams, setTeams] = useState([]);
  const [allPitchers, setAllPitchers] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [pausedGame, setPausedGame] = useState(null);
  const [pausedTraining, setPausedTraining] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const [settings, setSettings] = useState({
    redThreshold: 50,    // Below this = RED
    yellowThreshold: 65, // Below this = YELLOW, above = GREEN
    customPitchRules: null // Custom pitch count rules (if null, use defaults)
  });

  // Default pitch count rules (MLB Pitch Smart / USA Baseball)
  const defaultPitchRules = {
    name: 'MLB Pitch Smart / USA Baseball',
    dailyLimits: [
      { maxAge: 8, pitches: 50 },
      { maxAge: 10, pitches: 75 },
      { maxAge: 12, pitches: 85 },
      { maxAge: 14, pitches: 95 },
      { maxAge: 99, pitches: 105 }
    ],
    restDays: [
      { maxPitches: 20, days: 1 },
      { maxPitches: 40, days: 2 },
      { maxPitches: 60, days: 3 },
      { maxPitches: 999, days: 4 }
    ]
  };

  const organizations = [
    'USA Baseball', 'MLB/Pitch Smart', 'Little League Baseball', 'PONY Baseball',
    'Babe Ruth League/Cal Ripken', 'American Legion Baseball', 'USSSA', 'NFHS',
    'AAU Baseball', 'AABC', 'NABF', 'Dixie Youth Baseball', 'Perfect Game', 'Game Day USA'
  ];

  const pitchTypes = ['4-Seam', '2-Seam', 'Curve', 'Slider', 'Change', 'Splitter', 'Cutter', 'Knuckle'];

  // Get daily pitch limit based on age and organization
  const getDailyPitchLimit = (age, organization) => {
    // Check for custom rules first
    if (settings.customPitchRules) {
      const rules = settings.customPitchRules.dailyLimits;
      for (let i = 0; i < rules.length; i++) {
        if (age <= rules[i].maxAge) {
          return rules[i].pitches;
        }
      }
      return rules[rules.length - 1].pitches; // Fallback to highest age bracket
    }
    
    // Default to MLB Pitch Smart if no organization specified
    const org = organization || 'MLB/Pitch Smart';
    
    // MLB Pitch Smart / USA Baseball (most common)
    if (org === 'MLB/Pitch Smart' || org === 'USA Baseball') {
      if (age <= 8) return 50;
      if (age <= 10) return 75;
      if (age <= 12) return 85;
      if (age <= 14) return 95;
      return 105; // 15+
    }
    
    // Little League Baseball
    if (org === 'Little League Baseball') {
      if (age <= 10) return 75;
      if (age <= 12) return 85;
      return 95; // 13+
    }
    
    // NFHS (High School)
    if (org === 'NFHS') {
      return 105; // All high school ages
    }
    
    // USSSA
    if (org === 'USSSA') {
      if (age <= 8) return 50;
      if (age <= 10) return 75;
      if (age <= 12) return 85;
      if (age <= 14) return 95;
      return 105; // 15+
    }
    
    // PONY Baseball
    if (org === 'PONY Baseball') {
      if (age <= 10) return 75;
      if (age <= 12) return 85;
      if (age <= 14) return 95;
      return 105; // 15+
    }
    
    // Default to MLB Pitch Smart rules
    if (age <= 8) return 50;
    if (age <= 10) return 75;
    if (age <= 12) return 85;
    if (age <= 14) return 95;
    return 105; // 15+
  };

  // Get required rest days based on pitch count and age
  const getRequiredRestDays = (pitchCount, age, organization) => {
    // Check for custom rules first
    if (settings.customPitchRules) {
      const rules = settings.customPitchRules.restDays;
      for (let i = 0; i < rules.length; i++) {
        if (pitchCount <= rules[i].maxPitches) {
          return rules[i].days;
        }
      }
      return rules[rules.length - 1].days; // Fallback to highest bracket
    }
    
    const org = organization || 'MLB/Pitch Smart';
    
    // MLB Pitch Smart / USA Baseball
    if (org === 'MLB/Pitch Smart' || org === 'USA Baseball' || org === 'USSSA') {
      if (pitchCount >= 61) return 4;
      if (pitchCount >= 41) return 3;
      if (pitchCount >= 21) return 2;
      if (pitchCount >= 1) return 1;
      return 0;
    }
    
    // Little League Baseball
    if (org === 'Little League Baseball') {
      if (pitchCount >= 61) return 3;
      if (pitchCount >= 41) return 2;
      if (pitchCount >= 21) return 1;
      return 0;
    }
    
    // NFHS
    if (org === 'NFHS') {
      if (pitchCount >= 76) return 3;
      if (pitchCount >= 51) return 2;
      if (pitchCount >= 31) return 1;
      return 0;
    }
    
    // Default to MLB Pitch Smart
    if (pitchCount >= 61) return 4;
    if (pitchCount >= 41) return 3;
    if (pitchCount >= 21) return 2;
    if (pitchCount >= 1) return 1;
    return 0;
  };

  // Get strike percentage color based on settings
  const getStrikeColor = (percentage) => {
    if (percentage < settings.redThreshold) return { bg: '#DC3545', text: 'white' };
    if (percentage < settings.yellowThreshold) return { bg: '#FFC107', text: 'black' };
    return { bg: '#28A745', text: 'white' };
  };

  // Strike badge component
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

  // Calculate available pitches including ONLY game pitches (not training)
  const calculateAvailablePitches = (pitcher, teamOrganization = null) => {
    // Get the team this pitcher belongs to for organization
    const pitcherTeam = teams.find(t => t.pitcherIds.includes(pitcher.id));
    const organization = teamOrganization || pitcherTeam?.organization || 'MLB/Pitch Smart';
    
    // Get daily limit based on age and organization
    const dailyLimit = getDailyPitchLimit(pitcher.age, organization);
    
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find all pitchers with same name and birthday (same player on multiple teams)
    const samePitchers = allPitchers.filter(p => 
      p.fullName === pitcher.fullName && 
      p.birthday === pitcher.birthday
    );
    
    // Collect all games with dates
    const allGames = [];
    samePitchers.forEach(p => {
      if (p.games && p.games.length > 0) {
        p.games.forEach(game => {
          const gameDate = new Date(game.date);
          gameDate.setHours(0, 0, 0, 0);
          const daysSinceGame = Math.floor((today - gameDate) / (1000 * 60 * 60 * 24));
          allGames.push({
            date: gameDate,
            daysSince: daysSinceGame,
            pitches: game.totalPitches || 0
          });
        });
      }
    });
    
    // Sort by date (most recent first)
    allGames.sort((a, b) => b.date - a.date);
    
    // Calculate pitches for today, yesterday, day before yesterday
    let pitchesToday = 0;
    let pitchesYesterday = 0;
    let pitchesDayBefore = 0;
    
    allGames.forEach(game => {
      if (game.daysSince === 0) pitchesToday += game.pitches;
      else if (game.daysSince === 1) pitchesYesterday += game.pitches;
      else if (game.daysSince === 2) pitchesDayBefore += game.pitches;
    });
    
    // Check if pitched yesterday (day 1 consecutive)
    const pitchedYesterday = pitchesYesterday > 0;
    
    // Check if pitched day before yesterday (would make today day 3)
    const pitchedDayBefore = pitchesDayBefore > 0;
    
    // RULE: Cannot pitch 3 consecutive days
    if (pitchedYesterday && pitchedDayBefore) {
      return 0; // Pitched last 2 days, MUST rest today
    }
    
    // Check if in mandatory rest period from previous pitch day(s)
    if (pitchedYesterday) {
      // If pitched yesterday, check if rest is still required
      const totalPitches = pitchesYesterday + pitchesToday;
      const restDaysRequired = getRequiredRestDays(totalPitches, pitcher.age, organization);
      
      if (restDaysRequired > 0) {
        // Still in rest period - cannot pitch today
        return 0;
      }
    } else if (pitchesToday === 0) {
      // Didn't pitch yesterday or today, check if rest from earlier games
      const recentGames = allGames.filter(g => g.daysSince > 0 && g.daysSince <= 5);
      for (let game of recentGames) {
        const restDaysRequired = getRequiredRestDays(game.pitches, pitcher.age, organization);
        if (game.daysSince <= restDaysRequired) {
          return 0; // Still in rest period
        }
      }
    }
    
    // Calculate available pitches for today
    if (pitchedYesterday) {
      // Day 2 consecutive: available = dailyMax - (yesterday + today)
      const totalTwoDays = pitchesYesterday + pitchesToday;
      return Math.max(0, dailyLimit - totalTwoDays);
    } else {
      // Single day or non-consecutive: available = dailyMax - today
      return Math.max(0, dailyLimit - pitchesToday);
    }
  };

  // Calculate total pitches thrown TODAY and mandatory rest days
  const getTodaysPitchesAndRest = (pitcher, teamOrganization = null) => {
    const pitcherTeam = teams.find(t => t.pitcherIds.includes(pitcher.id));
    const organization = teamOrganization || pitcherTeam?.organization || 'MLB/Pitch Smart';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find all pitchers with same name and birthday
    const samePitchers = allPitchers.filter(p => 
      p.fullName === pitcher.fullName && 
      p.birthday === pitcher.birthday
    );
    
    let pitchesToday = 0;
    let pitchesYesterday = 0;
    
    samePitchers.forEach(p => {
      if (p.games && p.games.length > 0) {
        p.games.forEach(game => {
          const gameDate = new Date(game.date);
          gameDate.setHours(0, 0, 0, 0);
          const daysSinceGame = Math.floor((today - gameDate) / (1000 * 60 * 60 * 24));
          
          if (daysSinceGame === 0) {
            pitchesToday += (game.totalPitches || 0);
          } else if (daysSinceGame === 1) {
            pitchesYesterday += (game.totalPitches || 0);
          }
        });
      }
    });
    
    // Calculate mandatory rest based on consecutive days
    let mandatoryRestDays = 0;
    
    if (pitchesYesterday > 0) {
      // Pitched yesterday (day 2 consecutive) - use combined total
      const totalTwoDays = pitchesYesterday + pitchesToday;
      mandatoryRestDays = getRequiredRestDays(totalTwoDays, pitcher.age, organization);
      // Add 1 day minimum because must rest after 2 consecutive days
      mandatoryRestDays = Math.max(mandatoryRestDays, 1);
    } else {
      // Single day - use today's total only
      mandatoryRestDays = getRequiredRestDays(pitchesToday, pitcher.age, organization);
    }
    
    return { pitchesToday, pitchesYesterday, mandatoryRestDays };
  };

  // Calculate pitches remaining until next rest threshold or max
  const getPitchesUntilNextThreshold = (currentPitches, yesterdayPitches, age, organization) => {
    const dailyMax = getDailyPitchLimit(age, organization);
    const pitchedYesterday = yesterdayPitches > 0;
    
    if (pitchedYesterday) {
      // Day 2 consecutive - limit is daily max for combined total
      const totalTwoDays = yesterdayPitches + currentPitches;
      const remaining = dailyMax - totalTwoDays;
      
      if (remaining <= 0) {
        return { remaining: 0, atMax: true, isConsecutiveDay: true };
      }
      
      return { remaining, atMax: false, isConsecutiveDay: true };
    } else {
      // Single day - find next threshold
      const thresholds = {
        'MLB/Pitch Smart': {
          '7-8': [20, 35, 50, 65],
          '9-10': [20, 35, 50, 65, 75],
          '11-12': [20, 35, 50, 65, 85],
          '13-14': [20, 35, 50, 75, 95],
          '15-16': [30, 45, 60, 75, 90, 105],
          '17-18': [30, 45, 60, 80, 105]
        },
        'Little League': {
          '7-8': [50],
          '9-10': [75],
          '11-12': [85],
          '13-16': [95],
          '17-18': [105]
        }
      };

      const ageGroup = age <= 8 ? '7-8' :
                       age <= 10 ? '9-10' :
                       age <= 12 ? '11-12' :
                       age <= 14 ? '13-14' :
                       age <= 16 ? '15-16' : '17-18';
      
      const ageThresholds = thresholds[organization]?.[ageGroup] || thresholds['MLB/Pitch Smart'][ageGroup];
      
      // Find next threshold
      for (let threshold of ageThresholds) {
        if (currentPitches < threshold) {
          return { remaining: threshold - currentPitches, atMax: false, isConsecutiveDay: false, nextThreshold: threshold };
        }
      }
      
      // At or past all thresholds - show remaining to daily max
      const remaining = dailyMax - currentPitches;
      return { remaining: Math.max(0, remaining), atMax: remaining <= 0, isConsecutiveDay: false };
    }
  };

  // Calculate training pitches in last 3 days for display
  const getTrainingPitchesLast3Days = (pitcher) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find all pitchers with same name and birthday
    const samePitchers = allPitchers.filter(p => 
      p.fullName === pitcher.fullName && 
      p.birthday === pitcher.birthday
    );
    
    let totalTraining = 0;
    
    samePitchers.forEach(p => {
      if (p.trainingSessions && p.trainingSessions.length > 0) {
        p.trainingSessions.forEach(session => {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          
          const daysDiff = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
          
          // Count training in last 3 days
          if (daysDiff >= 0 && daysDiff <= 3) {
            totalTraining += session.pitchData.length;
          }
        });
      }
    });
    
    return totalTraining;
  };

  // Calculate pitches until mandatory rest
  // Initialize storage and load data on app start
  useEffect(() => {
    const initStorage = async () => {
      try {
        const storageModule = await import('../lib/storage');
        const storage = storageModule.default;
        
        await storage.init();
        const loadedTeams = await storage.getAllTeams();
        const loadedPitchers = await storage.getAllPitchers();
        const loadedSettings = await storage.get('settings', 'app_settings');
        const loadedPausedGame = await storage.get('pausedGame', 'paused_sessions');
        const loadedPausedTraining = await storage.get('pausedTraining', 'paused_sessions');
        
        if (loadedTeams && loadedTeams.length > 0) {
          setTeams(loadedTeams);
        }
        if (loadedPitchers && loadedPitchers.length > 0) {
          setAllPitchers(loadedPitchers);
        }
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
        if (loadedPausedGame) {
          setPausedGame(loadedPausedGame);
        }
        if (loadedPausedTraining) {
          setPausedTraining(loadedPausedTraining);
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

  // Auto-save settings whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      if (storageReady) {
        try {
          const storageModule = await import('../lib/storage');
          const storage = storageModule.default;
          await storage.save('settings', { key: 'app_settings', ...settings });
          console.log('💾 Saved settings');
        } catch (error) {
          console.error('Failed to save settings:', error);
        }
      }
    };
    saveSettings();
  }, [settings, storageReady]);

  // Auto-save paused game
  useEffect(() => {
    const savePausedGame = async () => {
      if (storageReady) {
        try {
          const storageModule = await import('../lib/storage');
          const storage = storageModule.default;
          if (pausedGame) {
            await storage.save('pausedGame', { key: 'paused_sessions', ...pausedGame });
            console.log('💾 Saved paused game');
          } else {
            await storage.delete('pausedGame', 'paused_sessions');
          }
        } catch (error) {
          console.error('Failed to save paused game:', error);
        }
      }
    };
    savePausedGame();
  }, [pausedGame, storageReady]);

  // Auto-save paused training
  useEffect(() => {
    const savePausedTraining = async () => {
      if (storageReady) {
        try {
          const storageModule = await import('../lib/storage');
          const storage = storageModule.default;
          if (pausedTraining) {
            await storage.save('pausedTraining', { key: 'paused_sessions', ...pausedTraining });
            console.log('💾 Saved paused training');
          } else {
            await storage.delete('pausedTraining', 'paused_sessions');
          }
        } catch (error) {
          console.error('Failed to save paused training:', error);
        }
      }
    };
    savePausedTraining();
  }, [pausedTraining, storageReady]);

  // Dashboard
  const Dashboard = () => {
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [editingTeam, setEditingTeam] = useState(null);
    const [newTeam, setNewTeam] = useState({ 
      name: '', 
      organization: '', 
      ageGroup: '',
      coach1Name: '',
      coach1Phone: '',
      coach2Name: '',
      coach2Phone: ''
    });
    const [dashboardTab, setDashboardTab] = useState('teams'); // 'teams' or 'pitchers'
    const [editingPitcher, setEditingPitcher] = useState(null);
    const [selectedPitchersForTeam, setSelectedPitchersForTeam] = useState([]);

    const startEditTeam = (team, e) => {
      e.stopPropagation();
      setEditingTeam(team.id);
      setNewTeam({
        name: team.name,
        organization: team.organization,
        ageGroup: team.ageGroup,
        coach1Name: team.coach1Name || '',
        coach1Phone: team.coach1Phone || '',
        coach2Name: team.coach2Name || '',
        coach2Phone: team.coach2Phone || ''
      });
      setShowAddTeam(true);
    };

    const handleAddTeam = (e) => {
      e.preventDefault();
      
      if (editingTeam) {
        // Update existing team
        setTeams(teams.map(t => 
          t.id === editingTeam 
            ? { ...t, ...newTeam, pitcherIds: [...new Set([...t.pitcherIds, ...selectedPitchersForTeam])] }
            : t
        ));
        setEditingTeam(null);
      } else {
        // Add new team
        if (teams.length >= 5) {
          alert('Maximum 5 teams per season.');
          return;
        }
        const team = {
          id: Date.now(),
          ...newTeam,
          pitcherIds: selectedPitchersForTeam
        };
        setTeams([...teams, team]);
      }
      
      setNewTeam({ 
        name: '', 
        organization: '', 
        ageGroup: '',
        coach1Name: '',
        coach1Phone: '',
        coach2Name: '',
        coach2Phone: ''
      });
      setSelectedPitchersForTeam([]);
      setShowAddTeam(false);
    };

    const deleteTeam = (teamId, e) => {
      e.stopPropagation();
      if (window.confirm('Delete this team? This will remove all associated data.')) {
        setTeams(teams.filter(t => t.id !== teamId));
      }
    };

    const deletePitcherStats = (pitcherId) => {
      if (window.confirm('Delete all stats for this pitcher? This will remove all game and training data but keep the pitcher information (name, birthday, phone, pitch arsenal).')) {
        setAllPitchers(allPitchers.map(p => 
          p.id === pitcherId 
            ? { 
                ...p, 
                games: [], 
                trainingSessions: [],
                availableToday: calculateMaxPitches(p.age, teams.find(t => t.pitcherIds.includes(p.id))?.organization)
              }
            : p
        ));
      }
    };

    const deletePitcherCompletely = (pitcherId) => {
      if (window.confirm('Permanently delete this pitcher? This will remove the pitcher from all teams.')) {
        // Remove from all teams
        setTeams(teams.map(t => ({
          ...t,
          pitcherIds: t.pitcherIds.filter(id => id !== pitcherId)
        })));
        // Remove pitcher
        setAllPitchers(allPitchers.filter(p => p.id !== pitcherId));
      }
    };

    const startEditPitcherDashboard = (pitcher) => {
      setEditingPitcher(pitcher);
    };

    const handleSavePitcher = (updatedPitcher) => {
      setAllPitchers(allPitchers.map(p => 
        p.id === updatedPitcher.id ? updatedPitcher : p
      ));
      setEditingPitcher(null);
    };

    // Get unassigned pitchers (pitchers not on any team)
    const unassignedPitchers = allPitchers.filter(p => 
      !teams.some(t => t.pitcherIds.includes(p.id))
    );

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="font-bold text-blue-900">📊 The Pitch Tracker - Demo Version</p>
            <p className="text-sm text-blue-800 mt-1">Session-only data: All information will be lost on page refresh</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 bg-white rounded-lg p-1 shadow">
            <button
              onClick={() => setDashboardTab('teams')}
              className={`flex-1 py-2 px-4 rounded ${dashboardTab === 'teams' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Teams ({teams.length})
            </button>
            <button
              onClick={() => setDashboardTab('pitchers')}
              className={`flex-1 py-2 px-4 rounded ${dashboardTab === 'pitchers' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              All Pitchers ({allPitchers.length})
            </button>
          </div>

          {dashboardTab === 'teams' && (
            <>
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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg p-6 max-w-md w-full my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
                  <h2 className="text-2xl font-bold">{editingTeam ? 'Edit Team' : 'Add New Team'}</h2>
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
                    
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3">Team Coaches (Optional)</h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block font-semibold mb-1">Coach 1 Name</label>
                          <input
                            type="text"
                            value={newTeam.coach1Name}
                            onChange={(e) => setNewTeam({ ...newTeam, coach1Name: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="John Smith"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Coach 1 Phone</label>
                          <input
                            type="tel"
                            value={newTeam.coach1Phone}
                            onChange={(e) => setNewTeam({ ...newTeam, coach1Phone: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="555-123-4567"
                          />
                          <p className="text-xs text-gray-600 mt-1">For texting training reports</p>
                        </div>
                        
                        <div>
                          <label className="block font-semibold mb-1">Coach 2 Name</label>
                          <input
                            type="text"
                            value={newTeam.coach2Name}
                            onChange={(e) => setNewTeam({ ...newTeam, coach2Name: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1">Coach 2 Phone</label>
                          <input
                            type="tel"
                            value={newTeam.coach2Phone}
                            onChange={(e) => setNewTeam({ ...newTeam, coach2Phone: e.target.value })}
                            className="w-full border rounded px-3 py-2"
                            placeholder="555-987-6543"
                          />
                          <p className="text-xs text-gray-600 mt-1">For texting training reports</p>
                        </div>
                      </div>
                    </div>

                    {/* Assign Existing Pitchers */}
                    {unassignedPitchers.length > 0 && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Assign Existing Pitchers (Optional)</h3>
                        <p className="text-sm text-gray-600 mb-3">These pitchers are not assigned to any team. Select to add them to this team:</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {unassignedPitchers.map(pitcher => (
                            <label key={pitcher.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPitchersForTeam.includes(pitcher.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPitchersForTeam([...selectedPitchersForTeam, pitcher.id]);
                                  } else {
                                    setSelectedPitchersForTeam(selectedPitchersForTeam.filter(id => id !== pitcher.id));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="text-sm">
                                {pitcher.fullName}, Age {pitcher.age}
                                {pitcher.games && pitcher.games.length > 0 && (
                                  <span className="text-gray-500 ml-2">({pitcher.games.length} games)</span>
                                )}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6 pt-4 pb-16 sticky bottom-0 bg-white border-t">
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
                      {editingTeam ? 'Save Changes' : 'Create Team'}
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
                      onClick={(e) => startEditTeam(team, e)}
                      className="absolute top-4 right-12 text-blue-600 hover:text-blue-800"
                      title="Edit team"
                    >
                      <Edit size={20} />
                    </button>
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
          </>
          )}

          {/* Pitchers Tab */}
          {dashboardTab === 'pitchers' && (
            <>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">All Pitchers ({allPitchers.length})</h1>
              </div>

              {allPitchers.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-4">No pitchers in database. Add pitchers through a team first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allPitchers.map(pitcher => {
                    const pitcherTeams = teams.filter(t => t.pitcherIds.includes(pitcher.id));
                    const hasStats = (pitcher.games && pitcher.games.length > 0) || (pitcher.trainingSessions && pitcher.trainingSessions.length > 0);
                    
                    return (
                      <div key={pitcher.id} className="bg-white rounded-lg p-6 shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{pitcher.fullName}, Age {pitcher.age}</h3>
                            <p className="text-sm text-gray-600">Birthday: {new Date(pitcher.birthday).toLocaleDateString()}</p>
                            {pitcherTeams.length > 0 ? (
                              <p className="text-sm text-blue-600 mt-1">
                                Teams: {pitcherTeams.map(t => t.name).join(', ')}
                              </p>
                            ) : (
                              <p className="text-sm text-orange-600 mt-1">⚠️ Not assigned to any team</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditPitcherDashboard(pitcher)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit pitcher"
                            >
                              <Edit size={20} />
                            </button>
                            <button
                              onClick={() => deletePitcherCompletely(pitcher.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete pitcher"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Pitch Arsenal:</p>
                            <p className="font-semibold">{pitcher.pitchArsenal?.join(', ') || 'None'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Available Today:</p>
                            <p className="font-semibold text-green-600">
                              {pitcherTeams[0] ? calculateAvailablePitches(pitcher, pitcherTeams[0].organization) : 'N/A'} pitches
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Games Played</p>
                            <p className="text-2xl font-bold text-blue-600">{pitcher.games?.length || 0}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-gray-600">Training Sessions</p>
                            <p className="text-2xl font-bold text-purple-600">{pitcher.trainingSessions?.length || 0}</p>
                          </div>
                        </div>

                        {hasStats && (
                          <button
                            onClick={() => deletePitcherStats(pitcher.id)}
                            className="w-full bg-orange-100 text-orange-700 px-4 py-2 rounded hover:bg-orange-200 flex items-center justify-center gap-2"
                          >
                            <Trash2 size={16} />
                            Delete All Stats (Keep Pitcher)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Edit Pitcher Modal */}
          {editingPitcher && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Edit Pitcher</h2>
                  <button onClick={() => setEditingPitcher(null)} className="text-gray-500 hover:text-gray-700">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSavePitcher(editingPitcher);
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editingPitcher.fullName}
                        onChange={(e) => setEditingPitcher({ ...editingPitcher, fullName: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Birthday</label>
                      <input
                        type="date"
                        required
                        value={editingPitcher.birthday}
                        onChange={(e) => setEditingPitcher({ ...editingPitcher, birthday: e.target.value, age: calculateAge(e.target.value) })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Coach Phone</label>
                      <input
                        type="tel"
                        value={editingPitcher.coachPhone || ''}
                        onChange={(e) => setEditingPitcher({ ...editingPitcher, coachPhone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Player Phone</label>
                      <input
                        type="tel"
                        value={editingPitcher.playerPhone || ''}
                        onChange={(e) => setEditingPitcher({ ...editingPitcher, playerPhone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setEditingPitcher(null)}
                      className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Team View
  const TeamView = () => {
    const [showAddPitcher, setShowAddPitcher] = useState(false);
    const [editingPitcher, setEditingPitcher] = useState(null);
    const [teamTab, setTeamTab] = useState('roster'); // 'roster' or 'available'
    const [newPitcher, setNewPitcher] = useState({
      fullName: '',
      birthday: '',
      selectedPitches: [],
      coachPhone: '',
      playerPhone: ''
    });

    const teamPitchers = allPitchers.filter(p => currentTeam.pitcherIds.includes(p.id));

    const startEditPitcher = (pitcher) => {
      setEditingPitcher(pitcher.id);
      setNewPitcher({
        fullName: pitcher.fullName,
        birthday: pitcher.birthday,
        selectedPitches: pitcher.pitchArsenal || [],
        coachPhone: pitcher.coachPhone || '',
        playerPhone: pitcher.playerPhone || ''
      });
      setShowAddPitcher(true);
    };

    const handleAddPitcher = (e) => {
      e.preventDefault();
      
      if (editingPitcher) {
        // Update existing pitcher
        setAllPitchers(allPitchers.map(p => 
          p.id === editingPitcher
            ? {
                ...p,
                fullName: newPitcher.fullName,
                birthday: newPitcher.birthday,
                age: calculateAge(newPitcher.birthday),
                pitchArsenal: newPitcher.selectedPitches,
                coachPhone: newPitcher.coachPhone,
                playerPhone: newPitcher.playerPhone
              }
            : p
        ));
        setEditingPitcher(null);
      } else {
        // Add new pitcher
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
          coachPhone: newPitcher.coachPhone,
          playerPhone: newPitcher.playerPhone,
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
      }
      
      setNewPitcher({ fullName: '', birthday: '', selectedPitches: [], coachPhone: '', playerPhone: '' });
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
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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

          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b">
            <button
              onClick={() => setTeamTab('roster')}
              className={`px-4 py-2 font-semibold ${
                teamTab === 'roster'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📋 Roster
            </button>
            <button
              onClick={() => setTeamTab('available')}
              className={`px-4 py-2 font-semibold ${
                teamTab === 'available'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ⚾ Available Pitchers
            </button>
          </div>

          {teamTab === 'roster' && (
            <>
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
              {teamPitchers.length > 0 && !pausedGame && (
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
              {pausedGame && pausedGame.teamId === currentTeam.id && (
                <button
                  onClick={() => {
                    setGameState(pausedGame);
                    setPausedGame(null);
                    setCurrentView('pitchTracking');
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 animate-pulse"
                >
                  ▶️ Resume Game in Progress
                </button>
              )}
              {pausedGame && pausedGame.teamId !== currentTeam.id && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Game in progress with another team. End that game before starting a new one.
                  </p>
                </div>
              )}
            </div>
          </div>

          {showAddPitcher && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-lg p-6 max-w-md w-full my-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{editingPitcher ? 'Edit Pitcher' : 'Add Pitcher'}</h2>
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
                    <div>
                      <label className="block font-semibold mb-1">Coach Phone (Optional)</label>
                      <input
                        type="tel"
                        placeholder="555-123-4567"
                        value={newPitcher.coachPhone}
                        onChange={(e) => setNewPitcher({ ...newPitcher, coachPhone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                      <p className="text-xs text-gray-600 mt-1">For sending training reports via text</p>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Player Phone (Optional)</label>
                      <input
                        type="tel"
                        placeholder="555-987-6543"
                        value={newPitcher.playerPhone}
                        onChange={(e) => setNewPitcher({ ...newPitcher, playerPhone: e.target.value })}
                        className="w-full border rounded px-3 py-2"
                      />
                      <p className="text-xs text-gray-600 mt-1">For sending training reports via text</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPitcher(false);
                        setNewPitcher({ fullName: '', birthday: '', selectedPitches: [], coachPhone: '', playerPhone: '' });
                      }}
                      className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {editingPitcher ? 'Save Changes' : 'Add to Roster'}
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
                const availablePitches = calculateAvailablePitches(pitcher, currentTeam.organization);
                const trainingLast3Days = getTrainingPitchesLast3Days(pitcher);
                const { pitchesToday, mandatoryRestDays } = getTodaysPitchesAndRest(pitcher, currentTeam.organization);

                return (
                  <div key={pitcher.id} className="bg-white rounded-lg p-4 shadow hover:shadow-lg transition relative">
                    <button
                      onClick={() => startEditPitcher(pitcher)}
                      className="absolute top-4 right-12 text-blue-600 hover:text-blue-800"
                      title="Edit pitcher"
                    >
                      <Edit size={18} />
                    </button>
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
                            Available Today: <span className="text-green-600">{availablePitches} pitches</span>
                          </p>
                          <p>
                            Pitches Today: <span className="text-blue-600">{pitchesToday}</span> | 
                            Mandatory Rest: <span className={mandatoryRestDays === 0 ? 'text-green-600' : mandatoryRestDays >= 4 ? 'text-red-600' : 'text-orange-600'}>
                              {mandatoryRestDays} {mandatoryRestDays === 1 ? 'day' : 'days'}
                            </span>
                          </p>
                          <p>Last 5 Days (Games): {last5Days} pitches</p>
                          <p>Training Last 3 Days: <span className="text-blue-600">{trainingLast3Days} pitches</span></p>
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
            </>
          )}

          {/* Available Pitchers Tab */}
          {teamTab === 'available' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 shadow">
                <h2 className="text-xl font-bold mb-4">Available Pitchers - Ranked</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Ranked by: #1 Available pitches, #2 Strike %, #3 First pitch strike %, #4 Lowest walk %
                </p>

                {(() => {
                  const pitchersWithStats = teamPitchers.map(pitcher => {
                    const available = calculateAvailablePitches(pitcher, currentTeam.organization);
                    const { pitchesToday, mandatoryRestDays } = getTodaysPitchesAndRest(pitcher, currentTeam.organization);
                    
                    let strikePercent = 0;
                    if (pitcher.games && pitcher.games.length > 0) {
                      const totalPitches = pitcher.games.reduce((sum, g) => sum + (g.totalPitches || 0), 0);
                      const totalStrikes = pitcher.games.reduce((sum, g) => sum + (g.strikes || 0), 0);
                      strikePercent = totalPitches > 0 ? (totalStrikes / totalPitches) * 100 : 0;
                    } else if (pitcher.trainingSessions && pitcher.trainingSessions.length > 0) {
                      const allPitches = pitcher.trainingSessions.flatMap(s => s.pitchData || []);
                      const strikes = allPitches.filter(p => p.result === 'strike').length;
                      strikePercent = allPitches.length > 0 ? (strikes / allPitches.length) * 100 : 0;
                    }
                    
                    let firstPitchStrikePercent = 0;
                    if (pitcher.games && pitcher.games.length > 0) {
                      const totalAtBats = pitcher.games.reduce((sum, g) => sum + (g.atBats || 0), 0);
                      const firstPitchStrikes = pitcher.games.reduce((sum, g) => sum + (g.firstPitchStrikes || 0), 0);
                      firstPitchStrikePercent = totalAtBats > 0 ? (firstPitchStrikes / totalAtBats) * 100 : 0;
                    }
                    
                    let walkPercent = 0;
                    if (pitcher.games && pitcher.games.length > 0) {
                      const totalBatters = pitcher.games.reduce((sum, g) => sum + (g.battersFaced || 0), 0);
                      const outs = pitcher.games.reduce((sum, g) => {
                        const innings = g.innings || 0;
                        return sum + (Math.floor(innings) * 3 + Math.round((innings % 1) * 10));
                      }, 0);
                      const ballsInPlay = pitcher.games.reduce((sum, g) => sum + (g.ballsInPlay || 0), 0);
                      const walks = Math.max(0, totalBatters - outs - ballsInPlay);
                      walkPercent = totalBatters > 0 ? (walks / totalBatters) * 100 : 0;
                    }
                    
                    return { pitcher, available, pitchesToday, mandatoryRestDays, strikePercent, firstPitchStrikePercent, walkPercent, hasGameData: pitcher.games && pitcher.games.length > 0 };
                  });

                  const ranked = pitchersWithStats.sort((a, b) => {
                    if (a.available !== b.available) return b.available - a.available;
                    if (Math.abs(a.strikePercent - b.strikePercent) > 0.5) return b.strikePercent - a.strikePercent;
                    if (Math.abs(a.firstPitchStrikePercent - b.firstPitchStrikePercent) > 0.5) return b.firstPitchStrikePercent - a.firstPitchStrikePercent;
                    return a.walkPercent - b.walkPercent;
                  });

                  if (ranked.length === 0) return <div className="text-center py-8 text-gray-500">No pitchers on roster yet.</div>;

                  return (
                    <div className="space-y-3">
                      {ranked.map((stats, index) => (
                        <div key={stats.pitcher.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
                            <div>
                              <h3 className="font-bold text-lg">{stats.pitcher.fullName}, Age {stats.pitcher.age}</h3>
                              <p className="text-sm text-gray-600">{stats.hasGameData ? '📊 Game Stats' : '🏋️ Training Stats'}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">Available Today</p>
                              <p className="text-lg font-bold text-green-600">{stats.available} pitches</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">Pitches Today</p>
                              <p className="text-lg font-bold text-blue-600">{stats.pitchesToday}</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">Mandatory Rest</p>
                              <p className={`text-lg font-bold ${stats.mandatoryRestDays === 0 ? 'text-green-600' : stats.mandatoryRestDays >= 4 ? 'text-red-600' : 'text-orange-600'}`}>
                                {stats.mandatoryRestDays} {stats.mandatoryRestDays === 1 ? 'day' : 'days'}
                              </p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">Strike %</p>
                              <p className="text-lg font-bold"><StrikeBadge percentage={Math.round(stats.strikePercent)} /></p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">First Pitch Strike %</p>
                              <p className="text-lg font-bold text-blue-600">{Math.round(stats.firstPitchStrikePercent)}%</p>
                            </div>
                            <div className="bg-white p-2 rounded">
                              <p className="text-xs text-gray-600">Walk %</p>
                              <p className="text-lg font-bold text-red-600">{Math.round(stats.walkPercent)}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Pitch Tracking
  const PitchTrackingView = () => {
    const [pendingStrikeConfirm, setPendingStrikeConfirm] = React.useState(false);
    const [pendingOutConfirm, setPendingOutConfirm] = React.useState(false);
    
    // Check if a game is currently in progress
    const gameInProgress = gameState && gameState.selectedPitcher && gameState.pitches && gameState.pitches.length > 0;
    
    // Show pitcher selection ONLY if no gameState exists OR if no pitcher selected AND no game in progress
    if (!gameState || (!gameState.selectedPitcher && !gameInProgress)) {
      const availablePitchers = allPitchers.filter(p => {
        if (!currentTeam.pitcherIds.includes(p.id)) return false;
        return calculateAvailablePitches(p, currentTeam.organization) > 0;
      });

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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
              {availablePitchers.map(pitcher => {
                const available = calculateAvailablePitches(pitcher);
                return (
                  <div
                    key={pitcher.id}
                    onClick={() => {
                      // Check if game is in progress (preserve inning and outs count)
                      const gameInProgress = gameState && gameState.pitchers && gameState.pitchers.length > 0;
                      
                      setGameState({
                        ...gameState,
                        selectedPitcher: pitcher.id,
                        pitches: [],
                        batterHand: null,
                        balls: 0,
                        strikes: 0,
                        outs: gameInProgress ? gameState.outs : 0, // Preserve outs if mid-game
                        battersFaced: 0,
                        ballsInPlay: 0,
                        firstPitchStrikes: 0,
                        atBats: 0,
                        threeBallCounts: 0,
                        walks: 0,
                        currentAtBatFirstPitchStrike: false
                      });
                    }}
                    className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition"
                  >
                    <h3 className="font-bold text-lg">{pitcher.fullName}</h3>
                    <p className="text-green-600 font-semibold">Available: {available} pitches</p>
                  </div>
                );
              })}
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
    
    // Safety check: if pitcher not found but game in progress, preserve the game data
    if (!pitcher && gameState.pitches && gameState.pitches.length > 0) {
      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <h2 className="font-bold text-red-900 mb-2">⚠️ Pitcher Data Missing</h2>
              <p className="text-red-700">
                Game in progress but pitcher information not found. Your game data is preserved. 
                Please return to dashboard and ensure the pitcher still exists in the team roster.
              </p>
              <p className="text-sm text-red-600 mt-2">
                Pitches recorded: {gameState.pitches.length} | Outs: {gameState.outs || 0}
              </p>
              <button
                onClick={() => setCurrentView('dashboard')}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    const pitches = gameState.pitches || [];
    const totalPitches = pitches.length;
    const totalStrikes = pitches.filter(p => ['strike', 'ballInPlay', 'out', 'foul'].includes(p.outcome)).length;
    const strikePercent = totalPitches > 0 ? Math.round((totalStrikes / totalPitches) * 100) : 0;

    const rhbPitches = pitches.filter(p => p.batterHand === 'R');
    const rhbStrikes = rhbPitches.filter(p => ['strike', 'ballInPlay', 'out', 'foul'].includes(p.outcome)).length;
    const rhbStrikePercent = rhbPitches.length > 0 ? Math.round((rhbStrikes / rhbPitches.length) * 100) : 0;

    const lhbPitches = pitches.filter(p => p.batterHand === 'L');
    const lhbStrikes = lhbPitches.filter(p => ['strike', 'ballInPlay', 'out', 'foul'].includes(p.outcome)).length;
    const lhbStrikePercent = lhbPitches.length > 0 ? Math.round((lhbStrikes / lhbPitches.length) * 100) : 0;

    const getLast20StrikePercentages = () => {
      const data = [];
      for (let i = 0; i < pitches.length; i++) {
        const start = Math.max(0, i - 19);
        const window = pitches.slice(start, i + 1);
        const windowStrikes = window.filter(p => ['strike', 'ballInPlay', 'out', 'foul'].includes(p.outcome)).length;
        const percent = Math.round((windowStrikes / window.length) * 100);
        data.push({ pitch: i + 1, percent });
      }
      return data.slice(-20);
    };

    const recordPitch = (outcome, metadata = {}) => {
      // Allow non-pitch outs without batter handedness (pickoff, caught stealing before next batter)
      const isNonPitchOut = outcome === 'out' && metadata.outType === 'nonpitch';
      
      if (!gameState.batterHand && !isNonPitchOut) {
        alert('Please select batter handedness first');
        return;
      }

      // Special handling for non-pitch outs (pickoffs, caught stealing, thrown out on bases)
      if (isNonPitchOut) {
        const newOuts = gameState.outs + 1;
        const newBattersFaced = gameState.battersFaced + 1;
        const newAtBats = gameState.atBats + 1;
        
        // Check for end of inning
        if (newOuts > 0 && newOuts % 3 === 0 && window.confirm('End of Inning?')) {
          setGameState({
            ...gameState,
            inning: gameState.inning + 1,
            outs: newOuts,
            battersFaced: newBattersFaced,
            atBats: newAtBats,
            // Reset count for new inning
            balls: 0,
            strikes: 0,
            batterHand: null
          });
          return;
        }
        
        // Not end of inning - just record the out, keep current batter count
        setGameState({
          ...gameState,
          outs: newOuts,
          battersFaced: newBattersFaced,
          atBats: newAtBats
          // Keep balls, strikes, batterHand for current batter
        });
        return;
      }

      const isFirstPitch = gameState.balls === 0 && gameState.strikes === 0;
      const newPitch = { 
        outcome, 
        batterHand: gameState.batterHand, 
        timestamp: Date.now(),
        ...metadata  // strikeType: 'called'/'swinging', outType: 'pitch'
      };
      const updatedPitches = [...pitches, newPitch];

      let newBalls = gameState.balls;
      let newStrikes = gameState.strikes;
      let newOuts = gameState.outs;
      let newBattersFaced = gameState.battersFaced;
      let newBallsInPlay = gameState.ballsInPlay;
      let newFirstPitchStrikes = gameState.firstPitchStrikes;
      let newAtBats = gameState.atBats;
      let newThreeBallCounts = gameState.threeBallCounts;
      let newWalks = gameState.walks || 0;
      let newBatterHand = gameState.batterHand;
      let newCurrentAtBatFirstPitchStrike = gameState.currentAtBatFirstPitchStrike || false;
      
      // Track if this was a first pitch strike - store in gameState to persist across pitches
      if (isFirstPitch && ['strike', 'ballInPlay', 'out', 'foul'].includes(outcome)) {
        newCurrentAtBatFirstPitchStrike = true;
      }
      
      // Track if at-bat will complete (don't update stats mid at-bat)
      let atBatCompletes = false;

      if (outcome === 'ball') {
        newBalls++;
        // Don't increment threeBallCounts yet - wait for at-bat to complete
      } else if (outcome === 'foul') {
        // Foul ball logic:
        // - Always counts as a strike UNLESS already at 2 strikes
        // - On 2 strikes, foul just adds to pitch count (no change to count)
        if (newStrikes < 2) {
          newStrikes++;
        }
        // Foul ball never completes an at-bat
      } else if (outcome === 'strike') {
        newStrikes++;
        // Don't increment firstPitchStrikes yet - wait for at-bat to complete
      }
      // Note: 'ballInPlay' and 'out' handled below and don't increment strikes

      if (outcome === 'ballInPlay') {
        newBallsInPlay++;
        newBattersFaced++;
        newAtBats++;
        atBatCompletes = true;
        
        // NOW update stats since at-bat is complete
        if (newCurrentAtBatFirstPitchStrike) newFirstPitchStrikes++;
        if (newBalls === 3) newThreeBallCounts++;
        
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
        newCurrentAtBatFirstPitchStrike = false; // Reset for next at-bat
      } else if (outcome === 'out') {
        newOuts++;
        newBattersFaced++;
        newAtBats++;
        atBatCompletes = true;
        
        // NOW update stats since at-bat is complete
        if (newCurrentAtBatFirstPitchStrike) newFirstPitchStrikes++;
        if (newBalls === 3) newThreeBallCounts++;
        
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
        newCurrentAtBatFirstPitchStrike = false; // Reset for next at-bat
        
        if (newOuts > 0 && newOuts % 3 === 0 && window.confirm('End of Inning?')) {
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
            batterHand: newBatterHand,
            currentAtBatFirstPitchStrike: newCurrentAtBatFirstPitchStrike
          });
          return;
        }
      } else if (newStrikes >= 3) {
        // Strikeout - but could be uncaught third strike
        const currentOuts = newOuts; // Store outs before potential increment
        
        // Ask if batter reached on uncaught third strike
        let reachedBase = false;
        if (currentOuts === 2) {
          // Two outs - ask if this is end of inning
          const message = 'Strikeout with 2 outs.\n\nClick "OK" if batter is OUT (end of inning)\nClick "Cancel" if batter REACHED base (uncaught third strike)';
          reachedBase = !window.confirm(message);
        } else {
          // Less than 2 outs - ask if batter reached
          const message = 'Strikeout!\n\nClick "OK" if batter REACHED base (uncaught third strike)\nClick "Cancel" if batter is OUT';
          reachedBase = window.confirm(message);
        }
        
        if (reachedBase) {
          // Uncaught third strike - batter reached base (treat like ball in play, no out)
          newBallsInPlay++;
          newBattersFaced++;
          newAtBats++;
          atBatCompletes = true;
          
          // Update stats since at-bat is complete
          if (newCurrentAtBatFirstPitchStrike) newFirstPitchStrikes++;
          if (newBalls === 3) newThreeBallCounts++;
          
          newBalls = 0;
          newStrikes = 0;
          newBatterHand = null;
          newCurrentAtBatFirstPitchStrike = false; // Reset for next at-bat
        } else {
          // Normal strikeout - batter is out
          newOuts++;
          newBattersFaced++;
          newAtBats++;
          atBatCompletes = true;
          
          // NOW update stats since at-bat is complete
          if (newCurrentAtBatFirstPitchStrike) newFirstPitchStrikes++;
          if (newBalls === 3) newThreeBallCounts++;
          
          newBalls = 0;
          newStrikes = 0;
          newBatterHand = null;
          newCurrentAtBatFirstPitchStrike = false; // Reset for next at-bat
          
          // Check for end of inning (after confirming the out)
          if (newOuts > 0 && newOuts % 3 === 0 && window.confirm('End of Inning?')) {
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
              batterHand: newBatterHand,
              currentAtBatFirstPitchStrike: newCurrentAtBatFirstPitchStrike
            });
            return;
          }
        }
      } else if (newBalls >= 4) {
        newBattersFaced++;
        newAtBats++;
        newWalks++; // Walk issued
        atBatCompletes = true;
        
        // NOW update stats since at-bat is complete
        if (newCurrentAtBatFirstPitchStrike) newFirstPitchStrikes++;
        if (newBalls === 3) newThreeBallCounts++;  // Was 3 before the 4th ball
        
        newBalls = 0;
        newStrikes = 0;
        newBatterHand = null;
        newCurrentAtBatFirstPitchStrike = false; // Reset for next at-bat
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
        walks: newWalks,
        batterHand: newBatterHand,
        currentAtBatFirstPitchStrike: newCurrentAtBatFirstPitchStrike
      });
    };

    const undoLastPitch = () => {
      if (pitches.length === 0) return;
      
      // Remove last pitch
      const newPitches = pitches.slice(0, -1);
      
      // Recalculate entire game state from scratch
      let balls = 0;
      let strikes = 0;
      let outs = 0;
      let battersFaced = 0;
      let ballsInPlay = 0;
      let firstPitchStrikes = 0;
      let atBats = 0;
      let threeBallCounts = 0;
      let batterHand = null;
      let inning = 1;
      let wasFirstPitchStrike = false; // Track if current at-bat started with strike
      
      newPitches.forEach((pitch, idx) => {
        const isFirstPitch = balls === 0 && strikes === 0;
        
        // Track if THIS pitch is a first pitch strike
        if (isFirstPitch && ['strike', 'ballInPlay', 'out', 'foul'].includes(pitch.outcome)) {
          wasFirstPitchStrike = true;
        }
        
        if (pitch.outcome === 'ball') {
          balls++;
          if (balls >= 4) {
            // Walk - at-bat completes
            if (balls === 4 && wasFirstPitchStrike) firstPitchStrikes++;
            if (balls === 4) threeBallCounts++;
            battersFaced++;
            atBats++;
            balls = 0;
            strikes = 0;
            batterHand = null;
            wasFirstPitchStrike = false;
          }
        } else if (pitch.outcome === 'foul') {
          // Foul ball logic
          if (strikes < 2) {
            strikes++;
          }
          // Foul never completes at-bat
        } else if (pitch.outcome === 'strike') {
          strikes++;
          // Strike increments count, at-bat continues
        } else if (pitch.outcome === 'ballInPlay') {
            // Ball in play - at-bat completes
            if (wasFirstPitchStrike) firstPitchStrikes++;
            if (balls === 3) threeBallCounts++;
            ballsInPlay++;
            battersFaced++;
            atBats++;
            balls = 0;
            strikes = 0;
            batterHand = null;
            wasFirstPitchStrike = false;
          } else if (pitch.outcome === 'out') {
            // Out recorded - at-bat completes
            if (wasFirstPitchStrike) firstPitchStrikes++;
            if (balls === 3) threeBallCounts++;
            outs++;
            battersFaced++;
            atBats++;
            balls = 0;
            strikes = 0;
            batterHand = null;
            wasFirstPitchStrike = false;
            
            // Check for inning changes
            if (outs % 3 === 0) {
              inning++;
            }
          } else if (pitch.outcome === 'strike' && strikes >= 3) {
            // Strikeout (after strike was counted above) - at-bat completes
            if (wasFirstPitchStrike) firstPitchStrikes++;
            if (balls === 3) threeBallCounts++;
            outs++;
            battersFaced++;
            atBats++;
            balls = 0;
            strikes = 0;
            batterHand = null;
            wasFirstPitchStrike = false;
            
            // Check for inning changes
            if (outs % 3 === 0) {
              inning++;
            }
          }
        
        // Keep track of current batter hand for UI
        if (pitch.batterHand && balls < 4 && strikes < 3) {
          batterHand = pitch.batterHand;
        }
      });
      
      setGameState({
        ...gameState,
        pitches: newPitches,
        balls,
        strikes,
        outs,
        battersFaced,
        ballsInPlay,
        firstPitchStrikes,
        atBats,
        threeBallCounts,
        batterHand,
        inning
      });
    };

    const endInning = () => {
      setGameState({ 
        ...gameState, 
        inning: gameState.inning + 1,
        outs: Math.ceil(gameState.outs / 3) * 3, // Round up to next multiple of 3
        balls: 0,
        strikes: 0,
        batterHand: null
      });
    };

    const endOuting = () => {
      // Calculate innings in baseball notation: full innings + partial
      const fullInnings = Math.floor(gameState.outs / 3);
      const partialOuts = gameState.outs % 3;
      let innings;
      
      if (partialOuts === 0) {
        innings = fullInnings.toString();
      } else if (partialOuts === 1) {
        innings = fullInnings + '+';
      } else { // partialOuts === 2
        innings = fullInnings + '++';
      }
      
      // Calculate swinging vs called strikes
      const swingingStrikes = pitches.filter(p => 
        (p.outcome === 'strike' && p.strikeType === 'swinging') || 
        (p.outcome === 'foul')  // Fouls always count as swinging
      ).length;
      
      const calledStrikes = pitches.filter(p => 
        p.outcome === 'strike' && p.strikeType === 'called'
      ).length;
      
      const { pitchesToday, pitchesYesterday } = getTodaysPitchesAndRest(pitcher, currentTeam.organization);
      const { remaining: pitchesUntilRest } = getPitchesUntilNextThreshold(
        totalPitches, 
        pitchesYesterday, 
        pitcher.age, 
        currentTeam.organization
      );
      
      // Calculate mandatory rest based on consecutive days
      let mandatoryRestDays = 0;
      if (pitchesYesterday > 0) {
        // Day 2 consecutive - use combined total
        const totalTwoDays = pitchesYesterday + totalPitches;
        mandatoryRestDays = getRequiredRestDays(totalTwoDays, pitcher.age, currentTeam.organization);
        mandatoryRestDays = Math.max(mandatoryRestDays, 1); // Minimum 1 day after 2 consecutive
      } else {
        // Single day
        mandatoryRestDays = getRequiredRestDays(totalPitches, pitcher.age, currentTeam.organization);
      }
      
      const gameData = {
        date: new Date().toISOString(),
        teamId: currentTeam.id,
        totalPitches: totalPitches,
        innings: innings, // String format: "2", "2+", "2++"
        outs: gameState.outs, // For calculations
        strikePercent,
        battersFaced: gameState.battersFaced,
        strikes: totalStrikes,
        swingingStrikes,
        calledStrikes,
        lhbPitches: lhbPitches.length,
        lhbStrikes,
        rhbPitches: rhbPitches.length,
        rhbStrikes,
        ballsInPlay: gameState.ballsInPlay,
        firstPitchStrikes: gameState.firstPitchStrikes,
        threeBallCounts: gameState.threeBallCounts,
        walks: gameState.walks || 0,
        walkPercent: gameState.battersFaced > 0 ? Math.round((gameState.walks / gameState.battersFaced) * 100) : 0,
        pitchesUntilRest,
        mandatoryRestDays
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
        walks: 0,
        currentAtBatFirstPitchStrike: false,
        pitchers: [...(gameState.pitchers || []), { pitcher: updatedPitcher, gameData }]
      });
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => recordPitch('ball')} className="bg-red-500 text-white py-3 rounded-lg font-bold text-base hover:bg-red-600">BALL</button>
            <button onClick={() => setPendingStrikeConfirm(true)} className="bg-green-500 text-white py-3 rounded-lg font-bold text-base hover:bg-green-600">STRIKE</button>
            <button onClick={() => recordPitch('ballInPlay')} className="bg-blue-500 text-white py-3 rounded-lg font-bold text-base hover:bg-blue-600">BATTER REACHED SAFELY</button>
            <button onClick={() => setPendingOutConfirm(true)} className="bg-purple-500 text-white py-3 rounded-lg font-bold text-base hover:bg-purple-600">OUT</button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={undoLastPitch} className="bg-yellow-500 text-white py-2 rounded-lg font-semibold text-sm hover:bg-yellow-600">↶ UNDO</button>
            <button onClick={() => recordPitch('foul', { strikeType: 'swinging' })} className="bg-orange-400 text-white py-2 rounded-lg font-semibold text-sm hover:bg-orange-500">FOUL BALL</button>
          </div>
          
          {/* Strike Type Confirmation Dialog */}
          {pendingStrikeConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-xl font-bold mb-4 text-center">Strike Type?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      recordPitch('strike', { strikeType: 'called' });
                      setPendingStrikeConfirm(false);
                    }}
                    className="bg-blue-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-blue-700"
                  >
                    Called Strike
                  </button>
                  <button
                    onClick={() => {
                      recordPitch('strike', { strikeType: 'swinging' });
                      setPendingStrikeConfirm(false);
                    }}
                    className="bg-green-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-green-700"
                  >
                    Swinging Strike
                  </button>
                </div>
                <button
                  onClick={() => setPendingStrikeConfirm(false)}
                  className="w-full mt-3 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {/* Out Type Confirmation Dialog */}
          {pendingOutConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                <h3 className="text-xl font-bold mb-4 text-center">How was the out recorded?</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      recordPitch('out', { outType: 'pitch' });
                      setPendingOutConfirm(false);
                    }}
                    className="bg-purple-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-purple-700"
                  >
                    Out on a Pitch
                  </button>
                  <button
                    onClick={() => {
                      recordPitch('out', { outType: 'nonpitch' });
                      setPendingOutConfirm(false);
                    }}
                    className="bg-orange-600 text-white py-4 px-4 rounded-lg font-bold hover:bg-orange-700"
                  >
                    Thrown Out / Picked Off
                    <span className="block text-xs font-normal mt-1">(pickoff, caught stealing, out on bases)</span>
                  </button>
                </div>
                <button
                  onClick={() => setPendingOutConfirm(false)}
                  className="w-full mt-3 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={endInning} className="bg-gray-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-gray-700">END INNING</button>
            <button onClick={endOuting} className="bg-orange-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-orange-700">END OUTING</button>
          </div>

          <div className="bg-white rounded-lg p-4 shadow mb-4">
            <h3 className="font-bold mb-3">Live Stats</h3>
            <div className="space-y-2 text-sm">
              <p>Count: {gameState.balls}-{gameState.strikes} | Pitches: {totalPitches} | Strikes: <StrikeBadge percentage={strikePercent} /> | BIP: {gameState.ballsInPlay}</p>
              <p>1st Pitch Strikes: {gameState.firstPitchStrikes}/{gameState.atBats} ({gameState.atBats > 0 ? Math.round((gameState.firstPitchStrikes/gameState.atBats)*100) : 0}%) | 3-Ball Counts: {gameState.threeBallCounts}</p>
              <p>Walks: {gameState.walks || 0} | Walk %: {gameState.battersFaced > 0 ? Math.round(((gameState.walks || 0) / gameState.battersFaced) * 100) : 0}%</p>
              <p>vs RHB: <StrikeBadge percentage={rhbStrikePercent} /> | vs LHB: <StrikeBadge percentage={lhbStrikePercent} /></p>
              {(() => {
                const { pitchesToday, pitchesYesterday } = getTodaysPitchesAndRest(pitcher, currentTeam.organization);
                const { remaining, atMax, isConsecutiveDay, nextThreshold } = getPitchesUntilNextThreshold(
                  totalPitches, 
                  pitchesYesterday, 
                  pitcher.age, 
                  currentTeam.organization
                );
                
                const displayColor = atMax ? 'text-red-600 font-bold' :
                                    remaining <= 5 ? 'text-orange-600 font-semibold' :
                                    'text-green-600';
                
                let displayText = '';
                if (atMax) {
                  displayText = 'MAXIMUM REACHED - Cannot pitch more';
                } else if (isConsecutiveDay) {
                  displayText = `${remaining} pitches remaining before MAX (Day 2 consecutive - MUST REST tomorrow)`;
                } else if (nextThreshold) {
                  displayText = `${remaining} pitches until next rest level (${nextThreshold} pitches)`;
                } else {
                  displayText = `${remaining} pitches remaining before MAX`;
                }
                
                return (
                  <p className={displayColor}>
                    {displayText}
                  </p>
                );
              })()}
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
        
        {/* Game Control Buttons - Replace bottom nav during game */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg z-50">
          <div className="max-w-4xl mx-auto flex gap-3 p-3">
            <button
              onClick={() => {
                if (window.confirm('Pause this game? You can resume it later from the dashboard.')) {
                  setPausedGame({
                    ...gameState,
                    pausedAt: new Date().toISOString()
                  });
                  setGameState(null);
                  setCurrentView('dashboard');
                }
              }}
              className="flex-1 bg-yellow-500 text-white px-4 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
            >
              ⏸️ Pause Game
            </button>
            <button
              onClick={() => setCurrentView('gameEnd')}
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold"
            >
              🛑 End Game
            </button>
          </div>
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
      outs: acc.outs + (p.gameData.outs || 0), // Use saved outs count
      rhbPitches: acc.rhbPitches + p.gameData.rhbPitches,
      rhbStrikes: acc.rhbStrikes + p.gameData.rhbStrikes,
      lhbPitches: acc.lhbPitches + p.gameData.lhbPitches,
      lhbStrikes: acc.lhbStrikes + p.gameData.lhbStrikes
    }), { totalPitches: 0, strikes: 0, battersFaced: 0, outs: 0, rhbPitches: 0, rhbStrikes: 0, lhbPitches: 0, lhbStrikes: 0 });

    const teamStrikePercent = teamTotals.totalPitches > 0 ? Math.round((teamTotals.strikes / teamTotals.totalPitches) * 100) : 0;
    const teamRhbPercent = teamTotals.rhbPitches > 0 ? Math.round((teamTotals.rhbStrikes / teamTotals.rhbPitches) * 100) : 0;
    const teamLhbPercent = teamTotals.lhbPitches > 0 ? Math.round((teamTotals.lhbStrikes / teamTotals.lhbPitches) * 100) : 0;

    const teamPitchers = allPitchers.filter(p => currentTeam.pitcherIds.includes(p.id));
    const unavailableToday = teamPitchers.filter(p => calculateAvailablePitches(p, currentTeam.organization) <= 0);
    const availableToday = teamPitchers.filter(p => calculateAvailablePitches(p, currentTeam.organization) > 0);

    // Generate game report text
    const generateGameReport = () => {
      let report = 'GAME SUMMARY REPORT\n';
      report += `Team: ${currentTeam.name}\n`;
      report += `Date: ${new Date().toLocaleDateString()}\n\n`;
      
      report += 'TEAM PITCHING TOTALS:\n';
      report += `Total Pitches: ${teamTotals.totalPitches}\n`;
      report += `Strike %: ${teamStrikePercent}%\n`;
      report += `Batters Faced: ${teamTotals.battersFaced}\n`;
      report += `Outs Recorded: ${teamTotals.outs}\n`;
      report += `vs RHB: ${teamRhbPercent}% | vs LHB: ${teamLhbPercent}%\n\n`;
      
      report += 'INDIVIDUAL PITCHER LINES:\n';
      gamePitchers.forEach(p => {
        report += `${p.pitcher.fullName}: ${p.gameData.totalPitches} pitches | ${p.gameData.innings} IP | ${p.gameData.strikePercent}% strikes\n`;
      });
      report += '\n';
      
      report += 'PITCHER AVAILABILITY:\n\n';
      
      if (unavailableToday.length > 0) {
        report += 'NEEDS REST:\n';
        unavailableToday.forEach(p => {
          const lastGame = p.games?.[p.games.length - 1];
          const pitchCount = lastGame?.totalPitches || 0;
          const restDays = getRequiredRestDays(pitchCount, p.age, currentTeam.organization);
          const nextAvailable = new Date();
          nextAvailable.setDate(nextAvailable.getDate() + restDays);
          report += `• ${p.fullName}\n  Last outing: ${pitchCount} pitches\n  Rest required: ${restDays} days\n  Next available: ${nextAvailable.toLocaleDateString()}\n\n`;
        });
      }
      
      if (availableToday.length > 0) {
        report += 'AVAILABLE NOW:\n';
        availableToday.forEach(p => {
          const available = calculateAvailablePitches(p, currentTeam.organization);
          report += `• ${p.fullName} - ${available} pitches available\n`;
        });
      }
      
      return report;
    };

    const shareGameReport = () => {
      const report = generateGameReport();
      
      if (navigator.share) {
        navigator.share({
          title: 'Game Summary Report',
          text: report
        }).catch((error) => {
          if (error.name !== 'AbortError') {
            alert('Could not share. Please try copy to clipboard instead.');
          }
        });
      } else {
        alert('Share not supported on this device. Use "Copy to Clipboard" instead.');
      }
    };

    const textCoach1 = () => {
      if (!currentTeam.coach1Phone) {
        alert('No Coach 1 phone number on file for this team.');
        return;
      }
      
      const report = generateGameReport();
      const smsUrl = `sms:${currentTeam.coach1Phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(report)}`;
      window.location.href = smsUrl;
    };

    const textCoach2 = () => {
      if (!currentTeam.coach2Phone) {
        alert('No Coach 2 phone number on file for this team.');
        return;
      }
      
      const report = generateGameReport();
      const smsUrl = `sms:${currentTeam.coach2Phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(report)}`;
      window.location.href = smsUrl;
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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
            <div className="space-y-3">
              {gamePitchers.map((p, i) => (
                <div key={i} className="border-b pb-2 last:border-b-0">
                  <p className="text-sm font-semibold">
                    {p.pitcher.fullName}: {p.gameData.totalPitches} pitches | {p.gameData.innings} IP | <StrikeBadge percentage={p.gameData.strikePercent} />
                  </p>
                  {(p.gameData.swingingStrikes || p.gameData.calledStrikes) && (
                    <p className="text-xs text-gray-600 mt-1">
                      Strike Details: {p.gameData.swingingStrikes || 0} Swinging | {p.gameData.calledStrikes || 0} Called
                    </p>
                  )}
                  {(p.gameData.walks !== undefined || p.gameData.walkPercent !== undefined) && (
                    <p className="text-xs text-gray-600 mt-1">
                      Walks: {p.gameData.walks || 0} | Walk %: {p.gameData.walkPercent || 0}%
                    </p>
                  )}
                  {p.gameData.mandatoryRestDays !== undefined && (
                    <p className={`text-xs mt-1 font-semibold ${p.gameData.mandatoryRestDays === 0 ? 'text-green-600' : p.gameData.mandatoryRestDays >= 4 ? 'text-red-600' : 'text-orange-600'}`}>
                      Mandatory Rest: {p.gameData.mandatoryRestDays} {p.gameData.mandatoryRestDays === 1 ? 'day' : 'days'} 
                      {p.gameData.pitchesUntilRest === 0 && ' (AT THRESHOLD)'}
                    </p>
                  )}
                  {p.gameData.pitchesUntilRest !== undefined && p.gameData.pitchesUntilRest > 0 && (
                    <p className={`text-xs mt-1 ${p.gameData.pitchesUntilRest <= 5 ? 'text-orange-600 font-semibold' : 'text-green-600'}`}>
                      Pitches Until Next Rest Threshold: {p.gameData.pitchesUntilRest}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow mb-4">
            <h2 className="text-xl font-bold mb-4">Pitcher Availability</h2>
            
            {unavailableToday.length > 0 && (
              <>
                <h3 className="font-semibold mb-2 text-red-600">Needs Rest:</h3>
                <div className="space-y-2 mb-4">
                  {unavailableToday.map(p => {
                    const lastGame = p.games?.[p.games.length - 1];
                    const pitchCount = lastGame?.totalPitches || 0;
                    const restDays = getRequiredRestDays(pitchCount, p.age, currentTeam.organization);
                    const nextAvailable = new Date();
                    nextAvailable.setDate(nextAvailable.getDate() + restDays);
                    
                    return (
                      <div key={p.id} className="bg-red-50 p-3 rounded border border-red-200">
                        <p className="font-semibold text-red-800">• {p.fullName}</p>
                        <p className="text-sm text-red-700">Last outing: {pitchCount} pitches</p>
                        <p className="text-sm text-red-700">Rest required: {restDays} days</p>
                        <p className="text-sm font-semibold text-red-900">Next available: {nextAvailable.toLocaleDateString()}</p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            
            {availableToday.length > 0 && (
              <>
                <h3 className="font-semibold mb-2 text-green-600">Available Now:</h3>
                <div className="space-y-1 mb-4">
                  {availableToday.map(p => {
                    const available = calculateAvailablePitches(p, currentTeam.organization);
                    return (
                      <p key={p.id} className="text-sm text-green-600">
                        • {p.fullName} - {available} pitches available
                      </p>
                    );
                  })}
                </div>
              </>
            )}
            
            <button 
              onClick={() => {
                let report = `GAME SUMMARY REPORT\nTeam: ${currentTeam.name}\nDate: ${new Date().toLocaleDateString()}\n\n`;
                
                // Team totals
                report += 'TEAM PITCHING TOTALS:\n';
                report += `Total Pitches: ${teamTotals.totalPitches}\n`;
                report += `Strike %: ${teamStrikePercent}%\n`;
                report += `Batters Faced: ${teamTotals.battersFaced}\n`;
                report += `Outs Recorded: ${teamTotals.outs}\n`;
                report += `vs RHB: ${teamRhbPercent}% | vs LHB: ${teamLhbPercent}%\n\n`;
                
                // Individual pitcher lines
                report += 'INDIVIDUAL PITCHER LINES:\n';
                gamePitchers.forEach(p => {
                  report += `${p.pitcher.fullName}: ${p.gameData.totalPitches} pitches | ${p.gameData.innings} IP | ${p.gameData.strikePercent}% strikes\n`;
                });
                report += '\n';
                
                // Availability
                report += 'PITCHER AVAILABILITY:\n\n';
                
                if (unavailableToday.length > 0) {
                  report += 'NEEDS REST:\n';
                  unavailableToday.forEach(p => {
                    const lastGame = p.games?.[p.games.length - 1];
                    const pitchCount = lastGame?.totalPitches || 0;
                    const restDays = pitchCount >= 51 ? 3 : pitchCount >= 36 ? 2 : 1;
                    const nextAvailable = new Date();
                    nextAvailable.setDate(nextAvailable.getDate() + restDays);
                    report += `• ${p.fullName}\n  Last outing: ${pitchCount} pitches\n  Rest required: ${restDays} days\n  Next available: ${nextAvailable.toLocaleDateString()}\n\n`;
                  });
                }
                
                if (availableToday.length > 0) {
                  report += 'AVAILABLE NOW:\n';
                  availableToday.forEach(p => {
                    const available = calculateAvailablePitches(p, currentTeam.organization);
                    report += `• ${p.fullName} - ${available} pitches available\n`;
                  });
                }
                
                navigator.clipboard.writeText(report).then(() => {
                  alert('Complete game report copied to clipboard!');
                }).catch(() => {
                  alert('Could not copy to clipboard. Please try again.');
                });
              }}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-3"
            >
              📋 Copy Complete Game Report
            </button>

            <button onClick={shareGameReport} className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 mb-3">
              📤 Share Report
            </button>

            {currentTeam.coach1Phone && (
              <button onClick={textCoach1} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
                💬 Text {currentTeam.coach1Name || 'Coach 1'} ({currentTeam.coach1Phone})
              </button>
            )}

            {currentTeam.coach2Phone && (
              <button onClick={textCoach2} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
                💬 Text {currentTeam.coach2Name || 'Coach 2'} ({currentTeam.coach2Phone})
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setGameState(null);
              setCurrentView('dashboard');
            }}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700"
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
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [targetPitches, setTargetPitches] = useState(25);
    const [sessionActive, setSessionActive] = useState(false);
    const [sessionPitches, setSessionPitches] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [coachNotes, setCoachNotes] = useState('');
    const [showSummary, setShowSummary] = useState(false);
    const [pendingPitch, setPendingPitch] = useState(null);

    const selectPitchType = (pitchType) => {
      setPendingPitch(pitchType);
    };

    const recordPitchOutcome = (outcome) => {
      if (!pendingPitch) return;
      
      const newPitch = { type: pendingPitch, outcome, timestamp: Date.now() };
      const updated = [...sessionPitches, newPitch];
      setSessionPitches(updated);
      setPendingPitch(null);

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

    const copyTrainingReport = () => {
      const stats = getSessionStats(sessionPitches);
      const report = `TRAINING SESSION REPORT
Date: ${new Date().toLocaleDateString()}
Pitcher: ${selectedPitcher.fullName}

Total Pitches: ${stats.total}/${targetPitches}
Overall Strike %: ${stats.strikePercent}%

BY PITCH TYPE:
${Object.entries(stats.byPitchType)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
  .map(([type, data]) => `${type}: ${data.count} pitches, ${data.strikePercent}% strikes`)
  .join('\n')}

${coachNotes ? `COACH NOTES:\n${coachNotes}` : ''}`;
      
      navigator.clipboard.writeText(report).then(() => {
        alert('Report copied to clipboard! You can now paste it into a text message.');
      }).catch(() => {
        alert('Could not copy to clipboard. Please try again.');
      });
    };

    const shareTrainingReport = () => {
      const stats = getSessionStats(sessionPitches);
      const report = `TRAINING SESSION REPORT
Date: ${new Date().toLocaleDateString()}
Pitcher: ${selectedPitcher.fullName}

Total Pitches: ${stats.total}/${targetPitches}
Overall Strike %: ${stats.strikePercent}%

BY PITCH TYPE:
${Object.entries(stats.byPitchType)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
  .map(([type, data]) => `${type}: ${data.count} pitches, ${data.strikePercent}% strikes`)
  .join('\n')}

${coachNotes ? `COACH NOTES:\n${coachNotes}` : ''}`;

      if (navigator.share) {
        navigator.share({
          title: 'Training Session Report',
          text: report
        }).catch((error) => {
          if (error.name !== 'AbortError') {
            alert('Could not share. Please try copy to clipboard instead.');
          }
        });
      } else {
        alert('Share not supported on this device. Use "Copy to Clipboard" instead.');
      }
    };

    const textCoach1 = () => {
      if (!selectedTeam || !selectedTeam.coach1Phone) {
        alert('No Coach 1 phone number on file for this team.');
        return;
      }
      const stats = getSessionStats(sessionPitches);
      const report = `TRAINING SESSION REPORT
Date: ${new Date().toLocaleDateString()}
Team: ${selectedTeam.name}
Pitcher: ${selectedPitcher.fullName}

Total Pitches: ${stats.total}/${targetPitches}
Overall Strike %: ${stats.strikePercent}%

BY PITCH TYPE:
${Object.entries(stats.byPitchType)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
  .map(([type, data]) => `${type}: ${data.count} pitches, ${data.strikePercent}% strikes`)
  .join('\n')}

${coachNotes ? `COACH NOTES:\n${coachNotes}` : ''}`;

      const smsUrl = `sms:${selectedTeam.coach1Phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(report)}`;
      window.location.href = smsUrl;
    };

    const textCoach2 = () => {
      if (!selectedTeam || !selectedTeam.coach2Phone) {
        alert('No Coach 2 phone number on file for this team.');
        return;
      }
      const stats = getSessionStats(sessionPitches);
      const report = `TRAINING SESSION REPORT
Date: ${new Date().toLocaleDateString()}
Team: ${selectedTeam.name}
Pitcher: ${selectedPitcher.fullName}

Total Pitches: ${stats.total}/${targetPitches}
Overall Strike %: ${stats.strikePercent}%

BY PITCH TYPE:
${Object.entries(stats.byPitchType)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
  .map(([type, data]) => `${type}: ${data.count} pitches, ${data.strikePercent}% strikes`)
  .join('\n')}

${coachNotes ? `COACH NOTES:\n${coachNotes}` : ''}`;

      const smsUrl = `sms:${selectedTeam.coach2Phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(report)}`;
      window.location.href = smsUrl;
    };

    const textPlayer = () => {
      if (!selectedPitcher.playerPhone) {
        alert('No player phone number on file. Please add it to the pitcher profile.');
        return;
      }
      const stats = getSessionStats(sessionPitches);
      const report = `TRAINING SESSION REPORT
Date: ${new Date().toLocaleDateString()}
Team: ${selectedTeam?.name || 'Training'}
Pitcher: ${selectedPitcher.fullName}

Total Pitches: ${stats.total}/${targetPitches}
Overall Strike %: ${stats.strikePercent}%

BY PITCH TYPE:
${Object.entries(stats.byPitchType)
  .filter(([_, data]) => data.count > 0)
  .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
  .map(([type, data]) => `${type}: ${data.count} pitches, ${data.strikePercent}% strikes`)
  .join('\n')}

${coachNotes ? `COACH NOTES:\n${coachNotes}` : ''}`;

      const smsUrl = `sms:${selectedPitcher.playerPhone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(report)}`;
      window.location.href = smsUrl;
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
        <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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

            <button onClick={copyTrainingReport} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 mb-3">
              📋 Copy Report to Clipboard
            </button>

            <button onClick={shareTrainingReport} className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-purple-700 mb-3">
              📤 Share Report
            </button>

            {selectedTeam?.coach1Phone && (
              <button onClick={textCoach1} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
                💬 Text {selectedTeam.coach1Name || 'Coach 1'} ({selectedTeam.coach1Phone})
              </button>
            )}

            {selectedTeam?.coach2Phone && (
              <button onClick={textCoach2} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
                💬 Text {selectedTeam.coach2Name || 'Coach 2'} ({selectedTeam.coach2Phone})
              </button>
            )}

            {selectedPitcher.playerPhone && (
              <button onClick={textPlayer} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 mb-3">
                💬 Text Player ({selectedPitcher.playerPhone})
              </button>
            )}

            <button onClick={saveSummary} className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-700 mb-3">
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
        <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">{selectedPitcher.fullName}</h2>
              <p className={`text-lg ${progressText}`}>Progress: {stats.total}/{targetPitches} pitches (Max: 60)</p>
              <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                <div className={`${progressColor} h-4 rounded-full transition-all`} style={{ width: `${Math.min((stats.total / 60) * 100, 100)}%` }} />
              </div>
            </div>

            {pendingPitch ? (
              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-lg mb-3 text-center">Selected: {pendingPitch}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button 
                    onClick={() => recordPitchOutcome('strike')} 
                    className="bg-green-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-green-600"
                  >
                    STRIKE
                  </button>
                  <button 
                    onClick={() => recordPitchOutcome('ball')} 
                    className="bg-red-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-red-600"
                  >
                    BALL
                  </button>
                  <button 
                    onClick={() => setPendingPitch(null)} 
                    className="bg-gray-500 text-white py-6 rounded-lg font-bold text-xl hover:bg-gray-600"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 shadow mb-4">
                <h3 className="font-bold mb-3">Select Pitch Type</h3>
                <div className="grid grid-cols-4 gap-2">
                  {pitchTypes.map(type => (
                    <button key={type} onClick={() => selectPitchType(type)} className="bg-blue-500 text-white py-3 rounded hover:bg-blue-600 text-sm font-semibold">
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Training Control Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-300 shadow-lg z-50">
              <div className="max-w-4xl mx-auto flex gap-3 p-3">
                <button
                  onClick={() => {
                    if (window.confirm('Pause this training session? You can resume it later.')) {
                      setPausedTraining({
                        selectedPitcher,
                        selectedTeam,
                        targetPitches,
                        sessionPitches,
                        pausedAt: new Date().toISOString()
                      });
                      setSelectedPitcher(null);
                      setSessionActive(false);
                      setSessionPitches([]);
                    }
                  }}
                  className="flex-1 bg-yellow-500 text-white px-4 py-3 rounded-lg hover:bg-yellow-600 font-semibold"
                >
                  ⏸️ Pause Training
                </button>
                <button
                  onClick={() => endTrainingSession()}
                  className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-semibold"
                >
                  🛑 End Training
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (showHistory && selectedPitcher) {
      const sessions = selectedPitcher.trainingSessions || [];

      return (
        <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
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
                    <p>Overall Strike %: <StrikeBadge percentage={stats.strikePercent} /></p>
                    
                    <div className="mt-3 border-t pt-2">
                      <p className="font-semibold text-sm mb-1">By Pitch Type:</p>
                      {Object.entries(stats.byPitchType)
                        .filter(([_, data]) => data.count > 0)
                        .sort((a, b) => b[1].strikePercent - a[1].strikePercent)
                        .map(([type, data]) => (
                          <p key={type} className="text-sm">
                            • {type}: {data.count} pitches, <StrikeBadge percentage={data.strikePercent} />
                          </p>
                        ))}
                    </div>
                    
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
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Training</h1>

          {!selectedPitcher ? (
            <>
              <h2 className="text-xl font-bold mb-4">Select Pitcher</h2>
              <div className="space-y-3">
                {(() => {
                  // Deduplicate pitchers
                  const uniquePitchers = allPitchers.reduce((acc, pitcher) => {
                    if (!acc.find(p => p.id === pitcher.id)) {
                      acc.push(pitcher);
                    }
                    return acc;
                  }, []);
                  
                  // Get teams for each pitcher
                  const getPitcherTeams = (pitcherId) => {
                    return teams.filter(t => t.pitcherIds.includes(pitcherId));
                  };
                  
                  return uniquePitchers.map(pitcher => {
                    const pitcherTeams = getPitcherTeams(pitcher.id);
                    return (
                      <div key={pitcher.id} onClick={() => {
                        setSelectedPitcher(pitcher);
                        // Set team context - use first team if on multiple
                        if (pitcherTeams.length > 0) {
                          setSelectedTeam(pitcherTeams[0]);
                        }
                      }} className="bg-white rounded-lg p-4 shadow hover:shadow-lg cursor-pointer transition">
                        <h3 className="font-bold">{pitcher.fullName}, Age {pitcher.age}</h3>
                        {pitcherTeams.length > 0 && (
                          <p className="text-sm text-blue-600">
                            Teams: {pitcherTeams.map(t => t.name).join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">Click to start training session</p>
                      </div>
                    );
                  });
                })()}
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

                {!pausedTraining && (
                  <button onClick={() => setSessionActive(true)} className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700">START SESSION</button>
                )}
                {pausedTraining && pausedTraining.selectedPitcher.id === selectedPitcher.id && (
                  <button
                    onClick={() => {
                      setSelectedPitcher(pausedTraining.selectedPitcher);
                      setSelectedTeam(pausedTraining.selectedTeam);
                      setTargetPitches(pausedTraining.targetPitches);
                      setSessionPitches(pausedTraining.sessionPitches);
                      setSessionActive(true);
                      setPausedTraining(null);
                    }}
                    className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-orange-700 animate-pulse"
                  >
                    ▶️ Resume Training Session
                  </button>
                )}
                {pausedTraining && pausedTraining.selectedPitcher.id !== selectedPitcher.id && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 mb-3">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Training session in progress with {pausedTraining.selectedPitcher.fullName}. End that session before starting a new one.
                    </p>
                  </div>
                )}
                <button onClick={() => setShowHistory(true)} className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700">VIEW HISTORY</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Settings View
  const SettingsView = () => {
    const [tempSettings, setTempSettings] = useState({ ...settings });
    const [showPitchRulesEditor, setShowPitchRulesEditor] = useState(false);
    const [editingRules, setEditingRules] = useState(null);

    const saveSettings = () => {
      // Validate thresholds
      if (tempSettings.redThreshold >= tempSettings.yellowThreshold) {
        alert('Red threshold must be lower than yellow threshold!');
        return;
      }
      if (tempSettings.redThreshold < 0 || tempSettings.yellowThreshold > 100) {
        alert('Thresholds must be between 0 and 100!');
        return;
      }
      
      setSettings(tempSettings);
      alert('Settings saved! Color changes will apply to all strike percentages.');
    };

    const resetDefaults = () => {
      if (window.confirm('Reset to default color thresholds?')) {
        const defaults = {
          redThreshold: 50,
          yellowThreshold: 65,
          customPitchRules: null
        };
        setTempSettings(defaults);
        setSettings(defaults);
        alert('Reset to defaults!');
      }
    };

    const openPitchRulesEditor = () => {
      // Start with current custom rules or defaults
      const currentRules = tempSettings.customPitchRules || defaultPitchRules;
      setEditingRules(JSON.parse(JSON.stringify(currentRules))); // Deep copy
      setShowPitchRulesEditor(true);
    };

    const savePitchRules = () => {
      setTempSettings({ ...tempSettings, customPitchRules: editingRules });
      setSettings({ ...tempSettings, customPitchRules: editingRules });
      setShowPitchRulesEditor(false);
      alert('Custom pitch count rules saved!');
    };

    const resetPitchRulesToDefaults = () => {
      if (window.confirm('Reset pitch count rules to MLB Pitch Smart defaults?')) {
        setEditingRules(JSON.parse(JSON.stringify(defaultPitchRules)));
      }
    };

    const useDefaultPitchRules = () => {
      if (window.confirm('Remove custom rules and use organization-based defaults?')) {
        setTempSettings({ ...tempSettings, customPitchRules: null });
        setSettings({ ...tempSettings, customPitchRules: null });
        alert('Now using organization-based pitch count rules.');
      }
    };

    return (
      <div className="min-h-screen bg-gray-100 p-4 pb-20 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">⚙️ Settings</h1>
          
          {/* Version Information */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-6">
            <p className="text-sm font-semibold text-blue-900">
              Version 3.0.2 - Updated February 23, 2026 at 1:30 AM EST
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Latest: Fixed JSX syntax error - removed duplicate closing button tag
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow mb-4">
            <h2 className="text-xl font-bold mb-4">Strike Percentage Colors</h2>
            <p className="text-sm text-gray-600 mb-6">
              Customize the color thresholds for strike percentages throughout the app. 
              These colors apply to training sessions, games, and all reports.
            </p>

            <div className="space-y-6">
              {/* Red Threshold */}
              <div>
                <label className="block font-semibold mb-2">
                  🔴 Red Threshold (Poor Performance)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Strike % below this value = RED
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.redThreshold}
                    onChange={(e) => setTempSettings({ ...tempSettings, redThreshold: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempSettings.redThreshold}
                    onChange={(e) => setTempSettings({ ...tempSettings, redThreshold: parseInt(e.target.value) || 0 })}
                    className="w-20 border rounded px-3 py-2 text-center font-bold"
                  />
                  <span className="font-bold">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Currently: Below {tempSettings.redThreshold}% = 🔴 RED
                </p>
              </div>

              {/* Yellow Threshold */}
              <div>
                <label className="block font-semibold mb-2">
                  🟡 Yellow Threshold (Good Performance)
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Strike % below this value = YELLOW (above red = yellow)
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={tempSettings.yellowThreshold}
                    onChange={(e) => setTempSettings({ ...tempSettings, yellowThreshold: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempSettings.yellowThreshold}
                    onChange={(e) => setTempSettings({ ...tempSettings, yellowThreshold: parseInt(e.target.value) || 0 })}
                    className="w-20 border rounded px-3 py-2 text-center font-bold"
                  />
                  <span className="font-bold">%</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Currently: {tempSettings.redThreshold}% - {tempSettings.yellowThreshold}% = 🟡 YELLOW
                </p>
              </div>

              {/* Green (calculated) */}
              <div className="bg-gray-50 p-4 rounded">
                <label className="block font-semibold mb-2">
                  🟢 Green (Excellent Performance)
                </label>
                <p className="text-sm text-gray-600">
                  Strike % at or above yellow threshold = GREEN
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Currently: {tempSettings.yellowThreshold}% and above = 🟢 GREEN
                </p>
              </div>
            </div>

            {/* Pitch Count Rules Section */}
            <div className="bg-white rounded-lg p-6 shadow mt-6">
              <h2 className="text-xl font-bold mb-4">⚾ Pitch Count Rules</h2>
              
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Current Mode:</strong> {tempSettings.customPitchRules ? 'Custom Rules' : 'Organization-Based (Default)'}
                </p>
                {!tempSettings.customPitchRules && (
                  <p className="text-xs text-blue-700 mt-2">
                    Using rules from each team's organization (MLB Pitch Smart, Little League, etc.)
                  </p>
                )}
                {tempSettings.customPitchRules && (
                  <p className="text-xs text-blue-700 mt-2">
                    Using your custom rules for all teams
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={openPitchRulesEditor}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  {tempSettings.customPitchRules ? '✏️ Edit Custom Rules' : '➕ Create Custom Rules'}
                </button>

                {tempSettings.customPitchRules && (
                  <button
                    onClick={useDefaultPitchRules}
                    className="w-full bg-gray-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-600"
                  >
                    🔄 Use Organization-Based Rules
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={resetDefaults}
                className="flex-1 bg-gray-300 text-gray-800 px-4 py-3 rounded-lg font-semibold hover:bg-gray-400"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700"
              >
                Save Settings
              </button>
            </div>

            {/* Current Settings Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-bold mb-2">📋 Current Settings Summary:</h3>
              <div className="space-y-1 text-sm">
                <p>🔴 <strong>Red:</strong> Below {tempSettings.redThreshold}%</p>
                <p>🟡 <strong>Yellow:</strong> {tempSettings.redThreshold}% - {tempSettings.yellowThreshold - 1}%</p>
                <p>🟢 <strong>Green:</strong> {tempSettings.yellowThreshold}% and above</p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
            <p className="font-bold text-blue-900">ℹ️ Where These Colors Apply:</p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• Team roster displays</li>
              <li>• Training session summaries</li>
              <li>• Training history</li>
              <li>• Game statistics</li>
              <li>• Pitcher performance charts</li>
              <li>• All strike percentage badges</li>
            </ul>
          </div>
        </div>

        {/* Pitch Rules Editor Modal */}
        {showPitchRulesEditor && editingRules && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2 border-b">
                <h2 className="text-2xl font-bold">Edit Pitch Count Rules</h2>
                <button onClick={() => setShowPitchRulesEditor(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              {/* Daily Pitch Limits */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Daily Pitch Limits by Age</h3>
                <div className="space-y-3">
                  {editingRules.dailyLimits.map((limit, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                      <div className="flex-1">
                        <label className="text-sm font-semibold">Max Age:</label>
                        <input
                          type="number"
                          value={limit.maxAge}
                          onChange={(e) => {
                            const updated = [...editingRules.dailyLimits];
                            updated[index].maxAge = parseInt(e.target.value);
                            setEditingRules({ ...editingRules, dailyLimits: updated });
                          }}
                          className="w-full border rounded px-2 py-1 mt-1"
                          min="1"
                          max="99"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-semibold">Pitch Limit:</label>
                        <input
                          type="number"
                          value={limit.pitches}
                          onChange={(e) => {
                            const updated = [...editingRules.dailyLimits];
                            updated[index].pitches = parseInt(e.target.value);
                            setEditingRules({ ...editingRules, dailyLimits: updated });
                          }}
                          className="w-full border rounded px-2 py-1 mt-1"
                          min="1"
                          max="150"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 Example: "Max Age 10, Pitch Limit 75" means pitchers 10 and under can throw 75 pitches
                </p>
              </div>

              {/* Rest Day Requirements */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-3">Rest Days by Pitch Count</h3>
                <div className="space-y-3">
                  {editingRules.restDays.map((rest, index) => (
                    <div key={index} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                      <div className="flex-1">
                        <label className="text-sm font-semibold">Up to Pitches:</label>
                        <input
                          type="number"
                          value={rest.maxPitches}
                          onChange={(e) => {
                            const updated = [...editingRules.restDays];
                            updated[index].maxPitches = parseInt(e.target.value);
                            setEditingRules({ ...editingRules, restDays: updated });
                          }}
                          className="w-full border rounded px-2 py-1 mt-1"
                          min="1"
                          max="999"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm font-semibold">Rest Days:</label>
                        <input
                          type="number"
                          value={rest.days}
                          onChange={(e) => {
                            const updated = [...editingRules.restDays];
                            updated[index].days = parseInt(e.target.value);
                            setEditingRules({ ...editingRules, restDays: updated });
                          }}
                          className="w-full border rounded px-2 py-1 mt-1"
                          min="0"
                          max="7"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡 Example: "Up to 40, Rest 2" means 1-40 pitches requires 2 days rest
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t">
                <button
                  onClick={resetPitchRulesToDefaults}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Reset to MLB Pitch Smart
                </button>
                <button
                  onClick={() => setShowPitchRulesEditor(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={savePitchRules}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Rules
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Bottom Nav - Hide during active game or training
  const BottomNav = () => {
    // Don't show bottom nav if there's an active game or if we're in pitch tracking view with a selected pitcher
    const hideNav = (currentView === 'pitchTracking' && gameState && gameState.selectedPitcher);
    
    if (hideNav) return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="max-w-4xl mx-auto flex justify-around py-0.5">
          <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-0 px-2 py-0.5 ${['dashboard', 'team', 'pitchTracking', 'gameEnd'].includes(currentView) ? 'text-blue-600' : 'text-gray-600'}`}>
            <div className="text-sm">📊</div>
            <span className="text-[9px]">Teams</span>
          </button>
          <button onClick={() => setCurrentView('training')} className={`flex flex-col items-center gap-0 px-2 py-0.5 ${currentView === 'training' ? 'text-blue-600' : 'text-gray-600'}`}>
            <TrendingUp size={14} />
            <span className="text-[9px]">Training</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center gap-0 px-2 py-0.5 ${currentView === 'settings' ? 'text-blue-600' : 'text-gray-600'}`}>
            <div className="text-sm">⚙️</div>
            <span className="text-[9px]">Settings</span>
          </button>
        </div>
      </div>
    );
  };

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
      {currentView === 'settings' && <SettingsView />}
      <BottomNav />
    </div>
  );
}
