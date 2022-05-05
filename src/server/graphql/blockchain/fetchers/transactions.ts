import { GraphQLResolveInfo } from "graphql"

import { convertBigUInt } from "../../../filter/filters"
import { QParams } from "../../../filter/filters"
import { QRequestContext } from "../../../request"
import { QTraceSpan } from "../../../tracing"
import { required } from "../../../utils"
import { QError } from "../../../utils"

import { config } from "../config"
import {
    Direction,
    getNodeSelectionSetForConnection,
    isDefined,
    prepareChainOrderFilter,
    processPaginatedQueryResult,
    processPaginationArgs,
} from "../helpers"
import {
    BlockchainAccountQueryTransactionsArgs,
    BlockchainQueryAccount_TransactionsArgs,
    BlockchainQueryTransactionsArgs,
    BlockchainQueryWorkchain_TransactionsArgs,
    BlockchainTransaction,
    BlockchainTransactionsConnection,
} from "../resolvers-types-generated"

export async function resolve_transaction(
    hash: String,
    context: QRequestContext,
    info: GraphQLResolveInfo,
    traceSpan: QTraceSpan,
) {
    const maxJoinDepth = 1

    const selectionSet = info.fieldNodes[0].selectionSet
    const returnExpression = config.transactions.buildReturnExpression(
        selectionSet,
        context,
        maxJoinDepth,
        "doc",
    )

    // query
    const params = new QParams()
    const query =
        "FOR doc IN transactions " +
        `FILTER doc._key == @${params.add(hash)} ` +
        `RETURN ${returnExpression}`
    const queryResult = (await context.services.data.query(
        required(context.services.data.transactions.provider),
        {
            text: query,
            vars: params.values,
            orderBy: [],
            request: context,
            traceSpan,
        },
    )) as BlockchainTransaction[]

    return queryResult[0]
}

export async function resolve_blockchain_transactions(
    args:
        | BlockchainQueryTransactionsArgs
        | BlockchainQueryWorkchain_TransactionsArgs,
    context: QRequestContext,
    info: GraphQLResolveInfo,
    traceSpan: QTraceSpan,
) {
    const maxJoinDepth = 1

    // filters
    const filters: string[] = []
    const params = new QParams()

    await prepareChainOrderFilter(args, params, filters, context)

    if (isDefined(args.workchain)) {
        filters.push(`doc.workchain_id == @${params.add(args.workchain)}`)
    }
    if (isDefined(args.min_balance_delta)) {
        const min_balance_delta = convertBigUInt(2, args.min_balance_delta)
        filters.push(`doc.balance_delta >= @${params.add(min_balance_delta)}`)
    }
    if (isDefined(args.max_balance_delta)) {
        const max_balance_delta = convertBigUInt(2, args.max_balance_delta)
        filters.push(`doc.balance_delta <= @${params.add(max_balance_delta)}`)
    }

    const { direction, limit } = processPaginationArgs(args)

    const selectionSet = getNodeSelectionSetForConnection(info)
    const returnExpression = config.transactions.buildReturnExpression(
        selectionSet,
        context,
        maxJoinDepth,
        "doc",
    )

    // query
    const query = `
        FOR doc IN transactions
        FILTER ${filters.join(" AND ")}
        SORT doc.chain_order ${direction == Direction.Backward ? "DESC" : "ASC"}
        LIMIT ${limit}
        RETURN ${returnExpression}
    `
    const queryResult = (await context.services.data.query(
        required(context.services.data.transactions.provider),
        {
            text: query,
            vars: params.values,
            orderBy: [
                {
                    path: "chain_order",
                    direction: "ASC",
                },
            ],
            request: context,
            traceSpan,
        },
    )) as BlockchainTransaction[]

    return (await processPaginatedQueryResult(
        queryResult,
        limit,
        direction,
        "chain_order",
        async r => {
            await config.transactions.fetchJoins(
                r,
                selectionSet,
                context,
                traceSpan,
                maxJoinDepth,
            )
        },
    )) as BlockchainTransactionsConnection
}

export async function resolve_account_transactions(
    account_address: string,
    args:
        | BlockchainAccountQueryTransactionsArgs
        | BlockchainQueryAccount_TransactionsArgs,
    context: QRequestContext,
    info: GraphQLResolveInfo,
    traceSpan: QTraceSpan,
) {
    const maxJoinDepth = 1
    // validate args
    const restrictToAccounts = (await context.requireGrantedAccess({}))
        .restrictToAccounts
    if (
        restrictToAccounts.length != 0 &&
        !restrictToAccounts.includes(account_address)
    ) {
        throw QError.invalidQuery("This account_addr is not allowed")
    }

    // filters
    const filters: string[] = []
    const params = new QParams()

    await prepareChainOrderFilter(args, params, filters, context)
    filters.push(`doc.account_addr == @${params.add(account_address)}`)
    if (isDefined(args.aborted)) {
        filters.push(`doc.aborted == @${params.add(args.aborted)}`)
    }
    if (isDefined(args.min_balance_delta)) {
        const min_balance_delta = convertBigUInt(2, args.min_balance_delta)
        filters.push(`doc.balance_delta >= @${params.add(min_balance_delta)}`)
    }
    if (isDefined(args.max_balance_delta)) {
        const max_balance_delta = convertBigUInt(2, args.max_balance_delta)
        filters.push(`doc.balance_delta <= @${params.add(max_balance_delta)}`)
    }

    const { direction, limit } = processPaginationArgs(args)

    const selectionSet = getNodeSelectionSetForConnection(info)
    const returnExpression = config.transactions.buildReturnExpression(
        selectionSet,
        context,
        maxJoinDepth,
        "doc",
    )

    // query
    const query = `
        FOR doc IN transactions
        FILTER ${filters.join(" AND ")}
        SORT doc.chain_order ${direction == Direction.Backward ? "DESC" : "ASC"}
        LIMIT ${limit}
        RETURN ${returnExpression}
    `
    const queryResult = (await context.services.data.query(
        required(context.services.data.transactions.provider),
        {
            text: query,
            vars: params.values,
            orderBy: [
                {
                    path: "chain_order",
                    direction: "ASC",
                },
            ],
            request: context,
            traceSpan,
            // TODO: shard
        },
    )) as BlockchainTransaction[]

    return (await processPaginatedQueryResult(
        queryResult,
        limit,
        direction,
        "chain_order",
        async r => {
            await config.transactions.fetchJoins(
                r,
                selectionSet,
                context,
                traceSpan,
                maxJoinDepth,
            )
        },
    )) as BlockchainTransactionsConnection
}