// MainOperations/scripts/playerList.js
// Player list display and filtering

let allPlayersData = [];
let playerShiftStats = {};
let currentPlayerFilter = 'all';

async function calculateShiftStats() {
  try {
    const shiftRes = await fetch('/shifts');
    const shifts = shiftRes.ok ? await shiftRes.json() : [];
    
    const now = Date.now();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    
    const stats = {};
    
    for (const shift of shifts) {
      const shiftTime = shift.shift_time || shift.time;
      const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
      
      if (timestamp < weekStart.getTime()) continue;
      
      if (shift.host && shift.host !== 'TBD') {
        const hostLower = shift.host.toLowerCase();
        if (!stats[hostLower]) stats[hostLower] = { hosted: 0, attended: 0 };
        stats[hostLower].hosted++;
      }
      
      if (shift.cohost) {
        const cohostLower = shift.cohost.toLowerCase();
        if (!stats[cohostLower]) stats[cohostLower] = { hosted: 0, attended: 0 };
        stats[cohostLower].hosted++;
      }
      
      const attendeesRes = await fetch(`/shifts/attendees?shiftId=${shift.id}`);
      if (attendeesRes.ok) {
        const attendees = await attendeesRes.json();
        attendees.forEach(a => {
          const usernameLower = a.username.toLowerCase();
          if (!stats[usernameLower]) stats[usernameLower] = { hosted: 0, attended: 0 };
          stats[usernameLower].attended++;
        });
      }
    }
    
    return stats;
  } catch (err) {
    console.error('Error calculating shift stats:', err);
    return {};
  }
}

async function filterPlayerList(filter) {
  currentPlayerFilter = filter;
  
  document.querySelectorAll('[data-filter]').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  const requirementHeader = document.getElementById('requirementHeader');
  if (filter === 'all') {
    requirementHeader.style.display = 'none';
  } else {
    requirementHeader.style.display = '';
  }
  
  await renderFullPlayers();
}

window.filterPlayerList = filterPlayerList;

async function loadPlayerList() {
  try {
    const res = await fetch('/dashboard/players');
    const players = res.ok ? await res.json() : [];
    allPlayersData = players;
    playerShiftStats = await calculateShiftStats();
    await renderFullPlayers();
  } catch (err) {
    console.error('Error loading player list:', err);
  }
}

async function renderFullPlayers() {
  const fullPlayerList = document.getElementById('fullPlayerList');
  
  try {
    const res = await fetch('/dashboard/players');
    const players = res.ok ? await res.json() : [];
    allPlayersData = players;
    
    playerShiftStats = await calculateShiftStats();
    
    let playersWithLabels = players;
    
    if (currentPlayerFilter !== 'all') {
      const labelsPromises = players.map(async p => {
        try {
          const labelRes = await fetch(`/settings/labels/${p.roblox_id}`);
          const labels = labelRes.ok ? await labelRes.json() : [];
          return { ...p, labels };
        } catch {
          return { ...p, labels: [] };
        }
      });
      
      playersWithLabels = await Promise.all(labelsPromises);
      playersWithLabels = playersWithLabels.filter(p => p.labels.includes(currentPlayerFilter));
      
      playersWithLabels.sort((a, b) => {
        const rankA = RANK_HIERARCHY[a.group_rank] || 0;
        const rankB = RANK_HIERARCHY[b.group_rank] || 0;
        return rankB - rankA;
      });
    }
    
    if (!playersWithLabels.length) {
      const colspan = currentPlayerFilter === 'all' ? 4 : 5;
      fullPlayerList.innerHTML = `<tr><td colspan="${colspan}" class="no-data">No players found.</td></tr>`;
      return;
    }
    
    fullPlayerList.innerHTML = playersWithLabels.map(p => {
      const hours = Math.floor((p.weekly_minutes || 0) / 60);
      const mins = (p.weekly_minutes || 0) % 60;
      
      let requirementCell = '';
      if (currentPlayerFilter !== 'all') {
        const stats = playerShiftStats[p.username.toLowerCase()] || { hosted: 0, attended: 0 };
        
        let requirementMet = false;
        let requirementText = '';
        
        if (currentPlayerFilter === 'Human Resources' || currentPlayerFilter === 'Operations') {
          if (p.group_rank === 'Head Corporate') {
            const minutesMet = (p.weekly_minutes || 0) >= 60;
            const shiftsMet = stats.hosted >= 2;
            requirementMet = minutesMet && shiftsMet;
            requirementText = `${(p.weekly_minutes || 0)}/60 mins, ${stats.hosted}/2 shifts`;
          } else if (p.group_rank === 'Senior Corporate') {
            const minutesMet = (p.weekly_minutes || 0) >= 70;
            const shiftsMet = stats.hosted >= 2;
            requirementMet = minutesMet && shiftsMet;
            requirementText = `${(p.weekly_minutes || 0)}/70 mins, ${stats.hosted}/2 shifts`;
          } else if (p.group_rank === 'Junior Corporate') {
            const minutesMet = (p.weekly_minutes || 0) >= 80;
            const shiftsMet = stats.hosted >= 3;
            requirementMet = minutesMet && shiftsMet;
            requirementText = `${(p.weekly_minutes || 0)}/80 mins, ${stats.hosted}/3 shifts`;
          } else {
            requirementMet = stats.hosted >= 2;
            requirementText = `${stats.hosted}/2 shifts hosted`;
          }
        } else if (currentPlayerFilter === 'Public Relations' || currentPlayerFilter === 'Management') {
          requirementMet = stats.attended >= 2;
          requirementText = `${stats.attended}/2 shifts attended`;
        } else if (currentPlayerFilter === 'Supervision') {
          const minutes = (p.weekly_minutes || 0);
          requirementMet = minutes >= 90;
          requirementText = `${minutes}/90 minutes`;
        }
        
        const color = requirementMet ? '#28a745' : '#ff4444';
        const icon = requirementMet ? '✓' : '✗';
        requirementCell = `<td><span style="color:${color};font-weight:700;">${icon} ${requirementText}</span></td>`;
      }
      
      return `
        <tr style="cursor:pointer;" onclick="window.location='/dashboard/player/${p.username}'">
          <td>
            <div class="player-info">
              <img class="player-avatar" src="${p.avatar_url || 'https://placehold.co/40x40/e0e6f0/5f6c7b?text=U'}"
                   onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
              <div>
                <div class="player-name">${p.username}</div>
              </div>
            </div>
          </td>
          <td><span class="player-rank">${p.group_rank || 'Unknown'}</span></td>
          <td>${hours}h ${mins}m</td>
          ${requirementCell}
          <td>${p.roblox_id}</td>
        </tr>`;
    }).join('');
  } catch (err) { 
    console.error(err); 
    const colspan = currentPlayerFilter === 'all' ? 4 : 5;
    fullPlayerList.innerHTML = `<tr><td colspan="${colspan}" class="no-data">Failed to load players.</td></tr>`; 
  }
}

// Initialize player list
document.addEventListener('DOMContentLoaded', () => {
  renderFullPlayers();
});
