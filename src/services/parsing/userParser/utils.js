// // src/services/userParser/utils.js

// const { client } = require('../../../main');

// function getLastSeen(status) {
//   if (status instanceof client.Api.UserStatusOnline) {
//     return new Date();
//   } else if (status instanceof client.Api.UserStatusOffline) {
//     return new Date(status.wasOnline * 1000);
//   }
//   return null;
// }

// function isRecentlyActive(lastSeen) {
//   if (!lastSeen) return false;
//   const oneWeekAgo = new Date();
//   oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
//   return lastSeen > oneWeekAgo;
// }

// function hasNormalName(firstName, lastName) {
//   const name = `${firstName || ''} ${lastName || ''}`.trim();
//   return name.length > 0 && !/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(name);
// }

// module.exports = {
//   getLastSeen,
//   isRecentlyActive,
//   hasNormalName
// };