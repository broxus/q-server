"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolversMam = void 0;

var _blockchain = _interopRequireDefault(require("../data/blockchain"));

var _collection = require("../data/collection");

var _utils = require("../utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const {
  version
} = (0, _utils.packageJson)();

// Query
function info() {
  return {
    version
  };
}

function stat(_parent, args, context) {
  (0, _collection.mamAccessRequired)(context, args);
  const data = context.data;
  let totalWaitForCount = 0;
  let totalSubscriptionCount = 0;
  const collections = data.collections.map(collection => {
    totalWaitForCount += collection.waitForCount;
    totalSubscriptionCount += collection.subscriptionCount;
    return {
      name: collection.name,
      subscriptionCount: collection.subscriptionCount,
      waitForCount: collection.waitForCount,
      maxQueueSize: collection.maxQueueSize,
      subscriptions: [],
      waitFor: []
    };
  });
  return {
    waitForCount: totalWaitForCount,
    subscriptionCount: totalSubscriptionCount,
    collections
  };
}

async function getCollections(_parent, args, context) {
  (0, _collection.mamAccessRequired)(context, args);
  const data = context.data;
  const collections = [];

  for (const collection of data.collections) {
    const indexes = [];

    for (const index of await collection.getIndexes()) {
      indexes.push(index.fields.join(', '));
    }

    collections.push({
      name: collection.name,
      count: 0,
      indexes
    });
  }

  return collections;
}

async function dropCachedDbInfo(_parent, args, context) {
  (0, _collection.mamAccessRequired)(context, args);
  context.data.dropCachedDbInfo();
  return true;
} // Mutation


const resolversMam = {
  Query: {
    info,
    getCollections,
    stat
  },
  Mutation: {
    dropCachedDbInfo
  }
};
exports.resolversMam = resolversMam;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9zZXJ2ZXIvZ3JhcGhxbC9yZXNvbHZlcnMtbWFtLmpzIl0sIm5hbWVzIjpbInZlcnNpb24iLCJpbmZvIiwic3RhdCIsIl9wYXJlbnQiLCJhcmdzIiwiY29udGV4dCIsImRhdGEiLCJ0b3RhbFdhaXRGb3JDb3VudCIsInRvdGFsU3Vic2NyaXB0aW9uQ291bnQiLCJjb2xsZWN0aW9ucyIsIm1hcCIsImNvbGxlY3Rpb24iLCJ3YWl0Rm9yQ291bnQiLCJzdWJzY3JpcHRpb25Db3VudCIsIm5hbWUiLCJtYXhRdWV1ZVNpemUiLCJzdWJzY3JpcHRpb25zIiwid2FpdEZvciIsImdldENvbGxlY3Rpb25zIiwiaW5kZXhlcyIsImluZGV4IiwiZ2V0SW5kZXhlcyIsInB1c2giLCJmaWVsZHMiLCJqb2luIiwiY291bnQiLCJkcm9wQ2FjaGVkRGJJbmZvIiwicmVzb2x2ZXJzTWFtIiwiUXVlcnkiLCJNdXRhdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUVBOztBQUNBOztBQUVBOzs7O0FBQ0EsTUFBTTtBQUFDQSxFQUFBQTtBQUFELElBQVkseUJBQWxCOztBQWlDQTtBQUVBLFNBQVNDLElBQVQsR0FBc0I7QUFDbEIsU0FBTztBQUNIRCxJQUFBQTtBQURHLEdBQVA7QUFHSDs7QUFFRCxTQUFTRSxJQUFULENBQWNDLE9BQWQsRUFBNEJDLElBQTVCLEVBQXVDQyxPQUF2QyxFQUErRTtBQUMzRSxxQ0FBa0JBLE9BQWxCLEVBQTJCRCxJQUEzQjtBQUNBLFFBQU1FLElBQXFCLEdBQUdELE9BQU8sQ0FBQ0MsSUFBdEM7QUFDQSxNQUFJQyxpQkFBaUIsR0FBRyxDQUF4QjtBQUNBLE1BQUlDLHNCQUFzQixHQUFHLENBQTdCO0FBQ0EsUUFBTUMsV0FBVyxHQUFHSCxJQUFJLENBQUNHLFdBQUwsQ0FBaUJDLEdBQWpCLENBQXNCQyxVQUFELElBQWlDO0FBQ3RFSixJQUFBQSxpQkFBaUIsSUFBSUksVUFBVSxDQUFDQyxZQUFoQztBQUNBSixJQUFBQSxzQkFBc0IsSUFBSUcsVUFBVSxDQUFDRSxpQkFBckM7QUFDQSxXQUFPO0FBQ0hDLE1BQUFBLElBQUksRUFBRUgsVUFBVSxDQUFDRyxJQURkO0FBRUhELE1BQUFBLGlCQUFpQixFQUFFRixVQUFVLENBQUNFLGlCQUYzQjtBQUdIRCxNQUFBQSxZQUFZLEVBQUVELFVBQVUsQ0FBQ0MsWUFIdEI7QUFJSEcsTUFBQUEsWUFBWSxFQUFFSixVQUFVLENBQUNJLFlBSnRCO0FBS0hDLE1BQUFBLGFBQWEsRUFBRSxFQUxaO0FBTUhDLE1BQUFBLE9BQU8sRUFBRTtBQU5OLEtBQVA7QUFRSCxHQVhtQixDQUFwQjtBQVlBLFNBQU87QUFDSEwsSUFBQUEsWUFBWSxFQUFFTCxpQkFEWDtBQUVITSxJQUFBQSxpQkFBaUIsRUFBRUwsc0JBRmhCO0FBR0hDLElBQUFBO0FBSEcsR0FBUDtBQUtIOztBQUVELGVBQWVTLGNBQWYsQ0FBOEJmLE9BQTlCLEVBQTRDQyxJQUE1QyxFQUF1REMsT0FBdkQsRUFBdUg7QUFDbkgscUNBQWtCQSxPQUFsQixFQUEyQkQsSUFBM0I7QUFDQSxRQUFNRSxJQUFxQixHQUFHRCxPQUFPLENBQUNDLElBQXRDO0FBQ0EsUUFBTUcsV0FBZ0MsR0FBRyxFQUF6Qzs7QUFDQSxPQUFLLE1BQU1FLFVBQVgsSUFBeUJMLElBQUksQ0FBQ0csV0FBOUIsRUFBMkM7QUFDdkMsVUFBTVUsT0FBaUIsR0FBRyxFQUExQjs7QUFDQSxTQUFLLE1BQU1DLEtBQVgsSUFBb0IsTUFBTVQsVUFBVSxDQUFDVSxVQUFYLEVBQTFCLEVBQW1EO0FBQy9DRixNQUFBQSxPQUFPLENBQUNHLElBQVIsQ0FBYUYsS0FBSyxDQUFDRyxNQUFOLENBQWFDLElBQWIsQ0FBa0IsSUFBbEIsQ0FBYjtBQUNIOztBQUNEZixJQUFBQSxXQUFXLENBQUNhLElBQVosQ0FBaUI7QUFDYlIsTUFBQUEsSUFBSSxFQUFFSCxVQUFVLENBQUNHLElBREo7QUFFYlcsTUFBQUEsS0FBSyxFQUFFLENBRk07QUFHYk4sTUFBQUE7QUFIYSxLQUFqQjtBQUtIOztBQUNELFNBQU9WLFdBQVA7QUFDSDs7QUFFRCxlQUFlaUIsZ0JBQWYsQ0FBZ0N2QixPQUFoQyxFQUE4Q0MsSUFBOUMsRUFBeURDLE9BQXpELEVBQTZHO0FBQ3pHLHFDQUFrQkEsT0FBbEIsRUFBMkJELElBQTNCO0FBQ0FDLEVBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhb0IsZ0JBQWI7QUFDQSxTQUFPLElBQVA7QUFDSCxDLENBRUQ7OztBQUVPLE1BQU1DLFlBQVksR0FBRztBQUN4QkMsRUFBQUEsS0FBSyxFQUFFO0FBQ0gzQixJQUFBQSxJQURHO0FBRUhpQixJQUFBQSxjQUZHO0FBR0hoQixJQUFBQTtBQUhHLEdBRGlCO0FBTXhCMkIsRUFBQUEsUUFBUSxFQUFFO0FBQ05ILElBQUFBO0FBRE07QUFOYyxDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XG5cbmltcG9ydCBRQmxvY2tjaGFpbkRhdGEgZnJvbSBcIi4uL2RhdGEvYmxvY2tjaGFpblwiO1xuaW1wb3J0IHsgUURhdGFDb2xsZWN0aW9uLCBtYW1BY2Nlc3NSZXF1aXJlZCB9IGZyb20gXCIuLi9kYXRhL2NvbGxlY3Rpb25cIjtcbmltcG9ydCB0eXBlIHsgR3JhcGhRTFJlcXVlc3RDb250ZXh0RXggfSBmcm9tIFwiLi9yZXNvbHZlcnMtY3VzdG9tXCI7XG5pbXBvcnQge3BhY2thZ2VKc29ufSBmcm9tICcuLi91dGlscyc7XG5jb25zdCB7dmVyc2lvbn0gPSBwYWNrYWdlSnNvbigpO1xuXG50eXBlIEluZm8gPSB7XG4gICAgdmVyc2lvbjogc3RyaW5nLFxufVxuXG50eXBlIExpc3RlbmVyU3RhdCA9IHtcbiAgICBmaWx0ZXI6IHN0cmluZyxcbiAgICBzZWxlY3Rpb246IHN0cmluZyxcbiAgICBxdWV1ZVNpemU6IG51bWJlcixcbiAgICBldmVudENvdW50OiBudW1iZXIsXG4gICAgc2Vjb25kc0FjdGl2ZTogbnVtYmVyLFxufVxuXG50eXBlIENvbGxlY3Rpb25TdGF0ID0ge1xuICAgIG5hbWU6IHN0cmluZyxcbiAgICBzdWJzY3JpcHRpb25Db3VudDogbnVtYmVyLFxuICAgIHdhaXRGb3JDb3VudDogbnVtYmVyLFxuICAgIG1heFF1ZXVlU2l6ZTogbnVtYmVyLFxuICAgIHN1YnNjcmlwdGlvbnM6IExpc3RlbmVyU3RhdFtdLFxuICAgIHdhaXRGb3I6IExpc3RlbmVyU3RhdFtdLFxufVxuXG50eXBlIFN0YXQgPSB7XG4gICAgY29sbGVjdGlvbnM6IENvbGxlY3Rpb25TdGF0W11cbn1cblxudHlwZSBDb2xsZWN0aW9uU3VtbWFyeSA9IHtcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgY291bnQ6IG51bWJlcixcbiAgICBpbmRleGVzOiBzdHJpbmdbXSxcbn1cblxuLy8gUXVlcnlcblxuZnVuY3Rpb24gaW5mbygpOiBJbmZvIHtcbiAgICByZXR1cm4ge1xuICAgICAgICB2ZXJzaW9uLFxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHN0YXQoX3BhcmVudDogYW55LCBhcmdzOiBhbnksIGNvbnRleHQ6IEdyYXBoUUxSZXF1ZXN0Q29udGV4dEV4KTogU3RhdCB7XG4gICAgbWFtQWNjZXNzUmVxdWlyZWQoY29udGV4dCwgYXJncyk7XG4gICAgY29uc3QgZGF0YTogUUJsb2NrY2hhaW5EYXRhID0gY29udGV4dC5kYXRhO1xuICAgIGxldCB0b3RhbFdhaXRGb3JDb3VudCA9IDA7XG4gICAgbGV0IHRvdGFsU3Vic2NyaXB0aW9uQ291bnQgPSAwO1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zID0gZGF0YS5jb2xsZWN0aW9ucy5tYXAoKGNvbGxlY3Rpb246IFFEYXRhQ29sbGVjdGlvbikgPT4ge1xuICAgICAgICB0b3RhbFdhaXRGb3JDb3VudCArPSBjb2xsZWN0aW9uLndhaXRGb3JDb3VudDtcbiAgICAgICAgdG90YWxTdWJzY3JpcHRpb25Db3VudCArPSBjb2xsZWN0aW9uLnN1YnNjcmlwdGlvbkNvdW50O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogY29sbGVjdGlvbi5uYW1lLFxuICAgICAgICAgICAgc3Vic2NyaXB0aW9uQ291bnQ6IGNvbGxlY3Rpb24uc3Vic2NyaXB0aW9uQ291bnQsXG4gICAgICAgICAgICB3YWl0Rm9yQ291bnQ6IGNvbGxlY3Rpb24ud2FpdEZvckNvdW50LFxuICAgICAgICAgICAgbWF4UXVldWVTaXplOiBjb2xsZWN0aW9uLm1heFF1ZXVlU2l6ZSxcbiAgICAgICAgICAgIHN1YnNjcmlwdGlvbnM6IFtdLFxuICAgICAgICAgICAgd2FpdEZvcjogW10sXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICB3YWl0Rm9yQ291bnQ6IHRvdGFsV2FpdEZvckNvdW50LFxuICAgICAgICBzdWJzY3JpcHRpb25Db3VudDogdG90YWxTdWJzY3JpcHRpb25Db3VudCxcbiAgICAgICAgY29sbGVjdGlvbnMsXG4gICAgfTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0Q29sbGVjdGlvbnMoX3BhcmVudDogYW55LCBhcmdzOiBhbnksIGNvbnRleHQ6IEdyYXBoUUxSZXF1ZXN0Q29udGV4dEV4KTogUHJvbWlzZTxDb2xsZWN0aW9uU3VtbWFyeVtdPiB7XG4gICAgbWFtQWNjZXNzUmVxdWlyZWQoY29udGV4dCwgYXJncyk7XG4gICAgY29uc3QgZGF0YTogUUJsb2NrY2hhaW5EYXRhID0gY29udGV4dC5kYXRhO1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zOiBDb2xsZWN0aW9uU3VtbWFyeVtdID0gW107XG4gICAgZm9yIChjb25zdCBjb2xsZWN0aW9uIG9mIGRhdGEuY29sbGVjdGlvbnMpIHtcbiAgICAgICAgY29uc3QgaW5kZXhlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgZm9yIChjb25zdCBpbmRleCBvZiBhd2FpdCBjb2xsZWN0aW9uLmdldEluZGV4ZXMoKSkge1xuICAgICAgICAgICAgaW5kZXhlcy5wdXNoKGluZGV4LmZpZWxkcy5qb2luKCcsICcpKTtcbiAgICAgICAgfVxuICAgICAgICBjb2xsZWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgIG5hbWU6IGNvbGxlY3Rpb24ubmFtZSxcbiAgICAgICAgICAgIGNvdW50OiAwLFxuICAgICAgICAgICAgaW5kZXhlcyxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBjb2xsZWN0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gZHJvcENhY2hlZERiSW5mbyhfcGFyZW50OiBhbnksIGFyZ3M6IGFueSwgY29udGV4dDogR3JhcGhRTFJlcXVlc3RDb250ZXh0RXgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBtYW1BY2Nlc3NSZXF1aXJlZChjb250ZXh0LCBhcmdzKTtcbiAgICBjb250ZXh0LmRhdGEuZHJvcENhY2hlZERiSW5mbygpO1xuICAgIHJldHVybiB0cnVlO1xufVxuXG4vLyBNdXRhdGlvblxuXG5leHBvcnQgY29uc3QgcmVzb2x2ZXJzTWFtID0ge1xuICAgIFF1ZXJ5OiB7XG4gICAgICAgIGluZm8sXG4gICAgICAgIGdldENvbGxlY3Rpb25zLFxuICAgICAgICBzdGF0XG4gICAgfSxcbiAgICBNdXRhdGlvbjoge1xuICAgICAgICBkcm9wQ2FjaGVkRGJJbmZvLFxuICAgIH1cbn07XG4iXX0=