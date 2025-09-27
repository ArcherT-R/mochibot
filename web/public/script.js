const searchBar = document.getElementById('searchBar');
const searchResults = document.getElementById('searchResults');

searchBar.addEventListener('input', async () => {
  const query = searchBar.value.trim();
  if (!query) {
    searchResults.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`/dashboard/search/username=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to fetch search results');
    const data = await res.json();

    if (data.length === 0) {
      searchResults.innerHTML = '<div class="no-results">No players found</div>';
      return;
    }

    searchResults.innerHTML = data.map(p =>
      `<div class="search-result"><a href="/dashboard/search?username=${encodeURIComponent(p.username)}">${p.username}</a></div>`
    ).join('');
  } catch (err) {
    console.error('Search error:', err);
    searchResults.innerHTML = '<div class="no-results">Error fetching results</div>';
  }
});

// Navigate to first search result on Enter key
searchBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const firstResultLink = document.querySelector('#searchResults a');
    if (firstResultLink) {
      window.location.href = firstResultLink.href;
    }
  }
});
