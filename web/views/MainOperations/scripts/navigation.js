// MainOperations/scripts/navigation.js
// Tab navigation functionality

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.dataset.disabled === 'true') {
        e.preventDefault();
        return;
      }

      const tab = btn.dataset.tab;

      if (tab === 'playerlist' && !DIRECTOR_PLUS.includes(userGroupRank)) {
        alert('Access Denied: Player List requires Mochi Director+');
        return;
      }

      if (tab === 'settings' && !EXECUTIVE_RANKS.includes(userGroupRank)) {
        alert('Access Denied: Settings requires Vice Chairman+');
        return;
      }

      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(tab).classList.add('active');
    });
  });
});
