// src/services/llm/utils/getTime.js

function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return `${hours}:${minutes} ${day}.${month}.${year}`;
}

module.exports = {
  getCurrentTime,
};