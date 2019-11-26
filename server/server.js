/*
 * Copyright 2018-2019 TON DEV SOLUTIONS LTD.
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

// @flow
import fs from 'fs';

import express from 'express';
import http from 'http';

import { ApolloServer } from 'apollo-server-express';

import Arango from './arango';

import { createResolvers as createResolversV1 } from './q-resolvers.v1';
import { createResolvers as createResolversV2 } from './q-resolvers.v2';
import { attachCustomResolvers as attachCustomResolversV1 } from "./custom-resolvers.v1";

import type { QConfig } from "./config";
import QLogs from "./logs";
import type { QLog } from "./logs";

type QOptions = {
    config: QConfig,
    logs: QLogs,
}

export default class TONQServer {
    config: QConfig;
    logs: QLogs;
    log: QLog;
    db: Arango;

    constructor(options: QOptions) {
        this.config = options.config;
        this.logs = options.logs;
        this.log = this.logs.create('Q Server');
    }


    async start() {
        const config = this.config.server;

        this.db = new Arango(this.config, this.logs);
        const ver = this.config.database.version;
        const typeDefs = fs.readFileSync(`type-defs.v${ver}.graphql`, 'utf-8');
        const createResolvers = ver === '1' ? createResolversV1 : createResolversV2;
        const attachCustomResolvers = ver === '1' ? attachCustomResolversV1 : (x) => x;
        const resolvers = attachCustomResolvers(createResolvers(this.db));

        await this.db.start();

        const apollo = new ApolloServer({
            typeDefs,
            resolvers,
        });

        const app = express();
        apollo.applyMiddleware({ app, path: '/graphql' });

        const server = http.createServer(app);
        apollo.installSubscriptionHandlers(server);

        server.listen({
            host: config.host,
            port: config.port,
        }, () => {
            const uri = `http://${config.host}:${config.port}/graphql`;
            this.log.debug(`Started on ${uri}`);
        });
    }
}

