// MainOperations/scripts/announcements.js
// Announcements management

let announcements = [];

async function loadAnnouncements() {
  try {
    const response = await fetch('/dashboard/announcements');
    announcements = await response.json();
    
    renderLatestAnnouncement();
    
    if (LEADERSHIP_RANKS.includes(userGroupRank)) {
      document.getElementById('newAnnouncementBtn').style.display = 'block';
    }
  } catch (err) {
    console.error('Failed to load announcements:', err);
  }
}

function renderLatestAnnouncement() {
  const latestAnnouncement = document.getElementById('latestAnnouncement');
  
  if (announcements.length === 0) {
    latestAnnouncement.innerHTML = '<p>No announcements available.</p>';
    return;
  }
  
  const latest = announcements[0];
  const date = new Date(latest.date);
  
  latestAnnouncement.innerHTML = `
    <div class="announcement-title">${latest.title}</div>
    <div class="announcement-content">${latest.content}</div>
    <div class="announcement-meta">
      <span>By: ${latest.author}</span>
      <span>${date.toLocaleDateString()}</span>
    </div>
  `;
}

function openAnnouncementsModal() {
  const modal = document.getElementById('announcementsModal');
  const modalList = document.getElementById('announcementsModalList');
  
  modalList.innerHTML = '';
  
  if (announcements.length === 0) {
    modalList.innerHTML = '<p>No announcements available.</p>';
  } else {
    announcements.forEach((announcement, index) => {
      const date = new Date(announcement.date || announcement.created_at);
      const item = document.createElement('div');
      item.className = 'announcement-item';
      
      const canDelete = LEADERSHIP_RANKS.includes(userGroupRank);
      
      item.innerHTML = `
        <div class="announcement-title">${announcement.title}</div>
        <div class="announcement-content" style="white-space: pre-wrap;">${announcement.content}</div>
        <div class="announcement-meta">
          <span>By: ${announcement.author}</span>
          <span>${date.toLocaleDateString()}</span>
        </div>
        ${canDelete ? `
          <div style="margin-top:10px;text-align:right;">
            <button class="btn small" onclick="deleteAnnouncementByIndex(${index})" style="background:#ff4444;">
              Delete
            </button>
          </div>
        ` : ''}
     `;
      modalList.appendChild(item);
    });
  }
  
  modal.style.display = 'block';
}

window.closeAnnouncementsModal = function() {
  document.getElementById('announcementsModal').style.display = 'none';
};

function openNewAnnouncementModal() {
  document.getElementById('newAnnouncementModal').style.display = 'block';
}

window.closeNewAnnouncementModal = function() {
  document.getElementById('newAnnouncementModal').style.display = 'none';
};

async function submitNewAnnouncement(event) {
  event.preventDefault();
  
  const title = document.getElementById('announcementTitle').value;
  const content = document.getElementById('announcementContent').value;
  
  if (!title || !content) return;
  
  try {
    const response = await fetch('/dashboard/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        content,
        author: currentUser.username
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save announcement');
    }
    
    const newAnnouncement = await response.json();
    
    announcements.unshift(newAnnouncement);
    
    renderLatestAnnouncement();
    
    closeNewAnnouncementModal();
    document.getElementById('announcementForm').reset();
  } catch (error) {
    console.error('Error saving announcement:', error);
    alert('Failed to save announcement. Please try again.');
  }
}

window.deleteAnnouncementByIndex = function(index) {
  const announcement = announcements[index];
  if (!announcement) return;
  
  if (!confirm('Are you sure you want to delete this announcement?')) {
    return;
  }
  
  try {
    const deleteData = announcement.id 
      ? { id: announcement.id }
      : { 
          title: announcement.title, 
          date: announcement.date || announcement.created_at
        };
    
    fetch('/dashboard/announcements', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(deleteData)
    })
    .then(response => {
      if (response.ok) {
        announcements.splice(index, 1);
        
        openAnnouncementsModal();
        
        if (announcements.length === 0) {
          document.getElementById('latestAnnouncement').innerHTML = '<p>No announcements available.</p>';
        } else {
          renderLatestAnnouncement();
        }
      } else {
        alert('Failed to delete announcement. Please try again.');
      }
    })
    .catch(error => {
      console.error('Error deleting announcement:', error);
      alert('Error deleting announcement. Please try again.');
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    alert('Error deleting announcement. Please try again.');
  }
};

// Initialize announcements
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('viewAllAnnouncementsBtn').addEventListener('click', openAnnouncementsModal);
  document.getElementById('newAnnouncementBtn').addEventListener('click', openNewAnnouncementModal);
  document.getElementById('announcementForm').addEventListener('submit', submitNewAnnouncement);
  
  window.addEventListener('click', function(e) {
    const announcementsModal = document.getElementById('announcementsModal');
    const newAnnouncementModal = document.getElementById('newAnnouncementModal');
    
    if (e.target === announcementsModal) {
      closeAnnouncementsModal();
    }
    
    if (e.target === newAnnouncementModal) {
      closeNewAnnouncementModal();
    }
  });
});
