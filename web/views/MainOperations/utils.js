// MainOperations/scripts/utils.js
// Utility functions used across the dashboard

// Function to show loading indicator
function showLoading(element) {
  if (!element) return;
  
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
  
  // Make the parent container relative if it's not already
  if (element.style.position !== 'relative' && element.style.position !== 'absolute') {
    element.style.position = 'relative';
  }
  
  element.appendChild(loadingOverlay);
  return loadingOverlay;
}

// Function to hide loading indicator
function hideLoading(loadingOverlay) {
  if (loadingOverlay && loadingOverlay.parentNode) {
    loadingOverlay.parentNode.removeChild(loadingOverlay);
  }
}

// Function to format shift time
function formatShiftTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const tomorrow = new Date(); 
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dateStr = d.toDateString() === now.toDateString() ? 'Today'
              : d.toDateString() === tomorrow.toDateString() ? 'Tomorrow'
              : d.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'});
  
  const timeStr = d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit', hour12:true});
  
  return {date: dateStr, time: timeStr};
}

// Function to calculate live minutes
function calculateLiveMinutes(player) {
  if (player.ongoing_session_start_time) {
    const elapsed = Date.now() - new Date(player.ongoing_session_start_time).getTime();
    return elapsed > 0 ? elapsed / 1000 / 60 : 0;
  }
  return 0;
}

// Function to get total minutes
function getTotalMinutes(player) { 
  return (player.weekly_minutes || 0) + calculateLiveMinutes(player); 
}

// Function to format minutes
function formatMinutes(total) {
  if (total < 1) return '0 min';
  const mins = Math.round(total);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

// Function to mask password
function maskPassword(pwd) {
  if (!pwd) return '';
  return '•'.repeat(pwd.length);
}

// Simple Levenshtein distance function for username matching
function getLevenshteinDistance(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i-1][j] + 1,
        matrix[i][j-1] + 1,
        matrix[i-1][j-1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

// Find closest username from a list
function findClosestUsername(target, usernames) {
  target = target.toLowerCase();
  let closest = target;
  let minDistance = Infinity;

  usernames.forEach(name => {
    const distance = getLevenshteinDistance(target, name.toLowerCase());
    if (distance < minDistance) {
      minDistance = distance;
      closest = name;
    }
  });

  return closest;
}
