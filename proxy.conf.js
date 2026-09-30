module.exports = {
  '/api/morph': {
    target: 'https://api.morphllm.com',
    changeOrigin: true,
    secure: true,
    pathRewrite: { '^/api/morph': '' },
  },
};