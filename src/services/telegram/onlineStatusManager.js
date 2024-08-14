// src/services/telegram/onlineStatusManager.js

const logger = require('../../utils/logger');

class OnlineStatusManager {
    constructor() {
      this.onlineUsers = new Map();
      this.timeoutDuration = 20000; // 20 seconds
    }
  
    setOnline(userId, session) {
      if (this.onlineUsers.has(userId)) {
        clearTimeout(this.onlineUsers.get(userId));
      }
      this.onlineUsers.set(userId, setTimeout(() => this.setOffline(userId, session), this.timeoutDuration));
      return session.invoke(new Api.account.UpdateStatus({ offline: false }));
    }
  
    async setOffline(userId, session) {
      this.onlineUsers.delete(userId);
      await session.invoke(new Api.account.UpdateStatus({ offline: true }));
    }
  
    isOnline(userId) {
      return this.onlineUsers.has(userId);
    }
  }
  
  module.exports = new OnlineStatusManager();