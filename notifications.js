// notification.js
class NotificationManager {
  constructor() {
    this.notifications = [];
    this.robloxId = null;
    this.notificationIcon = null;
    this.notificationBadge = null;
    this.notificationDropdown = null;
  }

  init(robloxId) {
    this.robloxId = robloxId;
    this.notificationIcon = document.getElementById('notificationIcon');
    this.notificationBadge = document.getElementById('notificationBadge');
    this.notificationDropdown = document.getElementById('notificationDropdown');
    
    // Load notifications
    this.loadNotifications();
    
    // Set up polling for new notifications
    setInterval(() => this.loadNotifications(), 30000); // Check every 30 seconds
  }

  async loadNotifications() {
    try {
      const response = await fetch(`/notifications/${this.robloxId}`);
      if (!response.ok) return;
      
      const data = await response.json();
      this.notifications = data.notifications || [];
      
      this.renderNotifications();
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  renderNotifications() {
    if (!this.notificationDropdown) return;
    
    // Update badge
    if (this.notifications.length > 0) {
      this.notificationBadge.textContent = this.notifications.length > 99 ? '99+' : this.notifications.length;
      this.notificationBadge.style.display = 'flex';
    } else {
      this.notificationBadge.style.display = 'none';
    }
    
    // Clear dropdown
    this.notificationDropdown.innerHTML = '';
    
    if (this.notifications.length === 0) {
      this.notificationDropdown.innerHTML = '<div class="notification-empty">No notifications</div>';
      return;
    }
    
    // Add notifications to dropdown
    this.notifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = 'notification-item';
      
      const createdDate = new Date(notification.created_at);
      const formattedDate = createdDate.toLocaleDateString();
      const formattedTime = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      notificationItem.innerHTML = `
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-action">${notification.action_text}</div>
        <div class="notification-time">${formattedDate} at ${formattedTime}</div>
      `;
      
      // Add click handler if there's an action URL
      if (notification.action_url) {
        notificationItem.addEventListener('click', () => {
          window.location.href = notification.action_url;
        });
      }
      
      this.notificationDropdown.appendChild(notificationItem);
    });
  }

  async markAsRead(notificationId) {
    try {
      await fetch(`/notifications/${this.robloxId}/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      
      // Remove from local array and re-render
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.renderNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      await fetch(`/notifications/${this.robloxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read_all: true })
      });
      
      // Clear local array and re-render
      this.notifications = [];
      this.renderNotifications();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}

// Make it globally available
window.NotificationManager = NotificationManager;
