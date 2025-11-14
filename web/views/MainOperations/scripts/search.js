// MainOperations/scripts/search.js
// Player search functionality

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('playerSearch');
  const suggestionsBox = document.getElementById('suggestions');

  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (!q) { 
      suggestionsBox.innerHTML = ''; 
      return; 
    }
    
    try {
      const res = await fetch(`/dashboard/search?username=${encodeURIComponent(q)}`);
      const players = res.ok ? await res.json() : [];
      
      suggestionsBox.innerHTML = players.map(p => `
        <div class="suggestion-item" onclick="window.location='/dashboard/player/${p.username}'">
          <img src="https://www.roblox.com/headshot-thumbnail/image?userId=${p.roblox_id}&width=40&height=40&format=png"
               onerror="this.src='https://placehold.co/40x40/e0e6f0/5f6c7b?text=U';"/>
          <span>${p.username}</span>
        </div>`).join('');
    } catch (err) { 
      suggestionsBox.innerHTML = ''; 
      console.error(err); 
    }
  });
  
  // Close suggestions when clicking outside
  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.innerHTML = '';
    }
  });
});
