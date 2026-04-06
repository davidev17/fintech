const { canTransfer } = require('../../src/services/transactionService');

describe('Transferências', () => {
  test('deve rejeitar valor menor ou igual a zero', () => {
    expect(canTransfer(100, 0)).toBe(false);
    expect(canTransfer(100, -10)).toBe(false);
  });

  test('deve rejeitar saldo insuficiente', () => {
    expect(canTransfer(50, 100)).toBe(false);
  });

  test('deve permitir transferência com saldo suficiente', () => {
    expect(canTransfer(100, 50)).toBe(true);
  });
});