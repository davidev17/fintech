const http = require('http');

http.get('http://localhost:3000/health', (res) => {
  if (res.statusCode === 200) {
    console.log('Smoke test OK');
    process.exit(0);
  } else {
    console.error(`Smoke test falhou: ${res.statusCode}`);
    process.exit(1);
  }
}).on('error', (err) => {
  console.error('Erro no smoke test:', err.message);
  process.exit(1);
});