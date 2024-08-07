// src/services/userParser/userCategorizer.js

const { getLastSeen, isRecentlyActive, hasNormalName } = require('./utils');

class UserCategorizer {
  constructor(userParser) {
    this.userParser = userParser;
  }

  async categorizeUsers(users, audienceDescription, depth) {
    const categories = {
      best: [],
      good: [],
      normal: [],
      mediocre: []
    };

    for (const user of users) {
      const category = await this.categorizeUser(user, audienceDescription);
      if (Object.keys(categories).indexOf(category) < depth) {
        categories[category].push(user);
      }
    }

    return categories;
  }

  async categorizeUser(user, audienceDescription) {
    const bio = user.about || '';
    const lastSeen = getLastSeen(user.status);
    const hasRecentActivity = isRecentlyActive(lastSeen);
    const hasNormalName = hasNormalName(user.firstName, user.lastName);
    const bioScore = await this.userParser.bioEvaluator.evaluateBio(bio, audienceDescription);
    const hasChannel = !!user.username;

    if (bio && bioScore > 0.7 && hasRecentActivity) {
      return 'best';
    } else if (bio && hasChannel && hasRecentActivity) {
      return 'good';
    } else if (bio && hasRecentActivity && hasNormalName) {
      return 'normal';
    } else if (hasRecentActivity && hasNormalName) {
      return 'mediocre';
    } else {
      return 'mediocre';
    }
  }
}

module.exports = UserCategorizer;