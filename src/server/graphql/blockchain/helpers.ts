import { FieldNode, GraphQLResolveInfo } from "graphql";
import { QParams } from "../../filter/filters";
import { QRequestContext } from "../../request";
import { QError, toU64String } from "../../utils";
import { BlockchainMasterSeqNoFilter, Maybe, Scalars } from "./resolvers-types-generated";

export const enum Direction {
    Forward,
    Backward,
}

export type PaginationArgs = {
    first?: Maybe<Scalars['Int']>;
    after?: Maybe<Scalars['String']>;
    last?: Maybe<Scalars['Int']>;
    before?: Maybe<Scalars['String']>;
}

export function processPaginationArgs(args: PaginationArgs) {
    if (args.first && args.last) {
        throw QError.invalidQuery("\"first\" and \"last\" shouldn't be used simultaneously");
    }
    if (args.first && args.before) {
        throw QError.invalidQuery("\"first\" should not be used with \"before\"");
    }
    if (args.last && args.after) {
        throw QError.invalidQuery("\"last\" should not be used with \"after\"");
    }
    if (args.first && args.first < 1) {
        throw QError.invalidQuery("\"first\" should not be less than than 1");
    }
    if (args.last && args.last < 1) {
        throw QError.invalidQuery("\"last\" should not be less than than 1");
    }
    const limit = 1 + Math.min(50, args.first ?? 50, args.last ?? 50);
    const direction = (args.last || args.before) ? Direction.Backward : Direction.Forward;
    return { direction, limit };
}

export type ChainOrderFilterArgs = {
    master_seq_no?: Maybe<BlockchainMasterSeqNoFilter>;
    after?: Maybe<Scalars['String']>;
    before?: Maybe<Scalars['String']>;
}

export async function prepareChainOrderFilter(
    args: ChainOrderFilterArgs,
    params: QParams,
    filters: string[],
    context: QRequestContext,
) {
    // master_seq_no
    let start_chain_order = args.master_seq_no?.start ? toU64String(args.master_seq_no.start) : null;
    let end_chain_order = args.master_seq_no?.end ? toU64String(args.master_seq_no.end) : null;
    
    // before, after
    start_chain_order = args.after && (!start_chain_order || args.after > start_chain_order)
        ? args.after
        : start_chain_order;
    end_chain_order = args.before && (!end_chain_order || args.before < end_chain_order)
        ? args.before
        : end_chain_order;
    
    // reliable boundary
    const reliable = await context.services.data.getReliableChainOrderUpperBoundary(context);
    if (reliable.boundary == "") {
        throw QError.internalServerError();
    }
    
    end_chain_order = (end_chain_order && end_chain_order < reliable.boundary) ? end_chain_order : reliable.boundary;
    
    // apply
    if (start_chain_order) {
        const paramName = params.add(start_chain_order);
        filters.push(`doc.chain_order > @${paramName}`);
    } else {
        // Next line is equivalent to "chain_order != null", but the ">=" is better:
        // we doesn't have to rely on arangodb to convert "!= null" to index scan boundary
        filters.push(`doc.chain_order >= ""`);
    }
    
    const paramName = params.add(end_chain_order);
    filters.push(`doc.chain_order < @${paramName}`);
}

export function getNodeSelectionSetForConnection(info: GraphQLResolveInfo) {
    const edgesNode = info.fieldNodes[0].selectionSet?.selections
        .find(s => s.kind == "Field" && s.name.value == "edges") as FieldNode | undefined;
    const nodeNode = edgesNode?.selectionSet?.selections
        .find(s => s.kind == "Field" && s.name.value == "node") as FieldNode | undefined;
    return nodeNode?.selectionSet;
}

export function processPaginatedQueryResult<T extends { chain_order?: Maybe<Scalars['String']> }>(
    queryResult: T[],
    limit: number,
    direction: Direction
) {
    // sort query result by chain_order ASC
    queryResult.sort((a, b) => {
        if (!a.chain_order || !b.chain_order) {
            throw QError.create(500, "chain_order field not found");
        }
        if (a.chain_order > b.chain_order) {
            return 1;
        }
        if (a.chain_order < b.chain_order) {
            return -1;
        }
        throw QError.create(500, "two entities with the same chain_order");
    });

    // limit result length
    const hasMore = queryResult.length >= limit;
    if (hasMore) {
        switch (direction) {
            case Direction.Forward:
                queryResult.splice(limit - 1);
                break;
            case Direction.Backward:
                queryResult.splice(0, queryResult.length - limit + 1);
                break;
        }
    }

    let result = {
        edges: queryResult.map(t => {
            return {
                node: t,
                cursor: t.chain_order,
            };
        }),
        pageInfo: {
            startCursor: queryResult.length > 0 ? queryResult[0].chain_order : "",
            endCursor: queryResult.length > 0 ? queryResult[queryResult.length - 1].chain_order : "",
            hasNextPage: (direction == Direction.Forward) ? hasMore : false,
            hasPreviousPage: (direction == Direction.Backward) ? hasMore : false,
        },
    };
    return result;
}
