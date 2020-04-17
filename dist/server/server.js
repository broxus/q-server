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
    this.stats = _tracer.QStats.create(options.config.statsd.server);
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

    if (this.rpcServer.port) {
      this.rpcServer.start();
    }
  }

  addEndPoint(endPoint) {
    const typeDefs = endPoint.typeDefFileNames.map(x => _fs.default.readFileSync(x, 'utf-8')).join('\n');
    const config = {
      typeDefs,
      resolvers: endPoint.resolvers,
      subscriptions: {
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
                throw (0, _utils.createError)(400, 'Request must use the same access key for all queries and mutations');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9zZXJ2ZXIuanMiXSwibmFtZXMiOlsidjgiLCJyZXF1aXJlIiwiTWVtU3RhdHMiLCJjb25zdHJ1Y3RvciIsInN0YXRzIiwicmVwb3J0IiwiZ2V0SGVhcFNwYWNlU3RhdGlzdGljcyIsImZvckVhY2giLCJzcGFjZSIsInNwYWNlTmFtZSIsInNwYWNlX25hbWUiLCJyZXBsYWNlIiwiZ2F1Z2UiLCJtZXRyaWMiLCJ2YWx1ZSIsInBoeXNpY2FsX3NwYWNlX3NpemUiLCJzcGFjZV9hdmFpbGFibGVfc2l6ZSIsInNwYWNlX3NpemUiLCJzcGFjZV91c2VkX3NpemUiLCJzdGFydCIsImNoZWNrTWVtUmVwb3J0Iiwic2V0VGltZW91dCIsImNoZWNrR2MiLCJnbG9iYWwiLCJnYyIsIlRPTlFTZXJ2ZXIiLCJvcHRpb25zIiwiY29uZmlnIiwibG9ncyIsImxvZyIsImNyZWF0ZSIsInNoYXJlZCIsIk1hcCIsInRyYWNlciIsIlFUcmFjZXIiLCJRU3RhdHMiLCJzdGF0c2QiLCJzZXJ2ZXIiLCJhdXRoIiwiQXV0aCIsImVuZFBvaW50cyIsImFwcCIsImh0dHAiLCJjcmVhdGVTZXJ2ZXIiLCJkYiIsIkFyYW5nbyIsIm1lbVN0YXRzIiwicnBjU2VydmVyIiwiUVJwY1NlcnZlciIsInBvcnQiLCJycGNQb3J0IiwiYWRkRW5kUG9pbnQiLCJwYXRoIiwicmVzb2x2ZXJzIiwicmVzb2x2ZXJzTWFtIiwidHlwZURlZkZpbGVOYW1lcyIsInN1cHBvcnRTdWJzY3JpcHRpb25zIiwiY2xpZW50IiwiVE9OQ2xpZW50Tm9kZUpzIiwic2VydmVycyIsImhvc3QiLCJsaXN0ZW4iLCJlbmRQb2ludCIsImRlYnVnIiwidHlwZURlZnMiLCJtYXAiLCJ4IiwiZnMiLCJyZWFkRmlsZVN5bmMiLCJqb2luIiwic3Vic2NyaXB0aW9ucyIsIm9uQ29ubmVjdCIsImNvbm5lY3Rpb25QYXJhbXMiLCJfd2Vic29ja2V0IiwiX2NvbnRleHQiLCJhY2Nlc3NLZXkiLCJhY2Nlc3NrZXkiLCJjb250ZXh0IiwicmVxIiwiY29ubmVjdGlvbiIsInJlbW90ZUFkZHJlc3MiLCJzb2NrZXQiLCJleHRyYWN0QWNjZXNzS2V5IiwicGFyZW50U3BhbiIsImV4dHJhY3RQYXJlbnRTcGFuIiwicGx1Z2lucyIsInJlcXVlc3REaWRTdGFydCIsIl9yZXF1ZXN0Q29udGV4dCIsIndpbGxTZW5kUmVzcG9uc2UiLCJjdHgiLCJtdWx0aXBsZUFjY2Vzc0tleXNEZXRlY3RlZCIsImFwb2xsbyIsIkFwb2xsb1NlcnZlciIsImFwcGx5TWlkZGxld2FyZSIsImluc3RhbGxTdWJzY3JpcHRpb25IYW5kbGVycyIsInB1c2giXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFpQkE7O0FBQ0E7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBQ0E7O0FBRUE7O0FBRUE7O0FBQ0E7O0FBQ0E7O0FBR0E7O0FBR0E7O0FBQ0E7O0FBQ0E7O0FBQ0E7Ozs7QUF4Q0E7Ozs7Ozs7Ozs7Ozs7OztBQXNEQSxNQUFNQSxFQUFFLEdBQUdDLE9BQU8sQ0FBQyxJQUFELENBQWxCOztBQUVBLE1BQU1DLFFBQU4sQ0FBZTtBQUdYQyxFQUFBQSxXQUFXLENBQUNDLEtBQUQsRUFBZ0I7QUFDdkIsU0FBS0EsS0FBTCxHQUFhQSxLQUFiO0FBQ0g7O0FBRURDLEVBQUFBLE1BQU0sR0FBRztBQUNMTCxJQUFBQSxFQUFFLENBQUNNLHNCQUFILEdBQTRCQyxPQUE1QixDQUFxQ0MsS0FBRCxJQUFXO0FBQzNDLFlBQU1DLFNBQVMsR0FBR0QsS0FBSyxDQUFDRSxVQUFOLENBQ2JDLE9BRGEsQ0FDTCxRQURLLEVBQ0ssRUFETCxFQUViQSxPQUZhLENBRUwsUUFGSyxFQUVLLEVBRkwsQ0FBbEI7O0FBR0EsWUFBTUMsS0FBSyxHQUFHLENBQUNDLE1BQUQsRUFBaUJDLEtBQWpCLEtBQW1DO0FBQzdDLGFBQUtWLEtBQUwsQ0FBV1EsS0FBWCxDQUFrQixjQUFhSCxTQUFVLElBQUdJLE1BQU8sRUFBbkQsRUFBc0RDLEtBQXREO0FBQ0gsT0FGRDs7QUFHQUYsTUFBQUEsS0FBSyxD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LE9BQThCLEdBQUdZLEdBQUcsQ0FBQ1osT0FBM0M7O0FBQ0Esa0JBQUlBLE9BQU8sQ0FBQ2EsMEJBQVosRUFBd0M7QUFDcEMsc0JBQU0sd0JBQ0YsR0FERSxFQUVGLG9FQUZFLENBQU47QUFJSDtBQUNKOztBQVRFLFdBQVA7QUFXSDs7QUFiTCxPQURLO0FBeEI2QixLQUExQztBQTBDQSxVQUFNQyxNQUFNLEdBQUcsSUFBSUMsaUNBQUosQ0FBaUJqRSxNQUFqQixDQUFmO0FBQ0FnRSxJQUFBQSxNQUFNLENBQUNFLGVBQVAsQ0FBdUI7QUFDbkJwRCxNQUFBQSxHQUFHLEVBQUUsS0FBS0EsR0FEUztBQUVuQlcsTUFBQUEsSUFBSSxFQUFFVSxRQUFRLENBQUNWO0FBRkksS0FBdkI7O0FBSUEsUUFBSVUsUUFBUSxDQUFDTixvQkFBYixFQUFtQztBQUMvQm1DLE1BQUFBLE1BQU0sQ0FBQ0csMkJBQVAsQ0FBbUMsS0FBS3pELE1BQXhDO0FBQ0g7O0FBQ0QsU0FBS0csU0FBTCxDQUFldUQsSUFBZixDQUFvQmpDLFFBQXBCO0FBQ0g7O0FBOUgyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgMjAxOC0yMDIwIFRPTiBERVYgU09MVVRJT05TIExURC5cbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgU09GVFdBUkUgRVZBTFVBVElPTiBMaWNlbnNlICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcbiAqIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiAgWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZVxuICogTGljZW5zZSBhdDpcbiAqXG4gKiBodHRwOi8vd3d3LnRvbi5kZXYvbGljZW5zZXNcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIFRPTiBERVYgc29mdHdhcmUgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuLy8gQGZsb3dcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuXG5pbXBvcnQge0Fwb2xsb1NlcnZlciwgQXBvbGxvU2VydmVyRXhwcmVzc0NvbmZpZ30gZnJvbSAnYXBvbGxvLXNlcnZlci1leHByZXNzJztcbmltcG9ydCB7Q29ubmVjdGlvbkNvbnRleHR9IGZyb20gJ3N1YnNjcmlwdGlvbnMtdHJhbnNwb3J0LXdzJztcbmltcG9ydCB0eXBlIHtUT05DbGllbnR9IGZyb20gXCJ0b24tY2xpZW50LWpzL3R5cGVzXCI7XG5pbXBvcnQge1RPTkNsaWVudCBhcyBUT05DbGllbnROb2RlSnN9IGZyb20gJ3Rvbi1jbGllbnQtbm9kZS1qcyc7XG5pbXBvcnQgQXJhbmdvIGZyb20gJy4vYXJhbmdvJztcbmltcG9ydCB0eXBlIHtHcmFwaFFMUmVxdWVzdENvbnRleHR9IGZyb20gXCIuL2FyYW5nby1jb2xsZWN0aW9uXCI7XG5pbXBvcnQge1FScGNTZXJ2ZXJ9IGZyb20gJy4vcS1ycGMtc2VydmVyJztcblxuaW1wb3J0IHtjcmVhdGVSZXNvbHZlcnN9IGZyb20gJy4vcmVzb2x2ZXJzLWdlbmVyYXRlZCc7XG5pbXBvcnQge2F0dGFjaEN1c3RvbVJlc29sdmVyc30gZnJvbSBcIi4vcmVzb2x2ZXJzLWN1c3RvbVwiO1xuaW1wb3J0IHtyZXNvbHZlcnNNYW19IGZyb20gXCIuL3Jlc29sdmVycy1tYW1cIjtcblxuaW1wb3J0IHR5cGUge1FDb25maWd9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCBRTG9ncyBmcm9tICcuL2xvZ3MnO1xuaW1wb3J0IHR5cGUge1FMb2d9IGZyb20gJy4vbG9ncyc7XG5pbXBvcnQgdHlwZSB7SVN0YXRzfSBmcm9tICcuL3RyYWNlcic7XG5pbXBvcnQge1FTdGF0cywgUVRyYWNlcn0gZnJvbSBcIi4vdHJhY2VyXCI7XG5pbXBvcnQge1RyYWNlcn0gZnJvbSBcIm9wZW50cmFjaW5nXCI7XG5pbXBvcnQge0F1dGh9IGZyb20gJy4vYXV0aCc7XG5pbXBvcnQge2NyZWF0ZUVycm9yfSBmcm9tIFwiLi91dGlsc1wiO1xuXG50eXBlIFFPcHRpb25zID0ge1xuICAgIGNvbmZpZzogUUNvbmZpZyxcbiAgICBsb2dzOiBRTG9ncyxcbn1cblxudHlwZSBFbmRQb2ludCA9IHtcbiAgICBwYXRoOiBzdHJpbmcsXG4gICAgcmVzb2x2ZXJzOiBhbnksXG4gICAgdHlwZURlZkZpbGVOYW1lczogc3RyaW5nW10sXG4gICAgc3VwcG9ydFN1YnNjcmlwdGlvbnM6IGJvb2xlYW4sXG59XG5cbmNvbnN0IHY4ID0gcmVxdWlyZSgndjgnKTtcblxuY2xhc3MgTWVtU3RhdHMge1xuICAgIHN0YXRzOiBJU3RhdHM7XG5cbiAgICBjb25zdHJ1Y3RvcihzdGF0czogSVN0YXRzKSB7XG4gICAgICAgIHRoaXMuc3RhdHMgPSBzdGF0cztcbiAgICB9XG5cbiAgICByZXBvcnQoKSB7XG4gICAgICAgIHY4LmdldEhlYXBTcGFjZVN0YXRpc3RpY3MoKS5mb3JFYWNoKChzcGFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3BhY2VOYW1lID0gc3BhY2Uuc3BhY2VfbmFtZVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCdzcGFjZV8nLCAnJylcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnX3NwYWNlJywgJycpO1xuICAgICAgICAgICAgY29uc3QgZ2F1Z2UgPSAobWV0cmljOiBzdHJpbmcsIHZhbHVlOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRzLmdhdWdlKGBoZWFwLnNwYWNlLiR7c3BhY2VOYW1lfS4ke21ldHJpY31gLCB2YWx1ZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgZ2F1Z2UoJ3BoeXNpY2FsX3NpemUnLCBzcGFjZS5waHlzaWNhbF9zcGFjZV9zaXplKTtcbiAgICAgICAgICAgIGdhdWdlKCdhdmFpbGFibGVfc2l6ZScsIHNwYWNlLnNwYWNlX2F2YWlsYWJsZV9zaXplKTtcbiAgICAgICAgICAgIGdhdWdlKCdzaXplJywgc3BhY2Uuc3BhY2Vfc2l6ZSk7XG4gICAgICAgICAgICBnYXVnZSgndXNlZF9zaXplJywgc3BhY2Uuc3BhY2VfdXNlZF9zaXplKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgc3RhcnQoKSB7XG4gICAgICAgIC8vVE9ETzogdGhpcy5jaGVja01lbVJlcG9ydCgpO1xuICAgICAgICAvL1RPRE86IHRoaXMuY2hlY2tHYygpO1xuICAgIH1cblxuICAgIGNoZWNrTWVtUmVwb3J0KCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHRoaXMucmVwb3J0KCk7XG4gICAgICAgICAgICB0aGlzLmNoZWNrTWVtUmVwb3J0KCk7XG4gICAgICAgIH0sIDUwMDApO1xuICAgIH1cblxuICAgIGNoZWNrR2MoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZ2xvYmFsLmdjKCk7XG4gICAgICAgICAgICB0aGlzLmNoZWNrR2MoKTtcbiAgICAgICAgfSwgNjAwMDApO1xuICAgIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVE9OUVNlcnZlciB7XG4gICAgY29uZmlnOiBRQ29uZmlnO1xuICAgIGxvZ3M6IFFMb2dzO1xuICAgIGxvZzogUUxvZztcbiAgICBhcHA6IGV4cHJlc3MuQXBwbGljYXRpb247XG4gICAgc2VydmVyOiBhbnk7XG4gICAgZW5kUG9pbnRzOiBFbmRQb2ludFtdO1xuICAgIGRiOiBBcmFuZ287XG4gICAgdHJhY2VyOiBUcmFjZXI7XG4gICAgc3RhdHM6IElTdGF0cztcbiAgICBjbGllbnQ6IFRPTkNsaWVudDtcbiAgICBhdXRoOiBBdXRoO1xuICAgIG1lbVN0YXRzOiBNZW1TdGF0cztcbiAgICBzaGFyZWQ6IE1hcDxzdHJpbmcsIGFueT47XG4gICAgcnBjU2VydmVyOiBRUnBjU2VydmVyO1xuXG5cbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zOiBRT3B0aW9ucykge1xuICAgICAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xuICAgICAgICB0aGlzLmxvZ3MgPSBvcHRpb25zLmxvZ3M7XG4gICAgICAgIHRoaXMubG9nID0gdGhpcy5sb2dzLmNyZWF0ZSgnc2VydmVyJyk7XG4gICAgICAgIHRoaXMuc2hhcmVkID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLnRyYWNlciA9IFFUcmFjZXIuY3JlYXRlKG9wdGlvbnMuY29uZmlnKTtcbiAgICAgICAgdGhpcy5zdGF0cyA9IFFTdGF0cy5jcmVhdGUob3B0aW9ucy5jb25maWcuc3RhdHNkLnNlcnZlcik7XG4gICAgICAgIHRoaXMuYXV0aCA9IG5ldyBBdXRoKG9wdGlvbnMuY29uZmlnKTtcbiAgICAgICAgdGhpcy5lbmRQb2ludHMgPSBbXTtcbiAgICAgICAgdGhpcy5hcHAgPSBleHByZXNzKCk7XG4gICAgICAgIHRoaXMuc2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5hcHApO1xuICAgICAgICB0aGlzLmRiID0gbmV3IEFyYW5nbyh0aGlzLmNvbmZpZywgdGhpcy5sb2dzLCB0aGlzLmF1dGgsIHRoaXMudHJhY2VyLCB0aGlzLnN0YXRzKTtcbiAgICAgICAgdGhpcy5tZW1TdGF0cyA9IG5ldyBNZW1TdGF0cyh0aGlzLnN0YXRzKTtcbiAgICAgICAgdGhpcy5tZW1TdGF0cy5zdGFydCgpO1xuICAgICAgICB0aGlzLnJwY1NlcnZlciA9IG5ldyBRUnBjU2VydmVyKHtcbiAgICAgICAgICAgIGF1dGg6IHRoaXMuYXV0aCxcbiAgICAgICAgICAgIGRiOiB0aGlzLmRiLFxuICAgICAgICAgICAgcG9ydDogb3B0aW9ucy5jb25maWcuc2VydmVyLnJwY1BvcnQsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmFkZEVuZFBvaW50KHtcbiAgICAgICAgICAgIHBhdGg6ICcvZ3JhcGhxbC9tYW0nLFxuICAgICAgICAgICAgcmVzb2x2ZXJzOiByZXNvbHZlcnNNYW0sXG4gICAgICAgICAgICB0eXBlRGVmRmlsZU5hbWVzOiBbJ3R5cGUtZGVmcy1tYW0uZ3JhcGhxbCddLFxuICAgICAgICAgICAgc3VwcG9ydFN1YnNjcmlwdGlvbnM6IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hZGRFbmRQb2ludCh7XG4gICAgICAgICAgICBwYXRoOiAnL2dyYXBocWwnLFxuICAgICAgICAgICAgcmVzb2x2ZXJzOiBhdHRhY2hDdXN0b21SZXNvbHZlcnModGhpcy5kYiwgY3JlYXRlUmVzb2x2ZXJzKHRoaXMuZGIpKSxcbiAgICAgICAgICAgIHR5cGVEZWZGaWxlTmFtZXM6IFsndHlwZS1kZWZzLWdlbmVyYXRlZC5ncmFwaHFsJywgJ3R5cGUtZGVmcy1jdXN0b20uZ3JhcGhxbCddLFxuICAgICAgICAgICAgc3VwcG9ydFN1YnNjcmlwdGlvbnM6IHRydWUsXG4gICAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgYXN5bmMgc3RhcnQoKSB7XG4gICAgICAgIHRoaXMuY2xpZW50ID0gYXdhaXQgVE9OQ2xpZW50Tm9kZUpzLmNyZWF0ZSh7c2VydmVyczogWycnXX0pO1xuICAgICAgICBhd2FpdCB0aGlzLmRiLnN0YXJ0KCk7XG4gICAgICAgIGNvbnN0IHtob3N0LCBwb3J0fSA9IHRoaXMuY29uZmlnLnNlcnZlcjtcbiAgICAgICAgdGhpcy5zZXJ2ZXIubGlzdGVuKHtcbiAgICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgICBwb3J0LFxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLmVuZFBvaW50cy5mb3JFYWNoKChlbmRQb2ludDogRW5kUG9pbnQpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmxvZy5kZWJ1ZygnR1JBUEhRTCcsIGBodHRwOi8vJHtob3N0fToke3BvcnR9JHtlbmRQb2ludC5wYXRofWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLnNlcnZlci5zZXRUaW1lb3V0KDIxNDc0ODM2NDcpO1xuXG4gICAgICAgIGlmICh0aGlzLnJwY1NlcnZlci5wb3J0KSB7XG4gICAgICAgICAgICB0aGlzLnJwY1NlcnZlci5zdGFydCgpO1xuICAgICAgICB9XG4gICAgfVxuXG5cbiAgICBhZGRFbmRQb2ludChlbmRQb2ludDogRW5kUG9pbnQpIHtcbiAgICAgICAgY29uc3QgdHlwZURlZnMgPSBlbmRQb2ludC50eXBlRGVmRmlsZU5hbWVzXG4gICAgICAgICAgICAubWFwKHggPT4gZnMucmVhZEZpbGVTeW5jKHgsICd1dGYtOCcpKVxuICAgICAgICAgICAgLmpvaW4oJ1xcbicpO1xuICAgICAgICBjb25zdCBjb25maWc6IEFwb2xsb1NlcnZlckV4cHJlc3NDb25maWcgPSB7XG4gICAgICAgICAgICB0eXBlRGVmcyxcbiAgICAgICAgICAgIHJlc29sdmVyczogZW5kUG9pbnQucmVzb2x2ZXJzLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uczoge1xuICAgICAgICAgICAgICAgIG9uQ29ubmVjdChjb25uZWN0aW9uUGFyYW1zOiBPYmplY3QsIF93ZWJzb2NrZXQ6IFdlYlNvY2tldCwgX2NvbnRleHQ6IENvbm5lY3Rpb25Db250ZXh0KTogYW55IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjY2Vzc0tleTogY29ubmVjdGlvblBhcmFtcy5hY2Nlc3NLZXkgfHwgY29ubmVjdGlvblBhcmFtcy5hY2Nlc3NrZXksXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbnRleHQ6ICh7cmVxLCBjb25uZWN0aW9ufSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGRiOiB0aGlzLmRiLFxuICAgICAgICAgICAgICAgICAgICB0cmFjZXI6IHRoaXMudHJhY2VyLFxuICAgICAgICAgICAgICAgICAgICBzdGF0czogdGhpcy5zdGF0cyxcbiAgICAgICAgICAgICAgICAgICAgYXV0aDogdGhpcy5hdXRoLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnQ6IHRoaXMuY2xpZW50LFxuICAgICAgICAgICAgICAgICAgICBjb25maWc6IHRoaXMuY29uZmlnLFxuICAgICAgICAgICAgICAgICAgICBzaGFyZWQ6IHRoaXMuc2hhcmVkLFxuICAgICAgICAgICAgICAgICAgICByZW1vdGVBZGRyZXNzOiAocmVxICYmIHJlcS5zb2NrZXQgJiYgcmVxLnNvY2tldC5yZW1vdGVBZGRyZXNzKSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgYWNjZXNzS2V5OiBBdXRoLmV4dHJhY3RBY2Nlc3NLZXkocmVxLCBjb25uZWN0aW9uKSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50U3BhbjogUVRyYWNlci5leHRyYWN0UGFyZW50U3Bhbih0aGlzLnRyYWNlciwgY29ubmVjdGlvbiA/IGNvbm5lY3Rpb24gOiByZXEpLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGx1Z2luczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdERpZFN0YXJ0KF9yZXF1ZXN0Q29udGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWxsU2VuZFJlc3BvbnNlKGN0eCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZXh0OiBHcmFwaFFMUmVxdWVzdENvbnRleHQgPSBjdHguY29udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRleHQubXVsdGlwbGVBY2Nlc3NLZXlzRGV0ZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGNyZWF0ZUVycm9yKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDQwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnUmVxdWVzdCBtdXN0IHVzZSB0aGUgc2FtZSBhY2Nlc3Mga2V5IGZvciBhbGwgcXVlcmllcyBhbmQgbXV0YXRpb25zJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBhcG9sbG8gPSBuZXcgQXBvbGxvU2VydmVyKGNvbmZpZyk7XG4gICAgICAgIGFwb2xsby5hcHBseU1pZGRsZXdhcmUoe1xuICAgICAgICAgICAgYXBwOiB0aGlzLmFwcCxcbiAgICAgICAgICAgIHBhdGg6IGVuZFBvaW50LnBhdGgsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoZW5kUG9pbnQuc3VwcG9ydFN1YnNjcmlwdGlvbnMpIHtcbiAgICAgICAgICAgIGFwb2xsby5pbnN0YWxsU3Vic2NyaXB0aW9uSGFuZGxlcnModGhpcy5zZXJ2ZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZW5kUG9pbnRzLnB1c2goZW5kUG9pbnQpO1xuICAgIH1cblxuXG59XG5cbiJdfQ==