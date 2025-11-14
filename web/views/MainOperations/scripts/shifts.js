// MainOperations/scripts/shifts.js
// Shifts management and display

let currentShiftId = null;

async function loadShifts() {
  const shiftsList = document.getElementById('shiftsList');
  const loadingOverlay = showLoading(shiftsList);
  
  try {
    const res = await fetch('/shifts');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const shifts = await res.json();

    const now = Date.now();

    const sortedShifts = shifts.sort((a, b) => {
      const timeA = a.shift_time || a.time;
      const timeB = b.shift_time || b.time;
      const tsA = timeA.toString().length === 10 ? timeA * 1000 : timeA;
      const tsB = timeB.toString().length === 10 ? timeB * 1000 : timeB;
      return tsA - tsB;
    });

    if (!sortedShifts.length) {
      shiftsList.innerHTML = '<div class="no-data">No shifts found.</div>';
      hideLoading(loadingOverlay);
      return;
    }

    const shiftsByDay = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    sortedShifts.forEach(shift => {
      const shiftTime = shift.shift_time || shift.time;
      const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
      const shiftDate = new Date(timestamp);
      const dayOfWeek = dayNames[shiftDate.getDay()];
      
      if (!shiftsByDay[dayOfWeek]) {
        shiftsByDay[dayOfWeek] = [];
      }
      
      shiftsByDay[dayOfWeek].push(shift);
    });

    shiftsList.innerHTML = '';
    
    for (const dayOfWeek of dayNames) {
      if (shiftsByDay[dayOfWeek] && shiftsByDay[dayOfWeek].length > 0) {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'attendee-category-title';
        dayHeader.textContent = dayOfWeek;
        shiftsList.appendChild(dayHeader);
        
        const dayShiftsContainer = document.createElement('div');
        dayShiftsContainer.className = 'shifts-list';
        shiftsList.appendChild(dayShiftsContainer);
        
        shiftsByDay[dayOfWeek].forEach((shift) => {
          const shiftTime = shift.shift_time || shift.time;
          const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
          const {date, time} = formatShiftTime(new Date(timestamp));
          const isPast = timestamp < now;

          const card = document.createElement('div');
          card.className = 'shift-card';
          card.style.cursor = 'pointer';
          card.addEventListener('click', () => openShiftModal(shift));

          card.innerHTML = `
            <div class="shift-header">
              <div class="shift-left">
                <span class="shift-icon">🏷️️</span>
                <div class="shift-info">
                  <div class="shift-datetime">${date} at ${time}</div>
                  <div class="shift-host-preview">Host: ${shift.host || 'TBD'}</div>
                </div>
              </div>
              <span class="shift-arrow">${isPast ? '⬅️' : '→'}</span>
            </div>
            ${isPast ? '<div style="margin-top:8px;color:#888;font-weight:600;font-size:14px;">Past Shift</div>' : ''}
          `;
          dayShiftsContainer.appendChild(card);
        });
        
        const spacer = document.createElement('div');
        spacer.style.marginBottom = '20px';
        shiftsList.appendChild(spacer);
      }
    }

  } catch (err) {
    console.error('Failed to load shifts:', err);
    shiftsList.innerHTML = '<div class="no-data">Failed to load shifts.</div>';
  } finally {
    hideLoading(loadingOverlay);
  }
}

async function openShiftModal(shift) {
  const modalBody = document.querySelector('.modal-body');
  const loadingOverlay = showLoading(modalBody);
  
  currentShiftId = shift.id;
  const shiftTime = shift.shift_time || shift.time;
  const timestamp = shiftTime.toString().length === 10 ? shiftTime * 1000 : shiftTime;
  const {date, time} = formatShiftTime(new Date(timestamp));
  
  document.getElementById('modalShiftTitle').textContent = `${date} at ${time}`;
  
  let rolesHTML = `<div class="role-item"><span class="role-label">📋 Host:</span><span class="role-name">${shift.host || 'TBD'}</span></div>`;
  if (shift.cohost) rolesHTML += `<div class="role-item"><span class="role-label">🤝 Co-Host:</span><span class="role-name">${shift.cohost}</span></div>`;
  if (shift.overseer) rolesHTML += `<div class="role-item"><span class="role-label">👁️ Overseer:</span><span class="role-name">${shift.overseer}</span></div>`;
  document.getElementById('modalRoles').innerHTML = rolesHTML;
  
  await renderModalAttendees();
  
  hideLoading(loadingOverlay);
  
  document.getElementById('shiftModal').style.display = 'block';
}

window.closeShiftModal = function() {
  document.getElementById('shiftModal').style.display = 'none';
  currentShiftId = null;
};

window.onclick = function(e) {
  const shiftModal = document.getElementById('shiftModal');
  if (e.target === shiftModal) closeShiftModal();
};

// Initialize shifts on page load
document.addEventListener('DOMContentLoaded', () => {
  loadShifts();
  setInterval(loadShifts, 60000);
});
