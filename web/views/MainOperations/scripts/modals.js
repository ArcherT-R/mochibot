// MainOperations/scripts/modals.js
// Modal attendees management

async function renderModalAttendees() {
  if (!currentShiftId) return;
  
  const container = document.getElementById('modalAttendees');
  const addBox = document.getElementById('modalAddAttendee');
  
  const loadingOverlay = showLoading(container);
  
  try {
    const res = await fetch(`/shifts/attendees?shiftId=${currentShiftId}`);
    const attendees = res.ok ? await res.json() : [];
    
    const shiftRes = await fetch('/shifts');
    const shifts = shiftRes.ok ? await shiftRes.json() : [];
    const currentShift = shifts.find(s => s.id === currentShiftId);
    
    const isLeadership = LEADERSHIP_RANKS.includes(userGroupRank);
    
    const isShiftLeader = currentShift && currentUser && (
      currentShift.host === currentUser.username ||
      currentShift.cohost === currentUser.username ||
      currentShift.overseer === currentUser.username
    );
    
    const canEdit = isLeadership || isShiftLeader;
    
    document.getElementById('modalAttendeeCount').textContent = attendees.length;
    
    const labelsPromises = attendees.map(async a => {
      try {
        const labelRes = await fetch(`/settings/labels/${a.roblox_id}`);
        const labels = labelRes.ok ? await labelRes.json() : [];
        return { ...a, labels };
      } catch {
        return { ...a, labels: [] };
      }
    });
    
    const attendeesWithLabels = await Promise.all(labelsPromises);
    
    const management = attendeesWithLabels.filter(a => a.labels.includes('Management'));
    const publicRelations = attendeesWithLabels.filter(a => a.labels.includes('Public Relations'));
    const operations = attendeesWithLabels.filter(a => a.labels.includes('Operations'));
    const humanResources = attendeesWithLabels.filter(a => a.labels.includes('Human Resources'));
    const supervision = attendeesWithLabels.filter(a => a.labels.includes('Supervision'));
    const others = attendeesWithLabels.filter(a => a.labels.length === 0);
    
    container.innerHTML = '';
    
    if (management.length > 0) {
      const managementDiv = document.createElement('div');
      managementDiv.className = 'attendee-category';
      managementDiv.innerHTML = '<div class="attendee-category-title">Management</div>';
      
      management.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        managementDiv.appendChild(box);
      });
      
      container.appendChild(managementDiv);
    }
    
    if (publicRelations.length > 0) {
      const prDiv = document.createElement('div');
      prDiv.className = 'attendee-category';
      prDiv.innerHTML = '<div class="attendee-category-title">Public Relations</div>';
      
      publicRelations.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        prDiv.appendChild(box);
      });
      
      container.appendChild(prDiv);
    }
    
    if (operations.length > 0) {
      const opsDiv = document.createElement('div');
      opsDiv.className = 'attendee-category';
      opsDiv.innerHTML = '<div class="attendee-category-title">Operations</div>';
      
      operations.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        opsDiv.appendChild(box);
      });
      
      container.appendChild(opsDiv);
    }
    
    if (humanResources.length > 0) {
      const hrDiv = document.createElement('div');
      hrDiv.className = 'attendee-category';
      hrDiv.innerHTML = '<div class="attendee-category-title">Human Resources</div>';
      
      humanResources.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        hrDiv.appendChild(box);
      });
      
      container.appendChild(hrDiv);
    }
    
    if (supervision.length > 0) {
      const supervisionDiv = document.createElement('div');
      supervisionDiv.className = 'attendee-category';
      supervisionDiv.innerHTML = '<div class="attendee-category-title">Supervision</div>';
      
      supervision.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        supervisionDiv.appendChild(box);
      });
      
      container.appendChild(supervisionDiv);
    }
    
    if (others.length > 0) {
      const othersDiv = document.createElement('div');
      othersDiv.className = 'attendee-category';
      othersDiv.innerHTML = '<div class="attendee-category-title">Other Attendees</div>';
      
      others.forEach(a => {
        const box = createAttendeeBox(a, canEdit);
        othersDiv.appendChild(box);
      });
      
      container.appendChild(othersDiv);
    }

    if (canEdit) {
      addBox.style.display = 'flex';
      addBox.onclick = async e => {
        e.stopPropagation();
        if(addBox.querySelector('.add-attendee-search')) return;

        const res = await fetch('/dashboard/players');
        const allPlayers = res.ok ? await res.json() : [];
        
        const eligiblePlayers = isLeadership 
          ? allPlayers 
          : allPlayers.filter(p => DIRECTOR_PLUS.includes(p.group_rank));
        
        const labelsPromises = eligiblePlayers.map(async p => {
          try {
            const labelRes = await fetch(`/settings/labels/${p.roblox_id}`);
            const labels = labelRes.ok ? await labelRes.json() : [];
            return { ...p, labels };
          } catch {
            return { ...p, labels: [] };
          }
        });
        
        const playersWithLabels = await Promise.all(labelsPromises);
        
        const management = playersWithLabels.filter(p => p.labels.includes('Management'));
        const corporate = playersWithLabels.filter(p => 
          p.labels.includes('Head Corporate') || 
          p.labels.includes('Senior Corporate') || 
          p.labels.includes('Junior Corporate') || 
          p.labels.includes('Corporate Intern')
        );
        const publicRelations = playersWithLabels.filter(p => p.labels.includes('Public Relations'));
        const operations = playersWithLabels.filter(p => p.labels.includes('Operations'));
        const humanResources = playersWithLabels.filter(p => p.labels.includes('Human Resources'));
        const supervision = playersWithLabels.filter(p => p.labels.includes('Supervision'));
        const others = playersWithLabels.filter(p => p.labels.length === 0);
        
        addBox.style.background = '#fff';
        addBox.style.border = '2px solid #42b4ff';
        addBox.style.padding = '0';
        addBox.style.marginTop = '10px';
        addBox.style.width = '100%';
        addBox.style.maxWidth = '600px';
        addBox.innerHTML = `
          <div class="add-attendee-search" style="width:100%;">
            <input type="text" placeholder="Search players by username or rank..." class="attendee-search-input" style="width:100%;padding:12px 15px;border:1px solid #e0e6f0;border-radius:8px 8px 0 0;outline:none;box-sizing:border-box;font-size:14px;">
            <div class="attendee-search-results" style="max-height:400px;overflow-y:auto;background:#f9f9f9;border:1px solid #e0e6f0;border-top:none;">
              ${createCategoryHTML('Management', management)}
              ${createCategoryHTML('Corporate', corporate)}
              ${createCategoryHTML('Public Relations', publicRelations)}
              ${createCategoryHTML('Operations', operations)}
              ${createCategoryHTML('Human Resources', humanResources)}
              ${createCategoryHTML('Supervision', supervision)}
              ${createCategoryHTML('Other', others)}
            </div>
          </div>
        `;
        
        addSearchStyles();
        
        setTimeout(() => {
          const attendeeItems = addBox.querySelectorAll('.attendee-search-item');
          attendeeItems.forEach(item => {
            item.addEventListener('click', async () => {
              const robloxId = item.dataset.robloxId;
              const username = item.dataset.username;
              
              await fetch('/shifts/add-attendee', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({shiftId: currentShiftId, robloxId, username})
              });
              
              await renderModalAttendees();
            });
          });
        }, 100);
        
        const searchInput = addBox.querySelector('.attendee-search-input');
        searchInput.addEventListener('input', () => {
          const query = searchInput.value.toLowerCase().trim();
          
          if (!query) {
            const attendeeItems = addBox.querySelectorAll('.attendee-search-item');
            attendeeItems.forEach(item => {
              item.classList.remove('hidden');
            });
            
            const categories = addBox.querySelectorAll('.attendee-search-category');
            const categoryTitles = addBox.querySelectorAll('.attendee-category-title');
            categories.forEach((category, index) => {
              category.style.display = 'block';
              categoryTitles[index].style.display = 'block';
            });
            return;
          }
          
          const attendeeItems = addBox.querySelectorAll('.attendee-search-item');
          attendeeItems.forEach(item => {
            const username = item.dataset.username.toLowerCase();
            const rank = item.querySelector('.attendee-search-rank').textContent.toLowerCase();
            
            if (username.includes(query) || rank.includes(query)) {
              item.classList.remove('hidden');
            } else {
              item.classList.add('hidden');
            }
          });
          
          const categories = addBox.querySelectorAll('.attendee-search-category');
          categories.forEach(category => {
            const visibleItems = category.querySelectorAll('.attendee-search-item:not(.hidden)');
            const categoryTitle = category.previousElementSibling;
            
            if (visibleItems.length === 0) {
              category.style.display = 'none';
              categoryTitle.style.display = 'none';
            } else {
              category.style.display = 'block';
              categoryTitle.style.display = 'block';
            }
          });
        });
        
        searchInput.focus();
      };
    } else {
      addBox.style.display = 'none';
    }
  } catch(err) {
    console.error('Error loading attendees:', err);
  } finally {
    hideLoading(loadingOverlay);
  }
}

function createCategoryHTML(categoryName, players) {
  return `
    <div class="attendee-category" style="margin:0;">
      <div class="attendee-category-title">${categoryName}</div>
      <div class="attendee-search-category" data-category="${categoryName.toLowerCase().replace(' ', '')}">
        ${players.length > 0 ? players.map(p => `
          <div class="attendee-search-item" data-roblox-id="${p.roblox_id}" data-username="${p.username}">
            <div class="attendee-search-avatar">
              <img src="${p.avatar_url || 'https://placehold.co/40x40/e0e6f0/5f6c7b?text=U'}" onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
            </div>
            <div class="attendee-search-info">
              <div class="attendee-search-name">${p.username}</div>
              <div class="attendee-search-rank">${p.group_rank}</div>
            </div>
          </div>
        `).join('') : '<div class="no-results">No ' + categoryName.toLowerCase() + ' staff available</div>'}
      </div>
    </div>
  `;
}

function addSearchStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .add-attendee-search {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }
    .attendee-search-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border-bottom: 1px solid #e0e6f0;
      cursor: pointer;
      transition: background 0.2s;
    }
    .attendee-search-item:hover {
      background: #f0f8ff;
    }
    .attendee-search-item.hidden {
      display: none;
    }
    .attendee-search-avatar {
      width: 45px;
      height: 45px;
      margin-right: 12px;
      flex-shrink: 0;
    }
    .attendee-search-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e0e6f0;
    }
    .attendee-search-info {
      flex: 1;
      min-width: 0;
    }
    .attendee-search-name {
      font-weight: 600;
      color: #333;
      font-size: 15px;
      margin-bottom: 2px;
      word-break: break-word;
    }
    .attendee-search-rank {
      font-size: 13px;
      color: #666;
    }
    .no-results {
      padding: 15px;
      text-align: center;
      color: #888;
      font-style: italic;
      font-size: 14px;
    }
    .attendee-search-input {
      font-family: 'Roboto', sans-serif;
    }
    .attendee-search-input:focus {
      border-color: #42b4ff;
      box-shadow: 0 0 0 2px rgba(66, 180, 255, 0.2);
    }
  `;
  document.head.appendChild(style);
}

function createAttendeeBox(attendee, canEdit) {
  const box = document.createElement('div');
  box.className = 'attendee-box';
  
  if (canEdit) {
    box.innerHTML = `<span>${attendee.username}</span><button data-robloxid="${attendee.roblox_id}">×</button>`;
    const removeBtn = box.querySelector('button');
    if (removeBtn) {
      removeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await fetch('/shifts/remove-attendee', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({shiftId: currentShiftId, robloxId: attendee.roblox_id})
        });
        renderModalAttendees();
      });
    }
  } else {
    box.innerHTML = `<span>${attendee.username}</span>`;
  }
  
  return box;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUser();
});
