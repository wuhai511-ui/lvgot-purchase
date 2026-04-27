module.exports = {
  apps: [{
    name: 'lvgot-bff-qzt',
    script: './server.js',
    cwd: '/opt/lvgot-purchase/bff-server',
    env: {
      PORT: 3000,
      NODE_ENV: 'production'
    }
  }]
};
