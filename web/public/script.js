document.addEventListener('DOMContentLoaded', () => {
  const searchBar = document.getElementById('searchBar');
  const searchResults = document.getElementById('searchResults');

  if (!searchBar) return;

  searchBar.addEventListener('input', async () => {
    const query = searchBar.value.trim();
    if (!query) {
      searchResults.innerHTML = '';
      return;
    }

    try {
      const res = await fetch(`/dashboard/search?username=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      searchResults.innerHTML = data.map(player =>
        `<div class="search-item">
           <a href="/dashboard/player/${player.username}">${player.username}</a>
         </div>`
      ).join('');
    } catch (err) {
      console.error(err);
      searchResults.innerHTML = `<div class="search-error">Error fetching results</div>`;
    }
  });
});
