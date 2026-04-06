describe('Login', () => {
  it('deve logar com sucesso', () => {
    cy.visit('http://localhost:3000');
    cy.get('input[name=email]').type('david@test.com');
    cy.get('input[name=password]').type('123456');
    cy.get('button[type=submit]').click();
    cy.contains('Dashboard');
  });
});