const { randomBytes } = require('crypto');
module.exports = (date = new Date()) => {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '');
  return `FRT-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
};
