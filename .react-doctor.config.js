module.exports = {
  rules: {
    'require-server-action-auth': {
      severity: 'error',
      options: {
        // Tell React Doctor to recognize your custom auth helper
        authFunctionNames: ['requireAdminSession']
      }
    }
  }
}