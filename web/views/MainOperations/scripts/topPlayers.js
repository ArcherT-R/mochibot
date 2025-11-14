// MainOperations/scripts/topPlayers.js
// Top players and shift leaders functionality

let topPlayersData = [];

async function renderTopPlayers() {
  const topPlayersGrid = document.getElementById('topPlayersGrid');
  
  try {
    const res = await fetch('/dashboard/top-players');
    topPlayersData = res.ok ? await res.json() : topPlayersData;
    
    if (!topPlayersData.length) {
      topPlayersGrid.innerHTML = '<div class="no-data">No active players data.</div>';
      return;
    }
    
    const livePlayers = topPlayersData
      .map(p => ({
        ...p, 
        live_total_minutes: getTotalMinutes(p), 
        is_live: calculateLiveMinutes(p) > 0
      }))
      .sort((a, b) => b.live_total_minutes - a.live_total_minutes)
      .slice(0, 3);

    topPlayersGrid.innerHTML = livePlayers.map(p => `
      <div class="player-card" onclick="window.location='/dashboard/player/${p.username}'">
        <img src="${p.avatar_url || 'https://placehold.co/80x80/e0e6f0/5f6c7b?text=U'}"
             onerror="this.src='https://placehold.co/80x80/e0e6f0/5f6c7b?text=U';"/>
        <div>${p.username}</div>
        ${p.is_live ? '<span class="live-status">LIVE</span>' : ''}
        <div class="time">${formatMinutes(p.live_total_minutes)}</div>
      </div>`).join('');
  } catch (err) { 
    console.error(err); 
  }
}

async function renderTopShiftLeaders() {
  try {
    const shiftRes = await fetch('/shifts');
    const shifts = shiftRes.ok ? await shiftRes.json() : [];
    
    const now = Date.now();
    
    const pastShifts = shifts.filter(shift => {
      const shiftTime = shift.shift_time || shift.time;
      const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
      return timestamp < now;
    });
    
    const attendeesPromises = pastShifts.map(async shift => {
      try {
        const res = await fetch(`/shifts/attendees?shiftId=${shift.id}`);
        return res.ok ? await res.json() : [];
      } catch { return []; }
    });
    
    const allAttendeesArrays = await Promise.all(attendeesPromises);
    
    const playersRes = await fetch('/dashboard/players');
    const allPlayers = playersRes.ok ? await playersRes.json() : [];
    const allUsernames = allPlayers.map(p => p.username);
    
    const participationCount = {};
    
    pastShifts.forEach((shift, index) => {
      const attendees = allAttendeesArrays[index];
      
      ['host', 'cohost', 'overseer'].forEach(role => {
        if (shift[role] && shift[role] !== 'TBD') {
          const closest = findClosestUsername(shift[role], allUsernames).toLowerCase();
          participationCount[closest] = (participationCount[closest] || 0) + 1;
        }
      });
      
      attendees.forEach(attendee => {
        const closest = findClosestUsername(attendee.username, allUsernames).toLowerCase();
        participationCount[closest] = (participationCount[closest] || 0) + 1;
      });
    });
    
    const sortedLeaders = Object.entries(participationCount)
      .map(([username, count]) => ({ username, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    const topShiftLeadersGrid = document.getElementById('topShiftLeaders');
    
    if (!sortedLeaders.length) {
      topShiftLeadersGrid.innerHTML = '<div class="no-data">No shift participation data.</div>';
      return;
    }
    
    topShiftLeadersGrid.innerHTML = sortedLeaders.map(leader => {
      const player = allPlayers.find(p => p.username.toLowerCase() === leader.username);
      const avatarUrl = player?.avatar_url || 'https://placehold.co/80x80/e0e6f0/5f6c7b?text=U';
      const displayName = player?.username || leader.username;
      
      return `
        <div class="player-card" onclick="window.location='/dashboard/player/${displayName}'">
          <img src="${avatarUrl}" onerror="this.src='https://placehold.co/80x80/e0e6f0/5f6c7b?text=U';"/>
          <div>${displayName}</div>
          <div class="time">${leader.count} shift${leader.count !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');
    
  } catch (err) { 
    console.error('Error loading shift leaders:', err); 
    document.getElementById('topShiftLeaders').innerHTML = '<div class="no-data">Failed to load shift leaders.</div>';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  renderTopPlayers();
  setInterval(renderTopPlayers, 5000);
  
  renderTopShiftLeaders();
  setInterval(renderTopShiftLeaders, 60000);
});
