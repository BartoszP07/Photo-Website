module.exports = {
  apps: [
    {
      name: "Photo-Website",
      script: "server/server.js",
      env: {
        NODE_ENV: "production",
        SERVER_PORT: "3000",
      },
    },
  ],
};
