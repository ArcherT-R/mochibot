// MainOperations/scripts/settings.js
// Settings and administrative functions

window.openAddPlayer = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Adding players requires Vice Chairman+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Add New Player';
  modalBody.innerHTML = `
    <form id="addPlayerForm" style="display:flex;flex-direction:column;gap:15px;">
      <div>
        <label style="display:block;font-weight:600;margin-bottom:5px;">Roblox ID *</label>
        <input type="number" id="newRobloxId" required 
               style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:5px;">Username *</label>
        <input type="text" id="newUsername" required 
               style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:5px;">Group Rank *</label>
        <input type="text" id="newGroupRank" required 
               style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:5px;">Avatar URL *</label>
        <input type="url" id="newAvatarUrl" required 
               style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;"
               placeholder="https://...">
      </div>
      <div>
        <label style="display:block;font-weight:600;margin-bottom:5px;">Password (6-digit)</label>
        <div style="display:flex;gap:10px;">
          <input type="text" id="newPassword" readonly 
                 style="flex:1;padding:10px;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;">
          <button type="button" onclick="generatePassword()" class="btn">Generate</button>
        </div>
      </div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;">
        <button type="button" onclick="closeShiftModal()" class="btn" style="background:#ccc;color:#333;">Cancel</button>
        <button type="submit" class="btn">Add Player</button>
      </div>
    </form>
  `;
  
  modal.style.display = 'block';
  
  document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const robloxId = document.getElementById('newRobloxId').value;
    const username = document.getElementById('newUsername').value;
    const groupRank = document.getElementById('newGroupRank').value;
    const avatarUrl = document.getElementById('newAvatarUrl').value;
    const password = document.getElementById('newPassword').value;
    
    if (!password) {
      alert('Please generate a password first');
      return;
    }
    
    try {
      const res = await fetch('/settings/add-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roblox_id: robloxId,
          username: username,
          group_rank: groupRank,
          avatar_url: avatarUrl,
          password: password
        })
      });
      
      const result = await res.json();
      
      if (res.ok) {
        alert(`Player added successfully!\n\nUsername: ${username}\nPassword: ${password}\n\nMake sure to save this password!`);
        closeShiftModal();
        
        if (allPlayersData.length) {
          loadPlayerList();
        }
      } else {
        alert(`Failed to add player: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error adding player:', err);
      alert('Error adding player. Please try again.');
    }
  });
};

window.generatePassword = async function() {
  try {
    const res = await fetch('/settings/generate-password');
    const data = await res.json();
    
    if (data.password) {
      document.getElementById('newPassword').value = data.password;
    } else {
      alert('Failed to generate password');
    }
  } catch (err) {
    console.error('Error generating password:', err);
    alert('Error generating password');
  }
};

window.openManualRemoveShift = async function() {
  if (!LEADERSHIP_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Manual shift removal requires Leadership+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Manual Remove Shift';
  modalBody.innerHTML = '<div class="no-data">Loading shifts...</div>';
  modal.style.display = 'block';
  
  try {
    const res = await fetch('/shifts');
    const shifts = await res.json();
    
    if (!shifts.length) {
      modalBody.innerHTML = '<div class="no-data">No shifts to remove</div>';
      return;
    }
    
    modalBody.innerHTML = `
      <div style="max-height:500px;overflow-y:auto;">
        ${shifts.map(shift => {
          const shiftTime = shift.shift_time || shift.time;
          const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
          const date = new Date(timestamp);
          const dateStr = date.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
          const timeStr = date.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
          
          return `
            <div class="attendee-box" style="margin-bottom:10px;">
              <div>
                <strong>${dateStr} at ${timeStr}</strong><br>
                <span style="font-size:13px;color:#666;">Host: ${shift.host || 'TBD'}</span>
              </div>
              <button onclick="deleteShift(${shift.id})" style="background:#ff4444;">×</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    console.error('Error loading shifts:', err);
    modalBody.innerHTML = '<div class="no-data">Failed to load shifts</div>';
  }
};

window.deleteShift = async function(shiftId) {
  if (!confirm('Are you sure you want to delete this shift? This action cannot be undone.')) return;
  
  try {
    const res = await fetch(`/settings/shifts/${shiftId}`, { method: 'DELETE' });
    if (res.ok) {
      alert('Shift deleted successfully');
      openManualRemoveShift();
    } else {
      alert('Failed to delete shift');
    }
  } catch (err) {
    console.error('Error deleting shift:', err);
    alert('Error deleting shift');
  }
};

window.openLOAManager = async function() {
  if (!LEADERSHIP_RANKS.includes(userGroupRank)) {
    alert('Access Denied: LOA management requires Leadership+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Leave of Absence Management';
  modalBody.innerHTML = `
    <div style="margin-bottom:20px;">
      <input type="text" id="loaSearch" placeholder="Search player..." 
             style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;">
      <div id="loaSearchResults" style="max-height:200px;overflow-y:auto;"></div>
    </div>
    <h3 style="margin-bottom:15px;">Current LOAs</h3>
    <div style="max-height:400px;overflow-y:auto;" id="loaList">
      <div class="no-data">Loading...</div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  const res = await fetch('/settings/loa');
  const loas = await res.json();
  
  const list = document.getElementById('loaList');
  if (!loas.length) {
    list.innerHTML = '<div class="no-data">No LOAs set</div>';
  } else {
    list.innerHTML = loas.map(loa => `
      <div class="attendee-box">
        <div>
          <strong>${loa.username}</strong><br>
          <span style="font-size:13px;color:#666;">${new Date(loa.start_date).toLocaleDateString()} - ${new Date(loa.end_date).toLocaleDateString()}</span>
        </div>
        <button onclick="removeLOA(${loa.roblox_id})">×</button>
      </div>
    `).join('');
  }
  
  const searchInput = document.getElementById('loaSearch');
  const searchResults = document.getElementById('loaSearchResults');
  
  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    
    const res = await fetch(`/settings/search-players?username=${encodeURIComponent(q)}`);
    const players = res.ok ? await res.json() : [];
    
    searchResults.innerHTML = players.map(p => `
      <div class="suggestion-item" onclick="setLOAFor(${p.roblox_id}, '${p.username}')">
        <img src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.roblox_id}&width=40&height=40&format=png"
             onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
        <span>${p.username}</span>
      </div>
    `).join('');
  });
};

window.setLOAFor = async function(robloxId, username) {
  const startDate = prompt(`Set LOA start date for ${username} (YYYY-MM-DD):`);
  if (!startDate) return;
  
  const endDate = prompt(`Set LOA end date for ${username} (YYYY-MM-DD):`);
  if (!endDate) return;
  
  try {
    const res = await fetch('/settings/loa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roblox_id: robloxId, username, start_date: startDate, end_date: endDate })
    });
    
    if (res.ok) {
      alert('LOA set successfully!');
      openLOAManager();
    } else {
      alert('Failed to set LOA');
    }
  } catch (err) {
    alert('Error setting LOA');
  }
};

window.removeLOA = async function(robloxId) {
  if (!confirm('Remove this LOA?')) return;
  
  try {
    const res = await fetch(`/settings/loa/${robloxId}`, { method: 'DELETE' });
    if (res.ok) {
      openLOAManager();
    }
  } catch (err) {
    alert('Error removing LOA');
  }
};

window.openWeeklyResetStatus = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Weekly reset requires Vice Chairman+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Weekly Reset Status';
  modalBody.innerHTML = '<div class="no-data">Loading...</div>';
  modal.style.display = 'block';
  
  try {
    const res = await fetch('/settings/weekly-reset/status');
    const data = await res.json();
    
    const nextReset = new Date(data.nextReset);
    const lastReset = data.lastReset ? new Date(data.lastReset) : null;
    
    modalBody.innerHTML = `
      <div style="line-height:2;">
        <p><strong>Next Reset:</strong> ${nextReset.toLocaleString()}</p>
        ${lastReset ? `<p><strong>Last Reset:</strong> ${lastReset.toLocaleString()}</p>
        <p><strong>Players Affected:</strong> ${data.playersAffected}</p>` : ''}
        <hr style="margin:20px 0;border:none;border-top:1px solid #e0e6f0;">
        <button onclick="manualReset()" style="width:100%;padding:12px;background:#ff4444;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
          Manual Reset (Use with caution)
        </button>
      </div>
    `;
  } catch(err) {
    console.error('Error loading reset status:', err);
    modalBody.innerHTML = '<div class="no-data">Failed to load reset status</div>';
  }
};

window.manualReset = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Manual reset requires Vice Chairman+');
    return;
  }

  if (!confirm('Are you sure you want to manually reset weekly data? This will clear all player weekly minutes and save current data to history.')) return;
  
  try {
    const res = await fetch('/settings/weekly-reset/manual', { method: 'POST' });
    const result = await res.json();
    
    if (result.success) {
      alert(`Reset successful! ${result.playersAffected} players affected.`);
      openWeeklyResetStatus();
    } else {
      alert('Reset failed');
    }
  } catch (err) {
    alert('Error performing reset');
  }
};

window.openLastWeekHistory = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: History requires Vice Chairman+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Last Week\'s Data';
  modalBody.innerHTML = '<div class="no-data">Loading...</div>';
  modal.style.display = 'block';
  
  try {
    const res = await fetch('/settings/weekly-reset/last-week');
    const history = await res.json();
    
    if (!history.length) {
      modalBody.innerHTML = '<div class="no-data">No historical data available</div>';
      return;
    }
    
    const weekStart = new Date(history[0].week_start).toLocaleDateString();
    const weekEnd = new Date(history[0].week_end).toLocaleDateString();
    
    const sorted = history.sort((a, b) => b.total_minutes - a.total_minutes).slice(0, 10);
    
    modalBody.innerHTML = `
      <div style="margin-bottom:15px;text-align:center;color:#666;">
        Week: ${weekStart} - ${weekEnd}
      </div>
      <div style="max-height:500px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f0f8ff;text-align:left;">
              <th style="padding:8px;">Player</th>
              <th style="padding:8px;">Minutes</th>
              <th style="padding:8px;">Hosted</th>
              <th style="padding:8px;">Attended</th>
              <th style="padding:8px;">Roblox ID</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(h => {
              const hours = Math.floor(h.total_minutes / 60);
              const mins = h.total_minutes % 60;
              return `
                <tr style="cursor:pointer;" onclick="window.location='/dashboard/player/${h.username}'">
                  <td>
                    <div class="player-info">
                      <img class="player-avatar" src="${h.avatar_url || 'https://placehold.co/40x40/e0e6f0/5f6c7b?text=U'}"
                           onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
                      <div class="player-details">
                        <div class="player-name">${h.username}</div>
                        <div class="player-rank">${h.group_rank || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td>${hours}h ${mins}m</td>
                  <td>${h.shifts_hosted}</td>
                  <td>${h.shifts_attended}</td>
                  <td>${h.roblox_id}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch(err) {
    console.error('Error loading last week history:', err);
    modalBody.innerHTML = '<div class="no-data">Failed to load historical data</div>';
  }
};
