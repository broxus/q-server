"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cleanError = cleanError;
exports.createError = createError;
exports.wrap = wrap;
exports.toLog = toLog;
exports.RegistryMap = void 0;

function cleanError(error) {
  if ('ArangoError' in error) {
    return error.ArangoError;
  }

  delete error.request;
  delete error.response;
  error.stack = '...';
  return error;
}

function createError(code, message, source = 'graphql') {
  const error = new Error(message);
  error.source = source;
  error.code = code;
  error.stack = '...';
  return error;
}

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
      cleaned = createError(500, 'Service temporary unavailable');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci91dGlscy5qcyJdLCJuYW1lcyI6WyJjbGVhbkVycm9yIiwiZXJyb3IiLCJBcmFuZ29FcnJvciIsInJlcXVlc3QiLCJyZXNwb25zZSIsInN0YWNrIiwiY3JlYXRlRXJyb3IiLCJjb2RlIiwibWVzc2FnZSIsInNvdXJjZSIsIkVycm9yIiwiaXNJbnRlcm5hbFNlcnZlckVycm9yIiwidHlwZSIsIndyYXAiLCJsb2ciLCJvcCIsImFyZ3MiLCJmZXRjaCIsImVyciIsImNsZWFuZWQiLCJSZWdpc3RyeU1hcCIsImNvbnN0cnVjdG9yIiwibmFtZSIsImxhc3RJZCIsIml0ZW1zIiwiTWFwIiwiYWRkIiwiaXRlbSIsImlkIiwiTnVtYmVyIiwiTUFYX1NBRkVfSU5URUdFUiIsImhhcyIsInNldCIsInJlbW92ZSIsImRlbGV0ZSIsImNvbnNvbGUiLCJlbnRyaWVzIiwidmFsdWVzIiwidG9Mb2ciLCJ2YWx1ZSIsIm9ianMiLCJ0eXBlT2YiLCJsZW5ndGgiLCJzdWJzdHIiLCJ1bmRlZmluZWQiLCJpbmNsdWRlcyIsIm5ld09ianMiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJ4IiwidmFsdWVUb0xvZyIsIk9iamVjdCIsImZvckVhY2giLCJuIiwidiIsInByb3BlcnR5VmFsdWVUb0xvZyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7QUFFTyxTQUFTQSxVQUFULENBQW9CQyxLQUFwQixFQUFxQztBQUN4QyxNQUFJLGlCQUFpQkEsS0FBckIsRUFBNEI7QUFDeEIsV0FBT0EsS0FBSyxDQUFDQyxXQUFiO0FBQ0g7O0FBQ0QsU0FBT0QsS0FBSyxDQUFDRSxPQUFiO0FBQ0EsU0FBT0YsS0FBSyxDQUFDRyxRQUFiO0FBQ0FILEVBQUFBLEtBQUssQ0FBQ0ksS0FBTixHQUFjLEtBQWQ7QUFDQSxTQUFPSixLQUFQO0FBQ0g7O0FBR00sU0FBU0ssV0FBVCxDQUFxQkMsSUFBckIsRUFBbUNDLE9BQW5DLEVBQW9EQyxNQUFjLEdBQUcsU0FBckUsRUFBdUY7QUFDMUYs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cGUge1FMb2d9IGZyb20gJy4vbG9ncyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjbGVhbkVycm9yKGVycm9yOiBhbnkpOiBhbnkge1xuICAgIGlmICgnQXJhbmdvRXJyb3InIGluIGVycm9yKSB7XG4gICAgICAgIHJldHVybiBlcnJvci5BcmFuZ29FcnJvcjtcbiAgICB9XG4gICAgZGVsZXRlIGVycm9yLnJlcXVlc3Q7XG4gICAgZGVsZXRlIGVycm9yLnJlc3BvbnNlO1xuICAgIGVycm9yLnN0YWNrID0gJy4uLic7XG4gICAgcmV0dXJuIGVycm9yO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFcnJvcihjb2RlOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZywgc291cmNlOiBzdHJpbmcgPSAnZ3JhcGhxbCcpOiBFcnJvciB7XG4gICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gICAgKGVycm9yOiBhbnkpLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAoZXJyb3I6IGFueSkuY29kZSA9IGNvZGU7XG4gICAgZXJyb3Iuc3RhY2sgPSAnLi4uJztcbiAgICByZXR1cm4gZXJyb3I7XG59XG5cbmZ1bmN0aW9uIGlzSW50ZXJuYWxTZXJ2ZXJFcnJvcihlcnJvcjogRXJyb3IpOiBib29sZWFuIHtcbiAgICBpZiAoJ3R5cGUnIGluIGVycm9yICYmIGVycm9yLnR5cGUgPT09ICdzeXN0ZW0nKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoJ2Vycm5vJyBpbiBlcnJvciAmJiAnc3lzY2FsbCcgaW4gZXJyb3IpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JhcDxSPihsb2c6IFFMb2csIG9wOiBzdHJpbmcsIGFyZ3M6IGFueSwgZmV0Y2g6ICgpID0+IFByb21pc2U8Uj4pIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gYXdhaXQgZmV0Y2goKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgbGV0IGNsZWFuZWQgPSBjbGVhbkVycm9yKGVycik7XG4gICAgICAgIGxvZy5lcnJvcignRkFJTEVEJywgb3AsIGFyZ3MsIGNsZWFuZWQpO1xuICAgICAgICBpZiAoaXNJbnRlcm5hbFNlcnZlckVycm9yKGNsZWFuZWQpKSB7XG4gICAgICAgICAgICBjbGVhbmVkID0gY3JlYXRlRXJyb3IoNTAwLCAnU2VydmljZSB0ZW1wb3JhcnkgdW5hdmFpbGFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBjbGVhbmVkO1xuICAgIH1cbn1cblxuZXhwb3J0IGNsYXNzIFJlZ2lzdHJ5TWFwPFQ+IHtcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgaXRlbXM6IE1hcDxudW1iZXIsIFQ+O1xuICAgIGxhc3RJZDogbnVtYmVyO1xuXG4gICAgY29uc3RydWN0b3IobmFtZTogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMubGFzdElkID0gMDtcbiAgICAgICAgdGhpcy5pdGVtcyA9IG5ldyBNYXAoKTtcbiAgICB9XG5cbiAgICBhZGQoaXRlbTogVCk6IG51bWJlciB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMubGFzdElkO1xuICAgICAgICBkbyB7XG4gICAgICAgICAgICBpZCA9IGlkIDwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgPyBpZCArIDEgOiAxO1xuICAgICAgICB9IHdoaWxlICh0aGlzLml0ZW1zLmhhcyhpZCkpO1xuICAgICAgICB0aGlzLmxhc3RJZCA9IGlkO1xuICAgICAgICB0aGlzLml0ZW1zLnNldChpZCwgaXRlbSk7XG4gICAgICAgIHJldHVybiBpZDtcbiAgICB9XG5cbiAgICByZW1vdmUoaWQ6IG51bWJlcikge1xuICAgICAgICBpZiAoIXRoaXMuaXRlbXMuZGVsZXRlKGlkKSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHJlbW92ZSAke3RoaXMubmFtZX06IGl0ZW0gd2l0aCBpZCBbJHtpZH1dIGRvZXMgbm90IGV4aXN0c2ApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZW50cmllcygpOiBbbnVtYmVyLCBUXVtdIHtcbiAgICAgICAgcmV0dXJuIFsuLi50aGlzLml0ZW1zLmVudHJpZXMoKV07XG4gICAgfVxuXG4gICAgdmFsdWVzKCk6IFRbXSB7XG4gICAgICAgIHJldHVybiBbLi4udGhpcy5pdGVtcy52YWx1ZXMoKV07XG4gICAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9Mb2codmFsdWU6IGFueSwgb2Jqcz86IE9iamVjdFtdKTogYW55IHtcbiAgICBjb25zdCB0eXBlT2YgPSB0eXBlb2YgdmFsdWU7XG4gICAgc3dpdGNoICh0eXBlT2YpIHtcbiAgICBjYXNlIFwidW5kZWZpbmVkXCI6XG4gICAgY2FzZSBcImJvb2xlYW5cIjpcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgY2FzZSBcImJpZ2ludFwiOlxuICAgIGNhc2UgXCJzeW1ib2xcIjpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIGNhc2UgXCJzdHJpbmdcIjpcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA+IDgwKSB7XG4gICAgICAgICAgICByZXR1cm4gYCR7dmFsdWUuc3Vic3RyKDAsIDUwKX3igKYgWyR7dmFsdWUubGVuZ3RofV1gXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIGNhc2UgXCJmdW5jdGlvblwiOlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChvYmpzICYmIG9ianMuaW5jbHVkZXModmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld09ianMgPSBvYmpzID8gWy4uLm9ianMsIHZhbHVlXSA6IFt2YWx1ZV07XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbHVlLm1hcCh4ID0+IHRvTG9nKHgsIG5ld09ianMpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB2YWx1ZVRvTG9nOiB7IFtzdHJpbmddOiBhbnkgfSA9IHt9O1xuICAgICAgICBPYmplY3QuZW50cmllcyh2YWx1ZSkuZm9yRWFjaCgoW24sIHZdKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0eVZhbHVlVG9Mb2cgPSB0b0xvZyh2LCBuZXdPYmpzKTtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eVZhbHVlVG9Mb2cgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHZhbHVlVG9Mb2dbbl0gPSBwcm9wZXJ0eVZhbHVlVG9Mb2c7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdmFsdWVUb0xvZ1xuICAgIH1cbn1cbiJdfQ==