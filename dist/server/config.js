"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _os = _interopRequireDefault(require("os"));

function getIp() {
  var ipv4 = Object.values(_os["default"].networkInterfaces()).flatMap(function (x) {
    return x;
  }).find(function (x) {
    return x.family === 'IPv4' && !x.internal;
  });
  return ipv4 && ipv4.address;
}

var MODE = {
  production: 'production',
  development: 'development'
};
var env = {
  mode: process.env.Q_MODE || MODE.production,
  ssl: (process.env.Q_SSL || '') === 'true',
  database_server: process.env.Q_DATABASE_SERVER || 'arangodb:8529',
  database_name: process.env.Q_DATABASE_NAME || 'blockchain',
  server_host: process.env.Q_SERVER_HOST || getIp(),
  server_port: Number(process.env.Q_SERVER_PORT || 4000)
};
var config = {
  MODE: MODE,
  mode: env.mode,
  server: {
    host: env.server_host,
    port: env.server_port,
    ssl: env.ssl ? {
      port: 4001,
      key: 'server/ssl/server.key',
      cert: 'server/ssl/server.crt'
    } : null
  },
  database: {
    server: env.mode === MODE.production ? env.database_server : 'services.tonlabs.io:8529',
    name: env.database_name
  },
  listener: {
    restartTimeout: 1000
  }
};
var _default = config;
exports["default"] = _default;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9jb25maWcuanMiXSwibmFtZXMiOlsiZ2V0SXAiLCJpcHY0IiwiT2JqZWN0IiwidmFsdWVzIiwib3MiLCJuZXR3b3JrSW50ZXJmYWNlcyIsImZsYXRNYXAiLCJ4IiwiZmluZCIsImZhbWlseSIsImludGVybmFsIiwiYWRkcmVzcyIsIk1PREUiLCJwcm9kdWN0aW9uIiwiZGV2ZWxvcG1lbnQiLCJlbnYiLCJtb2RlIiwicHJvY2VzcyIsIlFfTU9ERSIsInNzbCIsIlFfU1NMIiwiZGF0YWJhc2Vfc2VydmVyIiwiUV9EQVRBQkFTRV9TRVJWRVIiLCJkYXRhYmFzZV9uYW1lIiwiUV9EQVRBQkFTRV9OQU1FIiwic2VydmVyX2hvc3QiLCJRX1NFUlZFUl9IT1NUIiwic2VydmVyX3BvcnQiLCJOdW1iZXIiLCJRX1NFUlZFUl9QT1JUIiwiY29uZmlnIiwic2VydmVyIiwiaG9zdCIsInBvcnQiLCJrZXkiLCJjZXJ0IiwiZGF0YWJhc2UiLCJuYW1lIiwibGlzdGVuZXIiLCJyZXN0YXJ0VGltZW91dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQ0E7O0FBRUEsU0FBU0EsS0FBVCxHQUF5QjtBQUNyQixNQUFNQyxJQUFJLEdBQUlDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjQyxlQUFHQyxpQkFBSCxFQUFkLENBQUQsQ0FDUkMsT0FEUSxDQUNBLFVBQUFDLENBQUM7QUFBQSxXQUFJQSxDQUFKO0FBQUEsR0FERCxFQUVSQyxJQUZRLENBRUgsVUFBQUQsQ0FBQztBQUFBLFdBQUlBLENBQUMsQ0FBQ0UsTUFBRixLQUFhLE1BQWIsSUFBdUIsQ0FBQ0YsQ0FBQyxDQUFDRyxRQUE5QjtBQUFBLEdBRkUsQ0FBYjtBQUdBLFNBQU9ULElBQUksSUFBSUEsSUFBSSxDQUFDVSxPQUFwQjtBQUNIOztBQUVELElBQU1DLElBQUksR0FBRztBQUNUQyxFQUFBQSxVQUFVLEVBQUUsWUFESDtBQUVUQyxFQUFBQSxXQUFXLEVBQUU7QUFGSixDQUFiO0FBS0EsSUFBTUMsR0FBRyxHQUFHO0FBQ1JDLEVBQUFBLElBQUksRUFBRUMsT0FBTyxDQUFDRixHQUFSLENBQVlHLE1BQVosSUFBc0JOLElBQUksQ0FBQ0MsVUFEekI7QUFFUk0sRUFBQUEsR0FBRyxFQUFFLENBQUNGLE9BQU8sQ0FBQ0YsR0FBUixDQUFZSyxLQUFaLElBQXFCLEVBQXRCLE1BQThCLE1BRjNCO0FBR1JDLEVBQUFBLGVBQWUsRUFBRUosT0FBTyxDQUFDRixHQUFSLENBQVlPLGlCQUFaLElBQWlDLGVBSDFDO0FBSVJDLEVBQUFBLGFBQWEsRUFBRU4sT0FBTyxDQUFDRixHQUFSLENBQVlTLGVBQVosSUFBK0IsWUFKdEM7QUFLUkMsRUFBQUEsV0FBVyxFQUFFUixPQUFPLENBQUNGLEdBQVIsQ0FBWVcsYUFBWixJQUE2QjFCLEtBQUssRUFMdkM7QUFNUjJCLEVBQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDWCxPQUFPLENBQUNGLEdBQVIsQ0FBWWMsYUFBWixJQUE2QixJQUE5QjtBQU5YLENBQVo7QUE4QkEsSUFBTUMsTUFBZSxHQUFHO0FBQ3BCbEIsRUFBQUEsSUFBSSxFQUFKQSxJQURvQjtBQUVwQkksRUFBQUEsSUFBSSxFQUFFRCxHQUFHLENBQUNDLElBRlU7QUFHcEJlLEVBQUFBLE1BQU0sRUFBRTtBQUNKQyxJQUFBQSxJQUFJLEVBQUVqQixHQUFHLENBQUNVLFdBRE47QUFFSlEsSUFBQUEsSUFBSSxFQUFFbEIsR0FBRyxDQUFDWSxXQUZOO0FBR0pSLElBQUFBLEdBQUcsRUFBRUosR0FBRyxDQUFDSSxHQUFKLEdBQ0M7QUFDRWMsTUFBQUEsSUFBSSxFQUFFLElBRFI7QUFFRUMsTUFBQUEsR0FBRyxFQUFFLHVCQUZQO0FBR0VDLE1BQUFBLElBQUksRUFBRTtBQUhSLEtBREQsR0FNQztBQVRGLEdBSFk7QUFjcEJDLEVBQUFBLFFBQVEsRUFBRTtBQUNOTCxJQUFBQSxNQUFNLEVBQUVoQixHQUFHLENBQUNDLElBQUosS0FBYUosSUFBSSxDQUFDQyxVQUFsQixHQUErQkUsR0FBRyxDQUFDTSxlQUFuQyxHQUFxRCwwQkFEdkQ7QUFFTmdCLElBQUFBLElBQUksRUFBRXRCLEdBQUcsQ0FBQ1E7QUFGSixHQWRVO0FBa0JwQmUsRUFBQUEsUUFBUSxFQUFFO0FBQ05DLElBQUFBLGNBQWMsRUFBRTtBQURWO0FBbEJVLENBQXhCO2VBdUJlVCxNIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQGZsb3dcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmZ1bmN0aW9uIGdldElwKCk6IHN0cmluZyB7XG4gICAgY29uc3QgaXB2NCA9IChPYmplY3QudmFsdWVzKG9zLm5ldHdvcmtJbnRlcmZhY2VzKCkpOiBhbnkpXG4gICAgICAgIC5mbGF0TWFwKHggPT4geClcbiAgICAgICAgLmZpbmQoeCA9PiB4LmZhbWlseSA9PT0gJ0lQdjQnICYmICF4LmludGVybmFsKTtcbiAgICByZXR1cm4gaXB2NCAmJiBpcHY0LmFkZHJlc3M7XG59XG5cbmNvbnN0IE1PREUgPSB7XG4gICAgcHJvZHVjdGlvbjogJ3Byb2R1Y3Rpb24nLFxuICAgIGRldmVsb3BtZW50OiAnZGV2ZWxvcG1lbnQnLFxufTtcblxuY29uc3QgZW52ID0ge1xuICAgIG1vZGU6IHByb2Nlc3MuZW52LlFfTU9ERSB8fCBNT0RFLnByb2R1Y3Rpb24sXG4gICAgc3NsOiAocHJvY2Vzcy5lbnYuUV9TU0wgfHwgJycpID09PSAndHJ1ZScsXG4gICAgZGF0YWJhc2Vfc2VydmVyOiBwcm9jZXNzLmVudi5RX0RBVEFCQVNFX1NFUlZFUiB8fCAnYXJhbmdvZGI6ODUyOScsXG4gICAgZGF0YWJhc2VfbmFtZTogcHJvY2Vzcy5lbnYuUV9EQVRBQkFTRV9OQU1FIHx8ICdibG9ja2NoYWluJyxcbiAgICBzZXJ2ZXJfaG9zdDogcHJvY2Vzcy5lbnYuUV9TRVJWRVJfSE9TVCB8fCBnZXRJcCgpLFxuICAgIHNlcnZlcl9wb3J0OiBOdW1iZXIocHJvY2Vzcy5lbnYuUV9TRVJWRVJfUE9SVCB8fCA0MDAwKSxcbn07XG5cbmV4cG9ydCB0eXBlIFFDb25maWcgPSB7XG4gICAgTU9ERTogeyBwcm9kdWN0aW9uOiBzdHJpbmcsIGRldmVsb3BtZW50OiBzdHJpbmcgfSxcbiAgICBtb2RlOiBzdHJpbmcsXG4gICAgc2VydmVyOiB7XG4gICAgICAgIGhvc3Q6IHN0cmluZyxcbiAgICAgICAgcG9ydDogbnVtYmVyLFxuICAgICAgICBzc2w6ID97XG4gICAgICAgICAgICBwb3J0OiBudW1iZXIsXG4gICAgICAgICAgICBrZXk6IHN0cmluZyxcbiAgICAgICAgICAgIGNlcnQ6IHN0cmluZyxcbiAgICAgICAgfSxcbiAgICB9LFxuICAgIGRhdGFiYXNlOiB7XG4gICAgICAgIHNlcnZlcjogc3RyaW5nLFxuICAgICAgICBuYW1lOiBzdHJpbmdcbiAgICB9LFxuICAgIGxpc3RlbmVyOiB7XG4gICAgICAgIHJlc3RhcnRUaW1lb3V0OiBudW1iZXJcbiAgICB9XG59XG5cbmNvbnN0IGNvbmZpZzogUUNvbmZpZyA9IHtcbiAgICBNT0RFLFxuICAgIG1vZGU6IGVudi5tb2RlLFxuICAgIHNlcnZlcjoge1xuICAgICAgICBob3N0OiBlbnYuc2VydmVyX2hvc3QsXG4gICAgICAgIHBvcnQ6IGVudi5zZXJ2ZXJfcG9ydCxcbiAgICAgICAgc3NsOiBlbnYuc3NsXG4gICAgICAgICAgICA/IHtcbiAgICAgICAgICAgICAgICBwb3J0OiA0MDAxLFxuICAgICAgICAgICAgICAgIGtleTogJ3NlcnZlci9zc2wvc2VydmVyLmtleScsXG4gICAgICAgICAgICAgICAgY2VydDogJ3NlcnZlci9zc2wvc2VydmVyLmNydCcsXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICA6IG51bGwsXG4gICAgfSxcbiAgICBkYXRhYmFzZToge1xuICAgICAgICBzZXJ2ZXI6IGVudi5tb2RlID09PSBNT0RFLnByb2R1Y3Rpb24gPyBlbnYuZGF0YWJhc2Vfc2VydmVyIDogJ3NlcnZpY2VzLnRvbmxhYnMuaW86ODUyOScsXG4gICAgICAgIG5hbWU6IGVudi5kYXRhYmFzZV9uYW1lXG4gICAgfSxcbiAgICBsaXN0ZW5lcjoge1xuICAgICAgICByZXN0YXJ0VGltZW91dDogMTAwMFxuICAgIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvbmZpZztcbiJdfQ==