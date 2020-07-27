"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _express = _interopRequireDefault(require("express"));

var _http = _interopRequireDefault(require("http"));

var _apolloServerExpress = require("apollo-server-express");

var _subscriptionsTransportWs = require("subscriptions-transport-ws");

var _tonClientNodeJs = require("ton-client-node-js");

var _arango = _interopRequireDefault(require("./arango"));

var _config = require("./config");

var _qRpcServer = require("./q-rpc-server");

var _resolversGenerated = require("./resolvers-generated");

var _resolversCustom = require("./resolvers-custom");

var _resolversMam = require("./resolvers-mam");

var _logs = _interopRequireDefault(require("./logs"));

var _tracer = require("./tracer");

var _opentracing = require("opentracing");

var _auth = require("./auth");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
 * Copyright 2018-2020 TON DEV SOLUTIONS LTD.
 *
 * Licensed under the SOFTWARE EVALUATION License (the "License"); you may not use
 * this file except in compliance with the License.  You may obtain a copy of the
 * License at:
 *
 * http://www.ton.dev/licenses
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific TON DEV software governing permissions and
 * limitations under the License.
 */
const v8 = require('v8');

class MemStats {
  constructor(stats) {
    this.stats = stats;
  }

  report() {
    v8.getHeapSpaceStatistics().forEach(space => {
      const spaceName = space.space_name.replace('space_', '').replace('_space', '');

      const gauge = (metric, value) => {
        this.stats.gauge(`heap.space.${spaceName}.${metric}`, value);
      };

      gauge('physical_size', space.physical_space_size);
      gauge('available_size', space.space_available_size);
      gauge('size', space.space_size);
      gauge('used_size', space.space_used_size);
    });
  }

  start() {//TODO: this.checkMemReport();
    //TODO: this.checkGc();
  }

  checkMemReport() {
    setTimeout(() => {
      this.report();
      this.checkMemReport();
    }, 5000);
  }

  checkGc() {
    setTimeout(() => {
      global.gc();
      this.checkGc();
    }, 60000);
  }

}

class TONQServer {
  constructor(options) {
    this.config = options.config;
    this.logs = options.logs;
    this.log = this.logs.create('server');
    this.shared = new Map();
    this.tracer = _tracer.QTracer.create(options.config);
    this.stats = _tracer.QStats.create(options.config.statsd.server, options.config.statsd.tags);
    this.auth = new _auth.Auth(options.config);
    this.endPoints = [];
    this.app = (0, _express.default)();
    this.server = _http.default.createServer(this.app);
    this.db = new _arango.default(this.config, this.logs, this.auth, this.tracer, this.stats);
    this.memStats = new MemStats(this.stats);
    this.memStats.start();
    this.rpcServer = new _qRpcServer.QRpcServer({
      auth: this.auth,
      db: this.db,
      port: options.config.server.rpcPort
    });
    this.addEndPoint({
      path: '/graphql/mam',
      resolvers: _resolversMam.resolversMam,
      typeDefFileNames: ['type-defs-mam.graphql'],
      supportSubscriptions: false
    });
    this.addEndPoint({
      path: '/graphql',
      resolvers: (0, _resolversCustom.attachCustomResolvers)(this.db, (0, _resolversGenerated.createResolvers)(this.db)),
      typeDefFileNames: ['type-defs-generated.graphql', 'type-defs-custom.graphql'],
      supportSubscriptions: true
    });
  }

  async start() {
    this.client = await _tonClientNodeJs.TONClient.create({
      servers: ['']
    });
    await this.db.start();
    const {
      host,
      port
    } = this.config.server;
    this.server.listen({
      host,
      port
    }, () => {
      this.endPoints.forEach(endPoint => {
        this.log.debug('GRAPHQL', `http://${host}:${port}${endPoint.path}`);
      });
    });
    this.server.setTimeout(2147483647);
    const version = (0, _utils.packageJson)().version;
    const startCounter = new _tracer.StatsCounter(this.stats, _config.STATS.start, [`version=${version}`]);
    startCounter.increment();

    if (this.rpcServer.port) {
      this.rpcServer.start();
    }
  }

  async stop() {
    await new Promise(resolve => this.server.close(() => resolve()));
    this.logs.stop();
  }

  addEndPoint(endPoint) {
    const typeDefs = endPoint.typeDefFileNames.map(x => _fs.default.readFileSync(x, 'utf-8')).join('\n');
    const config = {
      debug: false,
      typeDefs,
      resolvers: endPoint.resolvers,
      subscriptions: {
        keepAlive: this.config.server.keepAlive,

        onConnect(connectionParams, _websocket, _context) {
          return {
            accessKey: connectionParams.accessKey || connectionParams.accesskey
          };
        }

      },
      context: ({
        req,
        connection
      }) => {
        return {
          db: this.db,
          tracer: this.tracer,
          stats: this.stats,
          auth: this.auth,
          client: this.client,
          config: this.config,
          shared: this.shared,
          remoteAddress: req && req.socket && req.socket.remoteAddress || '',
          accessKey: _auth.Auth.extractAccessKey(req, connection),
          parentSpan: _tracer.QTracer.extractParentSpan(this.tracer, connection ? connection : req)
        };
      },
      plugins: [{
        requestDidStart(_requestContext) {
          return {
            willSendResponse(ctx) {
              const context = ctx.context;

              if (context.multipleAccessKeysDetected) {
                throw _utils.QError.multipleAccessKeys();
              }
            }

          };
        }

      }]
    };
    const apollo = new _apolloServerExpress.ApolloServer(config);
    apollo.applyMiddleware({
      app: this.app,
      path: endPoint.path
    });

    if (endPoint.supportSubscriptions) {
      apollo.installSubscriptionHandlers(this.server);
    }

    this.endPoints.push(endPoint);
  }

}

exports.default = TONQServer;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9zZXJ2ZXIuanMiXSwibmFtZXMiOlsidjgiLCJyZXF1aXJlIiwiTWVtU3RhdHMiLCJjb25zdHJ1Y3RvciIsInN0YXRzIiwicmVwb3J0IiwiZ2V0SGVhcFNwYWNlU3RhdGlzdGljcyIsImZvckVhY2giLCJzcGFjZSIsInNwYWNlTmFtZSIsInNwYWNlX25hbWUiLCJyZXBsYWNlIiwiZ2F1Z2UiLCJtZXRyaWMiLCJ2YWx1ZSIsInBoeXNpY2FsX3NwYWNlX3NpemUiLCJzcGFjZV9hdmFpbGFibGVfc2l6ZSIsInNwYWNlX3NpemUiLCJzcGFjZV91c2VkX3NpemUiLCJzdGFydCIsImNoZWNrTWVtUmVwb3J0Iiwic2V0VGltZW91dCIsImNoZWNrR2MiLCJnbG9iYWwiLCJnYyIsIlRPTlFTZXJ2ZXIiLCJvcHRpb25zIiwiY29uZmlnIiwibG9ncyIsImxvZyIsImNyZWF0ZSIsInNoYXJlZCIsIk1hcCIsInRyYWNlciIsIlFUcmFjZXIiLCJRU3RhdHMiLCJzdGF0c2QiLCJzZXJ2ZXIiLCJ0YWdzIiwiYXV0aCIsIkF1dGgiLCJlbmRQb2ludHMiLCJhcHAiLCJodHRwIiwiY3JlYXRlU2VydmVyIiwiZGIiLCJBcmFuZ28iLCJtZW1TdGF0cyIsInJwY1NlcnZlciIsIlFScGNTZXJ2ZXIiLCJwb3J0IiwicnBjUG9ydCIsImFkZEVuZFBvaW50IiwicGF0aCIsInJlc29sdmVycyIsInJlc29sdmVyc01hbSIsInR5cGVEZWZGaWxlTmFtZXMiLCJzdXBwb3J0U3Vic2NyaXB0aW9ucyIsImNsaWVudCIsIlRPTkNsaWVudE5vZGVKcyIsInNlcnZlcnMiLCJob3N0IiwibGlzdGVuIiwiZW5kUG9pbnQiLCJkZWJ1ZyIsInZlcnNpb24iLCJzdGFydENvdW50ZXIiLCJTdGF0c0NvdW50ZXIiLCJTVEFUUyIsImluY3JlbWVudCIsInN0b3AiLCJQcm9taXNlIiwicmVzb2x2ZSIsImNsb3NlIiwidHlwZURlZnMiLCJtYXAiLCJ4IiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJqb2luIiwic3Vic2NyaXB0aW9ucyIsImtlZXBBbGl2ZSIsIm9uQ29ubmVjdCIsImNvbm5lY3Rpb25QYXJhbXMiLCJfd2Vic29ja2V0IiwiX2NvbnRleHQiLCJhY2Nlc3NLZXkiLCJhY2Nlc3NrZXkiLCJjb250ZXh0IiwicmVxIiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJzb2NrZXQiLCJleHRyYWN0QWNjZXNzS2V5IiwicGFyZW50U3BhbiIsImV4dHJhY3RQYXJlbnRTcGFuIiwicGx1Z2lucyIsInJlcXVlc3REaWRTdGFydCIsIl9yZXF1ZXN0Q29udGV4dCIsIndpbGxTZW5kUmVzcG9uc2UiLCJjdHgiLCJtdWx0aXBsZUFjY2Vzc0tleXNEZXRlY3RlZCIsIlFFcnJvciIsIm11bHRpcGxlQWNjZXNzS2V5cyIsImFwb2xsbyIsIkFwb2xsb1NlcnZlciIsImFwcGx5TWlkZGxld2FyZSIsImluc3RhbGxTdWJzY3JpcHRpb25IYW5kbGVycyIsInB1c2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFpQkE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBR0E7O0FBR0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUF6Q0E7Ozs7Ozs7Ozs7Ozs7OztBQXVEQSxNQUFNQSxFQUFFLEdBQUdDLE9BQU8sQ0FBQyxJQUFELENBQWxCOztBQUVBLE1BQU1DLFFBQU4sQ0FBZTtBQUdYQyxFQUFBQSxXQUFXLENBQUNDLEtBQUQsRUFBZ0I7QUFDdkIsU0FBS0EsS0FBTCxHQUFhQSxLQUFiO0FBQ0g7O0FBRURDLEVBQUFBLE1BQU0sR0FBRztBQUNMTCxJQUFBQSxFQUFFLENBQUNNLHNCQUFILEdBQTRCQyxPQUE1QixDQUFxQ0MsS0FBRCxJQUFXO0FBQzNDLFlBQU1DLFNBQVMsR0FBR0QsS0FBSyxDQUFDRSxVQUFOLENBQ2JDLE9BRGEsQ0FDTCxRQURLLEVBQ0ssRUFETCxFQUViQSxPQUZhLENBRUwsUUFGSyxFQUVLLEVBRkwsQ0FBbEI7O0FBR0Es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LElBQUksRUFBRVUsUUFBUSxDQUFDVjtBQUZJLEtBQXZCOztBQUlBLFFBQUlVLFFBQVEsQ0FBQ04sb0JBQWIsRUFBbUM7QUFDL0IrQyxNQUFBQSxNQUFNLENBQUNHLDJCQUFQLENBQW1DLEtBQUt0RSxNQUF4QztBQUNIOztBQUNELFNBQUtJLFNBQUwsQ0FBZW1FLElBQWYsQ0FBb0I3QyxRQUFwQjtBQUNIOztBQXRJMkIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IDIwMTgtMjAyMCBUT04gREVWIFNPTFVUSU9OUyBMVEQuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIFNPRlRXQVJFIEVWQUxVQVRJT04gTGljZW5zZSAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlXG4gKiB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS4gIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcbiAqIExpY2Vuc2UgYXQ6XG4gKlxuICogaHR0cDovL3d3dy50b24uZGV2L2xpY2Vuc2VzXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBUT04gREVWIHNvZnR3YXJlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG5cbi8vIEBmbG93XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcblxuaW1wb3J0IHsgQXBvbGxvU2VydmVyLCBBcG9sbG9TZXJ2ZXJFeHByZXNzQ29uZmlnIH0gZnJvbSAnYXBvbGxvLXNlcnZlci1leHByZXNzJztcbmltcG9ydCB7IENvbm5lY3Rpb25Db250ZXh0IH0gZnJvbSAnc3Vic2NyaXB0aW9ucy10cmFuc3BvcnQtd3MnO1xuaW1wb3J0IHR5cGUgeyBUT05DbGllbnQgfSBmcm9tICd0b24tY2xpZW50LWpzL3R5cGVzJztcbmltcG9ydCB7IFRPTkNsaWVudCBhcyBUT05DbGllbnROb2RlSnMgfSBmcm9tICd0b24tY2xpZW50LW5vZGUtanMnO1xuaW1wb3J0IEFyYW5nbyBmcm9tICcuL2FyYW5nbyc7XG5pbXBvcnQgdHlwZSB7IEdyYXBoUUxSZXF1ZXN0Q29udGV4dCB9IGZyb20gJy4vYXJhbmdvLWNvbGxlY3Rpb24nO1xuaW1wb3J0IHsgU1RBVFMgfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgeyBRUnBjU2VydmVyIH0gZnJvbSAnLi9xLXJwYy1zZXJ2ZXInO1xuXG5pbXBvcnQgeyBjcmVhdGVSZXNvbHZlcnMgfSBmcm9tICcuL3Jlc29sdmVycy1nZW5lcmF0ZWQnO1xuaW1wb3J0IHsgYXR0YWNoQ3VzdG9tUmVzb2x2ZXJzIH0gZnJvbSAnLi9yZXNvbHZlcnMtY3VzdG9tJztcbmltcG9ydCB7IHJlc29sdmVyc01hbSB9IGZyb20gJy4vcmVzb2x2ZXJzLW1hbSc7XG5cbmltcG9ydCB0eXBlIHsgUUNvbmZpZyB9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBRTG9ncyBmcm9tICcuL2xvZ3MnO1xuaW1wb3J0IHR5cGUgeyBRTG9nIH0gZnJvbSAnLi9sb2dzJztcbmltcG9ydCB0eXBlIHsgSVN0YXRzIH0gZnJvbSAnLi90cmFjZXInO1xuaW1wb3J0IHsgUVN0YXRzLCBRVHJhY2VyLCBTdGF0c0NvdW50ZXIgfSBmcm9tICcuL3RyYWNlcic7XG5pbXBvcnQgeyBUcmFjZXIgfSBmcm9tICdvcGVudHJhY2luZyc7XG5pbXBvcnQgeyBBdXRoIH0gZnJvbSAnLi9hdXRoJztcbmltcG9ydCB7IHBhY2thZ2VKc29uLCBRRXJyb3IgfSBmcm9tICcuL3V0aWxzJztcblxudHlwZSBRT3B0aW9ucyA9IHtcbiAgICBjb25maWc6IFFDb25maWcsXG4gICAgbG9nczogUUxvZ3MsXG59XG5cbnR5cGUgRW5kUG9pbnQgPSB7XG4gICAgcGF0aDogc3RyaW5nLFxuICAgIHJlc29sdmVyczogYW55LFxuICAgIHR5cGVEZWZGaWxlTmFtZXM6IHN0cmluZ1tdLFxuICAgIHN1cHBvcnRTdWJzY3JpcHRpb25zOiBib29sZWFuLFxufVxuXG5jb25zdCB2OCA9IHJlcXVpcmUoJ3Y4Jyk7XG5cbmNsYXNzIE1lbVN0YXRzIHtcbiAgICBzdGF0czogSVN0YXRzO1xuXG4gICAgY29uc3RydWN0b3Ioc3RhdHM6IElTdGF0cykge1xuICAgICAgICB0aGlzLnN0YXRzID0gc3RhdHM7XG4gICAgfVxuXG4gICAgcmVwb3J0KCkge1xuICAgICAgICB2OC5nZXRIZWFwU3BhY2VTdGF0aXN0aWNzKCkuZm9yRWFjaCgoc3BhY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNwYWNlTmFtZSA9IHNwYWNlLnNwYWNlX25hbWVcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnc3BhY2VfJywgJycpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJ19zcGFjZScsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGdhdWdlID0gKG1ldHJpYzogc3RyaW5nLCB2YWx1ZTogbnVtYmVyKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0cy5nYXVnZShgaGVhcC5zcGFjZS4ke3NwYWNlTmFtZX0uJHttZXRyaWN9YCwgdmFsdWUpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGdhdWdlKCdwaHlzaWNhbF9zaXplJywgc3BhY2UucGh5c2ljYWxfc3BhY2Vfc2l6ZSk7XG4gICAgICAgICAgICBnYXVnZSgnYXZhaWxhYmxlX3NpemUnLCBzcGFjZS5zcGFjZV9hdmFpbGFibGVfc2l6ZSk7XG4gICAgICAgICAgICBnYXVnZSgnc2l6ZScsIHNwYWNlLnNwYWNlX3NpemUpO1xuICAgICAgICAgICAgZ2F1Z2UoJ3VzZWRfc2l6ZScsIHNwYWNlLnNwYWNlX3VzZWRfc2l6ZSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHN0YXJ0KCkge1xuICAgICAgICAvL1RPRE86IHRoaXMuY2hlY2tNZW1SZXBvcnQoKTtcbiAgICAgICAgLy9UT0RPOiB0aGlzLmNoZWNrR2MoKTtcbiAgICB9XG5cbiAgICBjaGVja01lbVJlcG9ydCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnJlcG9ydCgpO1xuICAgICAgICAgICAgdGhpcy5jaGVja01lbVJlcG9ydCgpO1xuICAgICAgICB9LCA1MDAwKTtcbiAgICB9XG5cbiAgICBjaGVja0djKCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGdsb2JhbC5nYygpO1xuICAgICAgICAgICAgdGhpcy5jaGVja0djKCk7XG4gICAgICAgIH0sIDYwMDAwKTtcbiAgICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRPTlFTZXJ2ZXIge1xuICAgIGNvbmZpZzogUUNvbmZpZztcbiAgICBsb2dzOiBRTG9ncztcbiAgICBsb2c6IFFMb2c7XG4gICAgYXBwOiBleHByZXNzLkFwcGxpY2F0aW9uO1xuICAgIHNlcnZlcjogYW55O1xuICAgIGVuZFBvaW50czogRW5kUG9pbnRbXTtcbiAgICBkYjogQXJhbmdvO1xuICAgIHRyYWNlcjogVHJhY2VyO1xuICAgIHN0YXRzOiBJU3RhdHM7XG4gICAgY2xpZW50OiBUT05DbGllbnQ7XG4gICAgYXV0aDogQXV0aDtcbiAgICBtZW1TdGF0czogTWVtU3RhdHM7XG4gICAgc2hhcmVkOiBNYXA8c3RyaW5nLCBhbnk+O1xuICAgIHJwY1NlcnZlcjogUVJwY1NlcnZlcjtcblxuXG4gICAgY29uc3RydWN0b3Iob3B0aW9uczogUU9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBvcHRpb25zLmNvbmZpZztcbiAgICAgICAgdGhpcy5sb2dzID0gb3B0aW9ucy5sb2dzO1xuICAgICAgICB0aGlzLmxvZyA9IHRoaXMubG9ncy5jcmVhdGUoJ3NlcnZlcicpO1xuICAgICAgICB0aGlzLnNoYXJlZCA9IG5ldyBNYXAoKTtcbiAgICAgICAgdGhpcy50cmFjZXIgPSBRVHJhY2VyLmNyZWF0ZShvcHRpb25zLmNvbmZpZyk7XG4gICAgICAgIHRoaXMuc3RhdHMgPSBRU3RhdHMuY3JlYXRlKG9wdGlvbnMuY29uZmlnLnN0YXRzZC5zZXJ2ZXIsIG9wdGlvbnMuY29uZmlnLnN0YXRzZC50YWdzKTtcbiAgICAgICAgdGhpcy5hdXRoID0gbmV3IEF1dGgob3B0aW9ucy5jb25maWcpO1xuICAgICAgICB0aGlzLmVuZFBvaW50cyA9IFtdO1xuICAgICAgICB0aGlzLmFwcCA9IGV4cHJlc3MoKTtcbiAgICAgICAgdGhpcy5zZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmFwcCk7XG4gICAgICAgIHRoaXMuZGIgPSBuZXcgQXJhbmdvKHRoaXMuY29uZmlnLCB0aGlzLmxvZ3MsIHRoaXMuYXV0aCwgdGhpcy50cmFjZXIsIHRoaXMuc3RhdHMpO1xuICAgICAgICB0aGlzLm1lbVN0YXRzID0gbmV3IE1lbVN0YXRzKHRoaXMuc3RhdHMpO1xuICAgICAgICB0aGlzLm1lbVN0YXRzLnN0YXJ0KCk7XG4gICAgICAgIHRoaXMucnBjU2VydmVyID0gbmV3IFFScGNTZXJ2ZXIoe1xuICAgICAgICAgICAgYXV0aDogdGhpcy5hdXRoLFxuICAgICAgICAgICAgZGI6IHRoaXMuZGIsXG4gICAgICAgICAgICBwb3J0OiBvcHRpb25zLmNvbmZpZy5zZXJ2ZXIucnBjUG9ydCxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYWRkRW5kUG9pbnQoe1xuICAgICAgICAgICAgcGF0aDogJy9ncmFwaHFsL21hbScsXG4gICAgICAgICAgICByZXNvbHZlcnM6IHJlc29sdmVyc01hbSxcbiAgICAgICAgICAgIHR5cGVEZWZGaWxlTmFtZXM6IFsndHlwZS1kZWZzLW1hbS5ncmFwaHFsJ10sXG4gICAgICAgICAgICBzdXBwb3J0U3Vic2NyaXB0aW9uczogZmFsc2UsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZEVuZFBvaW50KHtcbiAgICAgICAgICAgIHBhdGg6ICcvZ3JhcGhxbCcsXG4gICAgICAgICAgICByZXNvbHZlcnM6IGF0dGFjaEN1c3RvbVJlc29sdmVycyh0aGlzLmRiLCBjcmVhdGVSZXNvbHZlcnModGhpcy5kYikpLFxuICAgICAgICAgICAgdHlwZURlZkZpbGVOYW1lczogWyd0eXBlLWRlZnMtZ2VuZXJhdGVkLmdyYXBocWwnLCAndHlwZS1kZWZzLWN1c3RvbS5ncmFwaHFsJ10sXG4gICAgICAgICAgICBzdXBwb3J0U3Vic2NyaXB0aW9uczogdHJ1ZSxcbiAgICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICBhc3luYyBzdGFydCgpIHtcbiAgICAgICAgdGhpcy5jbGllbnQgPSBhd2FpdCBUT05DbGllbnROb2RlSnMuY3JlYXRlKHsgc2VydmVyczogWycnXSB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5kYi5zdGFydCgpO1xuICAgICAgICBjb25zdCB7IGhvc3QsIHBvcnQgfSA9IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICAgICAgdGhpcy5zZXJ2ZXIubGlzdGVuKHtcbiAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICBwb3J0LFxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVuZFBvaW50cy5mb3JFYWNoKChlbmRQb2ludDogRW5kUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZygnR1JBUEhRTCcsIGBodHRwOi8vJHtob3N0fToke3BvcnR9JHtlbmRQb2ludC5wYXRofWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNlcnZlci5zZXRUaW1lb3V0KDIxNDc0ODM2NDcpO1xuXG4gICAgICAgIGNvbnN0IHZlcnNpb24gPSBwYWNrYWdlSnNvbigpLnZlcnNpb247XG4gICAgICAgIGNvbnN0IHN0YXJ0Q291bnRlciA9IG5ldyBTdGF0c0NvdW50ZXIodGhpcy5zdGF0cywgU1RBVFMuc3RhcnQsIFtgdmVyc2lvbj0ke3ZlcnNpb259YF0pO1xuICAgICAgICBzdGFydENvdW50ZXIuaW5jcmVtZW50KClcblxuICAgICAgICBpZiAodGhpcy5ycGNTZXJ2ZXIucG9ydCkge1xuICAgICAgICAgICAgdGhpcy5ycGNTZXJ2ZXIuc3RhcnQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG4gICAgYXN5bmMgc3RvcCgpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHRoaXMuc2VydmVyLmNsb3NlKCgpID0+IHJlc29sdmUoKSkpO1xuICAgICAgICB0aGlzLmxvZ3Muc3RvcCgpO1xuICAgIH1cblxuICAgIGFkZEVuZFBvaW50KGVuZFBvaW50OiBFbmRQb2ludCkge1xuICAgICAgICBjb25zdCB0eXBlRGVmcyA9IGVuZFBvaW50LnR5cGVEZWZGaWxlTmFtZXNcbiAgICAgICAgICAgIC5tYXAoeCA9PiBmcy5yZWFkRmlsZVN5bmMoeCwgJ3V0Zi04JykpXG4gICAgICAgICAgICAuam9pbignXFxuJyk7XG4gICAgICAgIGNvbnN0IGNvbmZpZzogQXBvbGxvU2VydmVyRXhwcmVzc0NvbmZpZyA9IHtcbiAgICAgICAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICAgICAgICAgIHR5cGVEZWZzLFxuICAgICAgICAgICAgcmVzb2x2ZXJzOiBlbmRQb2ludC5yZXNvbHZlcnMsXG4gICAgICAgICAgICBzdWJzY3JpcHRpb25zOiB7XG4gICAgICAgICAgICAgICAga2VlcEFsaXZlOiB0aGlzLmNvbmZpZy5zZXJ2ZXIua2VlcEFsaXZlLFxuICAgICAgICAgICAgICAgIG9uQ29ubmVjdChjb25uZWN0aW9uUGFyYW1zOiBPYmplY3QsIF93ZWJzb2NrZXQ6IFdlYlNvY2tldCwgX2NvbnRleHQ6IENvbm5lY3Rpb25Db250ZXh0KTogYW55IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2Vzc0tleTogY29ubmVjdGlvblBhcmFtcy5hY2Nlc3NLZXkgfHwgY29ubmVjdGlvblBhcmFtcy5hY2Nlc3NrZXksXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHQ6ICh7IHJlcSwgY29ubmVjdGlvbiB9KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgZGI6IHRoaXMuZGIsXG4gICAgICAgICAgICAgICAgICAgIHRyYWNlcjogdGhpcy50cmFjZXIsXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzOiB0aGlzLnN0YXRzLFxuICAgICAgICAgICAgICAgICAgICBhdXRoOiB0aGlzLmF1dGgsXG4gICAgICAgICAgICAgICAgICAgIGNsaWVudDogdGhpcy5jbGllbnQsXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzogdGhpcy5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgIHNoYXJlZDogdGhpcy5zaGFyZWQsXG4gICAgICAgICAgICAgICAgICAgIHJlbW90ZUFkZHJlc3M6IChyZXEgJiYgcmVxLnNvY2tldCAmJiByZXEuc29ja2V0LnJlbW90ZUFkZHJlc3MpIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBhY2Nlc3NLZXk6IEF1dGguZXh0cmFjdEFjY2Vzc0tleShyZXEsIGNvbm5lY3Rpb24pLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRTcGFuOiBRVHJhY2VyLmV4dHJhY3RQYXJlbnRTcGFuKHRoaXMudHJhY2VyLCBjb25uZWN0aW9uID8gY29ubmVjdGlvbiA6IHJlcSksXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0RGlkU3RhcnQoX3JlcXVlc3RDb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbGxTZW5kUmVzcG9uc2UoY3R4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHQ6IEdyYXBoUUxSZXF1ZXN0Q29udGV4dCA9IGN0eC5jb250ZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29udGV4dC5tdWx0aXBsZUFjY2Vzc0tleXNEZXRlY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgUUVycm9yLm11bHRpcGxlQWNjZXNzS2V5cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgYXBvbGxvID0gbmV3IEFwb2xsb1NlcnZlcihjb25maWcpO1xuICAgICAgICBhcG9sbG8uYXBwbHlNaWRkbGV3YXJlKHtcbiAgICAgICAgICAgIGFwcDogdGhpcy5hcHAsXG4gICAgICAgICAgICBwYXRoOiBlbmRQb2ludC5wYXRoLFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKGVuZFBvaW50LnN1cHBvcnRTdWJzY3JpcHRpb25zKSB7XG4gICAgICAgICAgICBhcG9sbG8uaW5zdGFsbFN1YnNjcmlwdGlvbkhhbmRsZXJzKHRoaXMuc2VydmVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmVuZFBvaW50cy5wdXNoKGVuZFBvaW50KTtcbiAgICB9XG5cblxufVxuXG4iXX0=