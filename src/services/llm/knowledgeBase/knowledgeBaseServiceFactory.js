// src/services/llm/knowledgeBaseServiceFactory.js

const KnowledgeBaseService = require('./knowledgeBaseService');

class KnowledgeBaseServiceFactory {
  constructor() {
    this.instances = new Map();
  }

  getInstanceForCampaign(campaignId) {
    if (!this.instances.has(campaignId)) {
      const newInstance = new KnowledgeBaseService();
      newInstance.campaignId = campaignId;
      this.instances.set(campaignId, newInstance);
    }
    return this.instances.get(campaignId);
  }

  removeInstance(campaignId) {
    this.instances.delete(campaignId);
  }

  clearAllInstances() {
    this.instances.clear();
  }
}

module.exports = new KnowledgeBaseServiceFactory();