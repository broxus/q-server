"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Auth = void 0;

var _nodeFetch = _interopRequireDefault(require("node-fetch"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const grantedAccess = Object.freeze({
  granted: true,
  restrictToAccounts: []
});
const deniedAccess = Object.freeze({
  granted: false,
  restrictToAccounts: []
});

class Auth {
  constructor(config) {
    this.config = config;
  }

  static extractAccessKey(req, connection) {
    return req && req.headers && (req.headers.accessKey || req.headers.accesskey) || connection && connection.context && connection.context.accessKey;
  }

  static error(code, message) {
    const error = new Error(message);
    error.source = 'graphql';
    error.code = code;
    return error;
  }

  authServiceRequired() {
    if (!this.config.authorization.endpoint) {
      throw Auth.error(500, 'Auth service unavailable');
    }
  }

  async requireGrantedAccess(accessKey) {
    const access = await this.getAccessRights(accessKey);

    if (!access.granted) {
      throw Auth.error(401, 'Unauthorized');
    }

    return access;
  }

  async getAccessRights(accessKey) {
    if (!this.config.authorization.endpoint) {
      return grantedAccess;
    }

    if ((accessKey || '') === '') {
      return deniedAccess;
    }

    const rights = await this.invokeAuth('getAccessRights', {
      accessKey
    });

    if (!rights.restrictToAccounts) {
      rights.restrictToAccounts = [];
    }

    return rights;
  }

  async getManagementAccessKey() {
    this.authServiceRequired();
    return this.invokeAuth('getManagementAccessKey', {});
  }

  async registerAccessKeys(account, keys, signedManagementAccessKey) {
    this.authServiceRequired();
    return this.invokeAuth('registerAccessKeys', {
      account,
      keys,
      signedManagementAccessKey
    });
  }

  async revokeAccessKeys(account, keys, signedManagementAccessKey) {
    this.authServiceRequired();
    return this.invokeAuth('revokeAccessKeys', {
      account,
      keys,
      signedManagementAccessKey
    });
  }

  async invokeAuth(method, params) {
    const res = await (0, _nodeFetch.default)(this.config.authorization.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method,
        params
      })
    });

    if (res.status !== 200) {
      throw new Error(`Auth service failed: ${await res.text()}`);
    }

    const response = await res.json();

    if (response.error) {
      const error = new Error(response.error.message || response.error.description);
      error.source = response.error.source || 'graphql';
      error.code = response.error.code || 500;
      throw error;
    }

    return response.result;
  }

}

exports.Auth = Auth;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9hdXRoLmpzIl0sIm5hbWVzIjpbImdyYW50ZWRBY2Nlc3MiLCJPYmplY3QiLCJmcmVlemUiLCJncmFudGVkIiwicmVzdHJpY3RUb0FjY291bnRzIiwiZGVuaWVkQWNjZXNzIiwiQXV0aCIsImNvbnN0cnVjdG9yIiwiY29uZmlnIiwiZXh0cmFjdEFjY2Vzc0tleSIsInJlcSIsImNvbm5lY3Rpb24iLCJoZWFkZXJzIiwiYWNjZXNzS2V5IiwiYWNjZXNza2V5IiwiY29udGV4dCIsImVycm9yIiwiY29kZSIsIm1lc3NhZ2UiLCJFcnJvciIsInNvdXJjZSIsImF1dGhTZXJ2aWNlUmVxdWlyZWQiLCJhdXRob3JpemF0aW9uIiwiZW5kcG9pbnQiLCJyZXF1aXJlR3JhbnRlZEFjY2VzcyIsImFjY2VzcyIsImdldEFjY2Vzc1JpZ2h0cyIsInJpZ2h0cyIsImludm9rZUF1dGgiLCJnZXRNYW5hZ2VtZW50QWNjZXNzS2V5IiwicmVnaXN0ZXJBY2Nlc3NLZXlzIiwiYWNjb3VudCIsImtleXMiLCJzaWduZWRNYW5hZ2VtZW50QWNjZXNzS2V5IiwicmV2b2tlQWNjZXNzS2V5cyIsIm1ldGhvZCIsInBhcmFtcyIsInJlcyIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwianNvbnJwYyIsImlkIiwic3RhdHVzIiwidGV4dCIsInJlc3BvbnNlIiwianNvbiIsImRlc2NyaXB0aW9uIiwicmVzdWx0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBR0E7Ozs7QUFZQSxNQUFNQSxhQUEyQixHQUFHQyxNQUFNLENBQUNDLE1BQVAsQ0FBYztBQUM5Q0MsRUFBQUEsT0FBTyxFQUFFLElBRHFDO0FBRTlDQyxFQUFBQSxrQkFBa0IsRUFBRTtBQUYwQixDQUFkLENBQXBDO0FBS0EsTUFBTUMsWUFBMEIsR0FBR0osTUFBTSxDQUFDQyxNQUFQLENBQWM7QUFDN0NDLEVBQUFBLE9BQU8sRUFBRSxLQURvQztBQUU3Q0MsRUFBQUEsa0JBQWtCLEVBQUU7QUFGeUIsQ0FBZCxDQUFu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IFFDb25maWcgfSBmcm9tIFwiLi9jb25maWdcIjtcbmltcG9ydCBmZXRjaCBmcm9tICdub2RlLWZldGNoJztcblxuZXhwb3J0IHR5cGUgQWNjZXNzS2V5ID0ge1xuICAgIGtleTogc3RyaW5nLFxuICAgIHJlc3RyaWN0VG9BY2NvdW50cz86IHN0cmluZ1tdLFxufVxuXG5leHBvcnQgdHlwZSBBY2Nlc3NSaWdodHMgPSB7XG4gICAgZ3JhbnRlZDogYm9vbCxcbiAgICByZXN0cmljdFRvQWNjb3VudHM6IHN0cmluZ1tdLFxufVxuXG5jb25zdCBncmFudGVkQWNjZXNzOiBBY2Nlc3NSaWdodHMgPSBPYmplY3QuZnJlZXplKHtcbiAgICBncmFudGVkOiB0cnVlLFxuICAgIHJlc3RyaWN0VG9BY2NvdW50czogW10sXG59KTtcblxuY29uc3QgZGVuaWVkQWNjZXNzOiBBY2Nlc3NSaWdodHMgPSBPYmplY3QuZnJlZXplKHtcbiAgICBncmFudGVkOiBmYWxzZSxcbiAgICByZXN0cmljdFRvQWNjb3VudHM6IFtdLFxufSk7XG5cbmV4cG9ydCBjbGFzcyBBdXRoIHtcbiAgICBjb25maWc6IFFDb25maWc7XG5cbiAgICBjb25zdHJ1Y3Rvcihjb25maWc6IFFDb25maWcpIHtcbiAgICAgICAgdGhpcy5jb25maWcgPSBjb25maWc7XG4gICAgfVxuXG4gICAgc3RhdGljIGV4dHJhY3RBY2Nlc3NLZXkocmVxOiBhbnksIGNvbm5lY3Rpb246IGFueSk6IHN0cmluZyB7XG4gICAgICAgIHJldHVybiAocmVxICYmIHJlcS5oZWFkZXJzICYmIChyZXEuaGVhZGVycy5hY2Nlc3NLZXkgfHwgcmVxLmhlYWRlcnMuYWNjZXNza2V5KSlcbiAgICAgICAgICAgIHx8IChjb25uZWN0aW9uICYmIGNvbm5lY3Rpb24uY29udGV4dCAmJiBjb25uZWN0aW9uLmNvbnRleHQuYWNjZXNzS2V5KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgZXJyb3IoY29kZTogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiBFcnJvciB7XG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICAoZXJyb3I6IGFueSkuc291cmNlID0gJ2dyYXBocWwnO1xuICAgICAgICAoZXJyb3I6IGFueSkuY29kZSA9IGNvZGU7XG4gICAgICAgIHJldHVybiBlcnJvcjtcbiAgICB9XG5cbiAgICBhdXRoU2VydmljZVJlcXVpcmVkKCkge1xuICAgICAgICBpZiAoIXRoaXMuY29uZmlnLmF1dGhvcml6YXRpb24uZW5kcG9pbnQpIHtcbiAgICAgICAgICAgIHRocm93IEF1dGguZXJyb3IoNTAwLCAnQXV0aCBzZXJ2aWNlIHVuYXZhaWxhYmxlJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyByZXF1aXJlR3JhbnRlZEFjY2VzcyhhY2Nlc3NLZXk6IHN0cmluZyB8IHR5cGVvZiB1bmRlZmluZWQpOiBQcm9taXNlPEFjY2Vzc1JpZ2h0cz4ge1xuICAgICAgICBjb25zdCBhY2Nlc3MgPSBhd2FpdCB0aGlzLmdldEFjY2Vzc1JpZ2h0cyhhY2Nlc3NLZXkpO1xuICAgICAgICBpZiAoIWFjY2Vzcy5ncmFudGVkKSB7XG4gICAgICAgICAgICB0aHJvdyBBdXRoLmVycm9yKDQwMSwgJ1VuYXV0aG9yaXplZCcpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhY2Nlc3M7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0QWNjZXNzUmlnaHRzKGFjY2Vzc0tleTogc3RyaW5nIHwgdHlwZW9mIHVuZGVmaW5lZCk6IFByb21pc2U8QWNjZXNzUmlnaHRzPiB7XG4gICAgICAgIGlmICghdGhpcy5jb25maWcuYXV0aG9yaXphdGlvbi5lbmRwb2ludCkge1xuICAgICAgICAgICAgcmV0dXJuIGdyYW50ZWRBY2Nlc3M7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKChhY2Nlc3NLZXkgfHwgJycpID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGRlbmllZEFjY2VzcztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByaWdodHMgPSBhd2FpdCB0aGlzLmludm9rZUF1dGgoJ2dldEFjY2Vzc1JpZ2h0cycsIHtcbiAgICAgICAgICAgIGFjY2Vzc0tleSxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghcmlnaHRzLnJlc3RyaWN0VG9BY2NvdW50cykge1xuICAgICAgICAgICAgcmlnaHRzLnJlc3RyaWN0VG9BY2NvdW50cyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByaWdodHM7XG4gICAgfVxuXG4gICAgYXN5bmMgZ2V0TWFuYWdlbWVudEFjY2Vzc0tleSgpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgICAgICB0aGlzLmF1dGhTZXJ2aWNlUmVxdWlyZWQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW52b2tlQXV0aCgnZ2V0TWFuYWdlbWVudEFjY2Vzc0tleScsIHt9KTtcbiAgICB9XG5cbiAgICBhc3luYyByZWdpc3RlckFjY2Vzc0tleXMoXG4gICAgICAgIGFjY291bnQ6IHN0cmluZyxcbiAgICAgICAga2V5czogQWNjZXNzS2V5W10sXG4gICAgICAgIHNpZ25lZE1hbmFnZW1lbnRBY2Nlc3NLZXk6IHN0cmluZ1xuICAgICk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgICAgIHRoaXMuYXV0aFNlcnZpY2VSZXF1aXJlZCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5pbnZva2VBdXRoKCdyZWdpc3RlckFjY2Vzc0tleXMnLCB7XG4gICAgICAgICAgICBhY2NvdW50LFxuICAgICAgICAgICAga2V5cyxcbiAgICAgICAgICAgIHNpZ25lZE1hbmFnZW1lbnRBY2Nlc3NLZXlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgcmV2b2tlQWNjZXNzS2V5cyhcbiAgICAgICAgYWNjb3VudDogc3RyaW5nLFxuICAgICAgICBrZXlzOiBzdHJpbmdbXSxcbiAgICAgICAgc2lnbmVkTWFuYWdlbWVudEFjY2Vzc0tleTogc3RyaW5nXG4gICAgKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICAgICAgdGhpcy5hdXRoU2VydmljZVJlcXVpcmVkKCk7XG4gICAgICAgIHJldHVybiB0aGlzLmludm9rZUF1dGgoJ3Jldm9rZUFjY2Vzc0tleXMnLCB7XG4gICAgICAgICAgICBhY2NvdW50LFxuICAgICAgICAgICAga2V5cyxcbiAgICAgICAgICAgIHNpZ25lZE1hbmFnZW1lbnRBY2Nlc3NLZXlcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYXN5bmMgaW52b2tlQXV0aChtZXRob2Q6IHN0cmluZywgcGFyYW1zOiBhbnkpOiBQcm9taXNlPGFueT4ge1xuICAgICAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCh0aGlzLmNvbmZpZy5hdXRob3JpemF0aW9uLmVuZHBvaW50LCB7XG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZDogJzEnLFxuICAgICAgICAgICAgICAgIG1ldGhvZCxcbiAgICAgICAgICAgICAgICBwYXJhbXNcbiAgICAgICAgICAgIH0pLFxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAocmVzLnN0YXR1cyAhPT0gMjAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEF1dGggc2VydmljZSBmYWlsZWQ6ICR7YXdhaXQgcmVzLnRleHQoKX1gKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVzLmpzb24oKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5lcnJvci5tZXNzYWdlIHx8IHJlc3BvbnNlLmVycm9yLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgIChlcnJvcjogYW55KS5zb3VyY2UgPSByZXNwb25zZS5lcnJvci5zb3VyY2UgfHwgJ2dyYXBocWwnO1xuICAgICAgICAgICAgKGVycm9yOiBhbnkpLmNvZGUgPSByZXNwb25zZS5lcnJvci5jb2RlIHx8IDUwMDtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJlc3VsdDtcbiAgICB9XG5cbn1cbiJdfQ==