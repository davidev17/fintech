const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║     FinBank DevSecOps Lab v1.0       ║
  ║     Running on port ${PORT}             ║
  ║     ENV: ${process.env.NODE_ENV || 'development'}               ║
  ╚══════════════════════════════════════╝
  `);
});