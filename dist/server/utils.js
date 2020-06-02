"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanError = cleanError;
exports.wrap = wrap;
exports.toLog = toLog;
exports.RegistryMap = exports.QError = void 0;

function cleanError(error) {
  if ('ArangoError' in error) {
    return error.ArangoError;
  }

  delete error.request;
  delete error.response;
  return error;
}

const QErrorCode = {
  MESSAGE_EXPIRED: 10001,
  MULTIPLE_ACCESS_KEYS: 10002,
  UNAUTHORIZED: 10003,
  AUTH_SERVICE_UNAVAILABLE: 10004,
  AUTH_FAILED: 10005
};

class QError {
  static messageExpired(id, expiredAt) {
    return QError.create(QErrorCode.MESSAGE_EXPIRED, `Message expired`, {
      id,
      expiredAt,
      now: Date.now()
    });
  }

  static create(code, message, data) {
    const error = new Error(message);
    error.source = 'graphql';
    error.code = code;

    if (data !== undefined) {
      error.data = data;
    }

    return error;
  }

  static multipleAccessKeys() {
    return QError.create(QErrorCode.MULTIPLE_ACCESS_KEYS, 'Request must use the same access key for all queries and mutations');
  }

  static unauthorized() {
    return QError.create(QErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  static authServiceUnavailable() {
    return QError.create(QErrorCode.AUTH_SERVICE_UNAVAILABLE, 'Auth service unavailable');
  }

  static auth(error) {
    return QError.create(QErrorCode.AUTH_FAILED, error.message || error.description, {
      authErrorCode: error.code
    });
  }

}

exports.QError = QError;

function isInternalServerError(error) {
  if ('type' in error && error.type === 'system') {
    return true;
  }

  if ('errno' in error && 'syscall' in error) {
    return true;
  }
}

async function wrap(log, op, args, fetch) {
  try {
    return await fetch();
  } catch (err) {
    let cleaned = cleanError(err);
    log.error('FAILED', op, args, cleaned);

    if (isInternalServerError(cleaned)) {
      cleaned = QError.create(500, 'Service temporary unavailable');
    }

    throw cleaned;
  }
}

class RegistryMap {
  constructor(name) {
    this.name = name;
    this.lastId = 0;
    this.items = new Map();
  }

  add(item) {
    let id = this.lastId;

    do {
      id = id < Number.MAX_SAFE_INTEGER ? id + 1 : 1;
    } while (this.items.has(id));

    this.lastId = id;
    this.items.set(id, item);
    return id;
  }

  remove(id) {
    if (!this.items.delete(id)) {
      console.error(`Failed to remove ${this.name}: item with id [${id}] does not exists`);
    }
  }

  entries() {
    return [...this.items.entries()];
  }

  values() {
    return [...this.items.values()];
  }

}

exports.RegistryMap = RegistryMap;

function toLog(value, objs) {
  const typeOf = typeof value;

  switch (typeOf) {
    case "undefined":
    case "boolean":
    case "number":
    case "bigint":
    case "symbol":
      return value;

    case "string":
      if (value.length > 80) {
        return `${value.substr(0, 50)}… [${value.length}]`;
      }

      return value;

    case "function":
      return undefined;

    default:
      if (value === null) {
        return value;
      }

      if (objs && objs.includes(value)) {
        return undefined;
      }

      const newObjs = objs ? [...objs, value] : [value];

      if (Array.isArray(value)) {
        return value.map(x => toLog(x, newObjs));
      }

      const valueToLog = {};
      Object.entries(value).forEach(([n, v]) => {
        const propertyValueToLog = toLog(v, newObjs);

        if (propertyValueToLog !== undefined) {
          valueToLog[n] = propertyValueToLog;
        }
      });
      return valueToLog;
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci91dGlscy5qcyJdLCJuYW1lcyI6WyJjbGVhbkVycm9yIiwiZXJyb3IiLCJBcmFuZ29FcnJvciIsInJlcXVlc3QiLCJyZXNwb25zZSIsIlFFcnJvckNvZGUiLCJNRVNTQUdFX0VYUElSRUQiLCJNVUxUSVBMRV9BQ0NFU1NfS0VZUyIsIlVOQVVUSE9SSVpFRCIsIkFVVEhfU0VSVklDRV9VTkFWQUlMQUJMRSIsIkFVVEhfRkFJTEVEIiwiUUVycm9yIiwibWVzc2FnZUV4cGlyZWQiLCJpZCIsImV4cGlyZWRBdCIsImNyZWF0ZSIsIm5vdyIsIkRhdGUiLCJjb2RlIiwibWVzc2FnZSIsImRhdGEiLCJFcnJvciIsInNvdXJjZSIsInVuZGVmaW5lZCIsIm11bHRpcGxlQWNjZXNzS2V5cyIsInVuYXV0aG9yaXplZCIsImF1dGhTZXJ2aWNlVW5hdmFpbGFibGUiLCJhdXRoIiwiZGVzY3JpcHRpb24iLCJhdXRoRXJyb3JDb2RlIiwiaXNJbnRlcm5hbFNlcnZlckVycm9yIiwidHlwZSIsIndyYXAiLCJsb2ciLCJvcCIsImFyZ3MiLCJmZXRjaCIsImVyciIsImNsZWFuZWQiLCJSZWdpc3RyeU1hcCIsImNvbnN0cnVjdG9yIiwibmFtZSIsImxhc3RJZCIsIml0ZW1zIiwiTWFwIiwiYWRkIiwiaXRlbSIsIk51bWJlciIsIk1BWF9TQUZFX0lOVEVHRVIiLCJoYXMiLCJzZXQiLCJyZW1vdmUiLCJkZWxldGUiLCJjb25zb2xlIiwiZW50cmllcyIsInZhbHVlcyIsInRvTG9nIiwidmFsdWUiLCJvYmpzIiwidHlwZU9mIiwibGVuZ3RoIiwic3Vic3RyIiwiaW5jbHVkZXMiLCJuZXdPYmpzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwieCIsInZhbHVlVG9Mb2ciLCJPYmplY3QiLCJmb3JFYWNoIiwibiIsInYiLCJwcm9wZXJ0eVZhbHVlVG9Mb2ciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFFTyxTQUFTQSxVQUFULENBQW9CQyxLQUFwQixFQUFxQztBQUN4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QSxNQUFNLENBQUNmLE9BQVAsQ0FBZUcsS0FBZixFQUFzQmEsT0FBdEIsQ0FBOEIsQ0FBQyxDQUFDQyxDQUFELEVBQUlDLENBQUosQ0FBRCxLQUFZO0FBQ3RDLGNBQU1DLGtCQUFrQixHQUFHakIsS0FBSyxDQUFDZ0IsQ0FBRCxFQUFJVCxPQUFKLENBQWhDOztBQUNBLFlBQUlVLGtCQUFrQixLQUFLbEQsU0FBM0IsRUFBc0M7QUFDbEM2QyxVQUFBQSxVQUFVLENBQUNHLENBQUQsQ0FBVixHQUFnQkUsa0JBQWhCO0FBQ0g7QUFDSixPQUxEO0FBTUEsYUFBT0wsVUFBUDtBQWhDSjtBQWtDSCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB0eXBlIHsgUUxvZyB9IGZyb20gJy4vbG9ncyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhbkVycm9yKGVycm9yOiBhbnkpOiBhbnkge1xuICAgIGlmICgnQXJhbmdvRXJyb3InIGluIGVycm9yKSB7XG4gICAgICAgIHJldHVybiBlcnJvci5BcmFuZ29FcnJvcjtcbiAgICB9XG4gICAgZGVsZXRlIGVycm9yLnJlcXVlc3Q7XG4gICAgZGVsZXRlIGVycm9yLnJlc3BvbnNlO1xuICAgIHJldHVybiBlcnJvcjtcbn1cblxuY29uc3QgUUVycm9yQ29kZSA9IHtcbiAgICBNRVNTQUdFX0VYUElSRUQ6IDEwMDAxLFxuICAgIE1VTFRJUExFX0FDQ0VTU19LRVlTOiAxMDAwMixcbiAgICBVTkFVVEhPUklaRUQ6IDEwMDAzLFxuICAgIEFVVEhfU0VSVklDRV9VTkFWQUlMQUJMRTogMTAwMDQsXG4gICAgQVVUSF9GQUlMRUQ6IDEwMDA1LFxufTtcblxuZXhwb3J0IGNsYXNzIFFFcnJvciB7XG4gICAgc3RhdGljIG1lc3NhZ2VFeHBpcmVkKGlkOiBzdHJpbmcsIGV4cGlyZWRBdDogbnVtYmVyKTogRXJyb3Ige1xuICAgICAgICByZXR1cm4gUUVycm9yLmNyZWF0ZShRRXJyb3JDb2RlLk1FU1NBR0VfRVhQSVJFRCwgYE1lc3NhZ2UgZXhwaXJlZGAsIHtcbiAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgZXhwaXJlZEF0LFxuICAgICAgICAgICAgbm93OiBEYXRlLm5vdygpLFxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBzdGF0aWMgY3JlYXRlKGNvZGU6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nLCBkYXRhPzogYW55KTogRXJyb3Ige1xuICAgICAgICBjb25zdCBlcnJvcjogYW55ID0gbmV3IEVycm9yKG1lc3NhZ2UpO1xuICAgICAgICBlcnJvci5zb3VyY2UgPSAnZ3JhcGhxbCc7XG4gICAgICAgIGVycm9yLmNvZGUgPSBjb2RlO1xuICAgICAgICBpZiAoZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBlcnJvci5kYXRhID0gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXJyb3I7XG4gICAgfVxuXG4gICAgc3RhdGljIG11bHRpcGxlQWNjZXNzS2V5cygpIHtcbiAgICAgICAgcmV0dXJuIFFFcnJvci5jcmVhdGUoXG4gICAgICAgICAgICBRRXJyb3JDb2RlLk1VTFRJUExFX0FDQ0VTU19LRVlTLFxuICAgICAgICAgICAgJ1JlcXVlc3QgbXVzdCB1c2UgdGhlIHNhbWUgYWNjZXNzIGtleSBmb3IgYWxsIHF1ZXJpZXMgYW5kIG11dGF0aW9ucycsXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgc3RhdGljIHVuYXV0aG9yaXplZCgpIHtcbiAgICAgICAgcmV0dXJuIFFFcnJvci5jcmVhdGUoUUVycm9yQ29kZS5VTkFVVEhPUklaRUQsICdVbmF1dGhvcml6ZWQnKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYXV0aFNlcnZpY2VVbmF2YWlsYWJsZSgpIHtcbiAgICAgICAgcmV0dXJuIFFFcnJvci5jcmVhdGUoUUVycm9yQ29kZS5BVVRIX1NFUlZJQ0VfVU5BVkFJTEFCTEUsICdBdXRoIHNlcnZpY2UgdW5hdmFpbGFibGUnKTtcbiAgICB9XG5cbiAgICBzdGF0aWMgYXV0aChlcnJvcikge1xuICAgICAgICByZXR1cm4gUUVycm9yLmNyZWF0ZShRRXJyb3JDb2RlLkFVVEhfRkFJTEVELFxuICAgICAgICAgICAgZXJyb3IubWVzc2FnZSB8fCBlcnJvci5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgIHsgYXV0aEVycm9yQ29kZTogZXJyb3IuY29kZSB9LFxuICAgICAgICApXG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0ludGVybmFsU2VydmVyRXJyb3IoZXJyb3I6IEVycm9yKTogYm9vbGVhbiB7XG4gICAgaWYgKCd0eXBlJyBpbiBlcnJvciAmJiBlcnJvci50eXBlID09PSAnc3lzdGVtJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCdlcnJubycgaW4gZXJyb3IgJiYgJ3N5c2NhbGwnIGluIGVycm9yKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyYXA8Uj4obG9nOiBRTG9nLCBvcDogc3RyaW5nLCBhcmdzOiBhbnksIGZldGNoOiAoKSA9PiBQcm9taXNlPFI+KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGF3YWl0IGZldGNoKCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIGxldCBjbGVhbmVkID0gY2xlYW5FcnJvcihlcnIpO1xuICAgICAgICBsb2cuZXJyb3IoJ0ZBSUxFRCcsIG9wLCBhcmdzLCBjbGVhbmVkKTtcbiAgICAgICAgaWYgKGlzSW50ZXJuYWxTZXJ2ZXJFcnJvcihjbGVhbmVkKSkge1xuICAgICAgICAgICAgY2xlYW5lZCA9IFFFcnJvci5jcmVhdGUoNTAwLCAnU2VydmljZSB0ZW1wb3JhcnkgdW5hdmFpbGFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBjbGVhbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5TWFwPFQ+IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgaXRlbXM6IE1hcDxudW1iZXIsIFQ+O1xuICAgIGxhc3RJZDogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMubGFzdElkID0gMDtcbiAgICAgICAgdGhpcy5pdGVtcyA9IG5ldyBNYXAoKTtcbiAgICB9XG5cbiAgICBhZGQoaXRlbTogVCk6IG51bWJlciB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMubGFzdElkO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBpZCA9IGlkIDwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgPyBpZCArIDEgOiAxO1xuICAgICAgICB9IHdoaWxlICh0aGlzLml0ZW1zLmhhcyhpZCkpO1xuICAgICAgICB0aGlzLmxhc3RJZCA9IGlkO1xuICAgICAgICB0aGlzLml0ZW1zLnNldChpZCwgaXRlbSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICByZW1vdmUoaWQ6IG51bWJlcikge1xuICAgICAgICBpZiAoIXRoaXMuaXRlbXMuZGVsZXRlKGlkKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHJlbW92ZSAke3RoaXMubmFtZX06IGl0ZW0gd2l0aCBpZCBbJHtpZH1dIGRvZXMgbm90IGV4aXN0c2ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZW50cmllcygpOiBbbnVtYmVyLCBUXVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLml0ZW1zLmVudHJpZXMoKV07XG4gICAgfVxuXG4gICAgdmFsdWVzKCk6IFRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5pdGVtcy52YWx1ZXMoKV07XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9Mb2codmFsdWU6IGFueSwgb2Jqcz86IE9iamVjdFtdKTogYW55IHtcbiAgICBjb25zdCB0eXBlT2YgPSB0eXBlb2YgdmFsdWU7XG4gICAgc3dpdGNoICh0eXBlT2YpIHtcbiAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgY2FzZSBcImJpZ2ludFwiOlxuICAgIGNhc2UgXCJzeW1ib2xcIjpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7dmFsdWUuc3Vic3RyKDAsIDUwKX3igKYgWyR7dmFsdWUubGVuZ3RofV1gXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvYmpzICYmIG9ianMuaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld09ianMgPSBvYmpzID8gWy4uLm9ianMsIHZhbHVlXSA6IFt2YWx1ZV07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLm1hcCh4ID0+IHRvTG9nKHgsIG5ld09ianMpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2YWx1ZVRvTG9nOiB7IFtzdHJpbmddOiBhbnkgfSA9IHt9O1xuICAgICAgICBPYmplY3QuZW50cmllcyh2YWx1ZSkuZm9yRWFjaCgoW24sIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVZhbHVlVG9Mb2cgPSB0b0xvZyh2LCBuZXdPYmpzKTtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eVZhbHVlVG9Mb2cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHZhbHVlVG9Mb2dbbl0gPSBwcm9wZXJ0eVZhbHVlVG9Mb2c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVUb0xvZ1xuICAgIH1cbn1cbiJdfQ==