// MainOperations/scripts/birthdays.js
// Birthday management functionality

async function renderUpcomingBirthdays() {
  try {
    const res = await fetch('/settings/birthdays');
    if (!res.ok) {
      document.getElementById('upcomingBirthdays').innerHTML = '<div class="no-data">Unable to load birthdays</div>';
      return;
    }
    
    const birthdays = await res.json();
    const today = new Date();
    
    const upcoming = birthdays.map(b => {
      const bday = new Date(b.birthday);
      const bdayThisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      
      if (bdayThisYear < today) {
        bdayThisYear.setFullYear(today.getFullYear() + 1);
      }
      
      const daysUntil = Math.floor((bdayThisYear - today) / (1000 * 60 * 60 * 24));
      
      return { ...b, daysUntil, date: bdayThisYear, isToday: daysUntil === 0 };
    })
    .filter(b => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3);
    
    const birthdaysGrid = document.getElementById('upcomingBirthdays');
    
    if (!upcoming.length) {
      birthdaysGrid.innerHTML = '<div class="no-data">No birthdays in the next 30 days</div>';
      return;
    }
    
    const playersRes = await fetch('/dashboard/players');
    const allPlayers = playersRes.ok ? await playersRes.json() : [];
    
    birthdaysGrid.innerHTML = upcoming.map(b => {
      const player = allPlayers.find(p => p.roblox_id === b.roblox_id);
      const avatarUrl = player?.avatar_url || 'https://placehold.co/80x80/e0e6f0/5f6c7b?text=U';
      const dayText = b.isToday ? 'Today!' : `In ${b.daysUntil} day${b.daysUntil !== 1 ? 's' : ''}`;
      
      return `
        <div class="player-card" onclick="window.location='/dashboard/player/${b.username}'">
          <div class="avatar-wrapper">
            <img src="${avatarUrl}" onerror="this.src='https://placehold.co/80x80/e0e6f0/5f6c7b?text=U';"/>
            ${b.isToday ? '<span class="birthday-badge">🎂</span>' : ''}
          </div>
          <div>${b.username}</div>
          <div class="time" style="${b.isToday ? 'color:#ff4444;font-weight:700;' : ''}">${dayText}</div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Error loading birthdays:', err);
    document.getElementById('upcomingBirthdays').innerHTML = '<div class="no-data">Failed to load birthdays</div>';
  }
}

window.openBirthdaysManager = async function() {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Birthday management requires Vice Chairman+');
    return;
  }

  const modal = document.getElementById('shiftModal');
  const modalTitle = document.getElementById('modalShiftTitle');
  const modalBody = document.querySelector('.modal-body');
  
  modalTitle.textContent = 'Manage Birthdays';
  modalBody.innerHTML = `
    <div style="margin-bottom:20px;">
      <input type="text" id="bdaySearch" placeholder="Search player..." 
             style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:10px;">
      <div id="bdaySearchResults" style="max-height:200px;overflow-y:auto;"></div>
    </div>
    <div style="max-height:400px;overflow-y:auto;" id="birthdaysList">
      <div class="no-data">Loading...</div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  const res = await fetch('/settings/birthdays');
  const birthdays = res.ok ? await res.json() : [];
  
  const list = document.getElementById('birthdaysList');
  if (!birthdays.length) {
    list.innerHTML = '<div class="no-data">No birthdays set</div>';
  } else {
    list.innerHTML = birthdays.map(b => `
      <div class="attendee-box">
        <div>
          <strong>${b.username}</strong><br>
          <span style="font-size:13px;color:#666;">${new Date(b.birthday).toLocaleDateString()}</span>
        </div>
        <button onclick="deleteBirthday(${b.roblox_id})">×</button>
      </div>
    `).join('');
  }
  
  const searchInput = document.getElementById('bdaySearch');
  const searchResults = document.getElementById('bdaySearchResults');
  
  searchInput.addEventListener('input', async () => {
    const q = searchInput.value.trim();
    if (!q) { searchResults.innerHTML = ''; return; }
    
    const res = await fetch(`/settings/search-players?username=${encodeURIComponent(q)}`);
    const players = res.ok ? await res.json() : [];
    
    searchResults.innerHTML = players.map(p => `
      <div class="suggestion-item" onclick="setBirthdayFor(${p.roblox_id}, '${p.username}')">
        <img src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.roblox_id}&width=40&height=40&format=png"
             onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
        <span>${p.username}</span>
      </div>
    `).join('');
  });
};

window.setBirthdayFor = async function(robloxId, username) {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Birthday management requires Vice Chairman+');
    return;
  }

  const birthday = prompt(`Set birthday for ${username} (MM/DD):`);
  if (!birthday) return;
  
  const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/;
  if (!dateRegex.test(birthday)) {
    alert('Invalid date format. Use MM/DD (e.g., 03/15)');
    return;
  }
  
  const [month, day] = birthday.split('/');
  const birthdayWithYear = `2000-${month}-${day}`;
  
  try {
    const res = await fetch('/settings/birthdays/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roblox_id: robloxId, username, birthday: birthdayWithYear })
    });
    
    if (res.ok) {
      alert('Birthday set successfully!');
      openBirthdaysManager();
      renderUpcomingBirthdays();
    } else {
      alert('Failed to set birthday');
    }
  } catch (err) {
    alert('Error setting birthday');
  }
};

window.deleteBirthday = async function(robloxId) {
  if (!EXECUTIVE_RANKS.includes(userGroupRank)) {
    alert('Access Denied: Birthday management requires Vice Chairman+');
    return;
  }

  if (!confirm('Delete this birthday?')) return;
  
  try {
    const res = await fetch(`/settings/birthdays/${robloxId}`, { method: 'DELETE' });
    if (res.ok) {
      openBirthdaysManager();
      renderUpcomingBirthdays();
    }
  } catch (err) {
    alert('Error deleting birthday');
  }
};

// Initialize birthdays
document.addEventListener('DOMContentLoaded', () => {
  renderUpcomingBirthdays();
  setInterval(renderUpcomingBirthdays, 300000);
});
