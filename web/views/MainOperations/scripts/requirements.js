// MainOperations/scripts/requirements.js
// Weekly requirements tracking

async function renderRequirementsBox() {
  try {
    const requirementsBox = document.getElementById('requirementsBox');
    
    if (!currentUser || !currentUserLabels.length) {
      requirementsBox.innerHTML = '<p style="text-align:center;color:#888;">No department assignments</p>';
      document.getElementById('userRequirements').style.display = 'none';
      return;
    }
    
    const userRes = await fetch('/dashboard/players');
    const allPlayers = userRes.ok ? await userRes.json() : [];
    const freshUserData = allPlayers.find(p => p.roblox_id === currentUser.roblox_id);
    
    const stats = await calculateShiftStats();
    const userStats = stats[currentUser.username.toLowerCase()] || { hosted: 0, attended: 0 };
    
    const weeklyMinutes = freshUserData?.weekly_minutes || 0;
    
    const tagRequirements = {
      'Management': { type: 'shifts', action: 'attended', required: 2, current: userStats.attended },
      'Public Relations': { type: 'shifts', action: 'attended', required: 2, current: userStats.attended },
      'Operations': { type: 'shifts', action: 'hosted', required: 2, current: userStats.hosted },
      'Human Resources': { type: 'shifts', action: 'hosted', required: 2, current: userStats.hosted },
      'Supervision': { type: 'minutes', required: 90, current: weeklyMinutes }
    };
    
    let requirementsHTML = '';
    
    currentUserLabels.forEach(label => {
      if (tagRequirements[label]) {
        const req = tagRequirements[label];
        const progress = Math.min((req.current / req.required) * 100, 100);
        const isComplete = req.current >= req.required;
        
        let progressText = '';
        if (req.type === 'shifts') {
          progressText = `${req.current}/${req.required} shifts ${req.action}`;
        } else {
          progressText = `${req.current}/${req.required} minutes`;
        }
        
        requirementsHTML += `
          <div class="requirement-tag">
            <div>
              <div class="requirement-tag-name">${label}</div>
              <div class="requirement-tag-desc">${progressText}</div>
            </div>
            <div class="progress-bar" style="width:150px;">
              <div class="progress-fill" style="width: ${progress}%; background: ${isComplete ? '#28a745' : '#42b4ff'};"></div>
            </div>
          </div>
        `;
      }
    });
    
    if (requirementsHTML) {
      requirementsBox.innerHTML = requirementsHTML;
    } else {
      requirementsBox.innerHTML = '<p style="text-align:center;color:#888;">No requirements to display</p>';
    }
    
    document.getElementById('userRequirements').style.display = 'none';
    
  } catch (err) {
    console.error('Error rendering requirements box:', err);
    const requirementsBox = document.getElementById('requirementsBox');
    requirementsBox.innerHTML = '<p style="text-align:center;color:#888;">Error loading requirements</p>';
    document.getElementById('userRequirements').style.display = 'none';
  }
}
