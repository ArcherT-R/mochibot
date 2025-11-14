// MainOperations/scripts/labels.js
// Player labels management

window.openLabelsManager = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Label management requires Vice Chairman+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Manage Player Labels';
  modalBody.innerHTML = `
    <div style="margin-bottom:20px;">
      <input type="text" id="labelSearch" placeholder="Search player..." 
             style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;">
      <div id="labelSearchResults" style="max-height:200px;overflow-y:auto;"></div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  const searchInput = document.getElementById('labelSearch');
  const searchResults = document.getElementById('labelSearchResults');
  
  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    
    const res = await fetch(`/settings/search-players?username=${encodeURIComponent(q)}`);
    const players = res.ok ? await res.json() : [];
    
    searchResults.innerHTML = players.map(p => `
      <div class="suggestion-item" onclick="managePlayerLabels(${p.roblox_id}, '${p.username}')">
        <img src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.roblox_id}&width=40&height=40&format=png"
             onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
        <span>${p.username}</span>
      </div>
    `).join('');
  });
};

window.managePlayerLabels = async function(robloxId, username) {
  const res = await fetch(`/settings/labels/${robloxId}`);
  const currentLabels = res.ok ? await res.json() : [];
  
  const allLabels = ['Management', 'Public Relations', 'Operations', 'Human Resources', 'Supervision'];
  
  const modalBody = document.querySelector('.modal-body');
  modalBody.innerHTML = `
    <h3 style="margin-bottom:15px;">Labels for ${username}</h3>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${allLabels.map(label => {
        const isActive = currentLabels.includes(label);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:${isActive ? '#e6f3ff' : '#f9f9f9'};border-radius:8px;border:2px solid ${isActive ? '#42b4ff' : '#eee'};">
            <span style="font-weight:600;">${label}</span>
            <button onclick="toggleLabel(${robloxId}, '${username}', '${label}', ${isActive})" 
                    style="padding:6px 16px;background:${isActive ? '#ff4444' : '#42b4ff'};color:white;border-radius:6px;cursor:pointer;font-weight:600;">
              ${isActive ? 'Remove' : 'Add'}
            </button>
          </div>
        `;
      }).join('')}
    </div>
    <button onclick="openLabelsManager()" style="margin-top:20px;width:100%;padding:12px;background:#42b4ff;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">
      ← Back to Search
    </button>
  `;
};

window.toggleLabel = async function(robloxId, username, label, isActive) {
  try {
    const method = isActive ? 'DELETE' : 'POST';
    const res = await fetch('/settings/labels', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roblox_id: robloxId, username: username, label: label })
    });
    
    if (res.ok) {
      managePlayerLabels(robloxId, username);
      
      if (currentUser && currentUser.roblox_id === robloxId) {
        await loadCurrentUserLabels();
        renderRequirementsBox();
      }
    } else {
      alert('Failed to update label');
    }
  } catch (err) {
    alert('Error updating label');
  }
};
