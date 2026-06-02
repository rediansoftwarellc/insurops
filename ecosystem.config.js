// PM2 process manager config — used on the Hostinger VPS
// Start: pm2 start ecosystem.config.js --env production
// Docs:  https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name       : 'insurops',
      script     : 'server.js',
      instances  : 'max',          // one worker per CPU core
      exec_mode  : 'cluster',      // cluster mode for load balancing
      node_args  : '--max-old-space-size=256',

      // ── Environment: local dev ──
      env: {
        NODE_ENV : 'development',
        PORT     : 3000
      },

      // ── Environment: Hostinger production ──
      env_production: {
        NODE_ENV : 'production',
        PORT     : 3000           // Nginx will reverse-proxy :80/:443 → :3000
      },

      // ── Logging ──
      out_file   : '/var/log/insurops/out.log',
      error_file : '/var/log/insurops/err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs : true,

      // ── Auto-restart on crash ──
      watch      : false,
      max_restarts: 10,
      restart_delay: 2000,

      // ── Graceful shutdown ──
      kill_timeout: 5000,
      listen_timeout: 8000
    }
  ]
};
