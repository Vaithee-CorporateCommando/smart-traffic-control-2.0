import React, { useState, useEffect } from 'react';
import LoginView from './components/LoginView';
import PublicDashboard from './components/PublicDashboard';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './supabaseClient';
import {
  INITIAL_JUNCTIONS,
  INITIAL_ROADS,
  INITIAL_CCTV,
  INITIAL_INCIDENTS,
  INITIAL_ROADBLOCKS,
  INITIAL_DISPATCHES,
  INITIAL_AUDIT
} from './trafficData';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Global Traffic Network State
  const [junctions, setJunctions] = useState(INITIAL_JUNCTIONS);
  const [roads, setRoads] = useState(INITIAL_ROADS);
  const [cctvFeeds, setCctvFeeds] = useState(INITIAL_CCTV);
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [roadBlocks, setRoadBlocks] = useState(INITIAL_ROADBLOCKS);
  const [emergencyDispatches, setEmergencyDispatches] = useState(INITIAL_DISPATCHES);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT);

  // Check and restore existing Supabase citizen session on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let fullName = session.user.user_metadata?.full_name || 'Registered Commuter';
        let userNameVal = session.user.user_metadata?.username || session.user.email?.split('@')[0];

        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', session.user.id)
            .maybeSingle();

          if (prof) {
            if (prof.full_name) fullName = prof.full_name;
            if (prof.username) userNameVal = prof.username;
          }
        } catch (e) {
          console.warn('Session profile check notice:', e);
        }

        // Enforce PUBLIC role for citizen accounts
        setCurrentUser({
          id: session.user.id,
          username: userNameVal,
          fullName: fullName,
          email: session.user.email,
          role: 'PUBLIC',
          department: 'Registered Commuter'
        });
      }
    }).catch(err => {
      console.warn('Initial session check error:', err);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Background Simulation Pulse (3s Interval) - Equivalent to TrafficService.java
  useEffect(() => {
    const timer = setInterval(() => {
      setJunctions(prev => prev.map(j => {
        if (j.manualOverride) return j; // Hold override

        // Rotate automatic phases
        let nextSignal = j.signalState;
        if (j.signalState === 'GREEN_NORTH_SOUTH' && Math.random() > 0.6) {
          nextSignal = 'GREEN_EAST_WEST';
        } else if (j.signalState === 'GREEN_EAST_WEST' && Math.random() > 0.6) {
          nextSignal = 'GREEN_NORTH_SOUTH';
        }

        // Slight dynamic queue delta
        const delta = Math.floor(Math.random() * 5) - 2;
        const newQueue = Math.max(3, Math.min(60, j.queue + delta));

        return {
          ...j,
          signalState: nextSignal,
          queue: newQueue
        };
      }));
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.role === 'ADMINISTRATOR') {
    return (
      <AdminDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        junctions={junctions}
        setJunctions={setJunctions}
        roads={roads}
        setRoads={setRoads}
        cctvFeeds={cctvFeeds}
        setCctvFeeds={setCctvFeeds}
        incidents={incidents}
        setIncidents={setIncidents}
        roadBlocks={roadBlocks}
        setRoadBlocks={setRoadBlocks}
        emergencyDispatches={emergencyDispatches}
        setEmergencyDispatches={setEmergencyDispatches}
        auditLog={auditLog}
        setAuditLog={setAuditLog}
      />
    );
  }

  return (
    <PublicDashboard
      currentUser={currentUser}
      onLogout={handleLogout}
      junctions={junctions}
      roads={roads}
      incidents={incidents}
      roadBlocks={roadBlocks}
    />
  );
}
