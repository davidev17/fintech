function canTransfer(balance, amount) {
  if (amount <= 0) return false;
  if (balance < amount) return false;
  return true;
}

module.exports = { canTransfer };