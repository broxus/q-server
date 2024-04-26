import {
    BlockchainQueryTokens_TransactionsArgs,
    BlockchainTokenTransaction,
    BlockchainTokensTransactionsConnection,
} from "../resolvers-types-generated"
import { QRequestContext } from "../../../request"
import { GraphQLResolveInfo } from "graphql"
import { QTraceSpan } from "../../../tracing"
import { QParams } from "../../../filter/filters"
import { useTokensTransactionsArchive } from "../../../data/data-provider"
import {
    Direction,
    getNodeSelectionSetForConnection,
    isDefined,
    prepareChainOrderFilter,
    processPaginatedQueryResult,
    processPaginationArgs,
    stringCursor,
} from "../helpers"
import {
    tokenTransactionArchiveFields,
    upgradeSelectionForBocParsing,
} from "../boc-parsers"
import { config } from "../config"
import { required } from "../../../utils"

export async function resolve_blockchain_tokens_transactions(
    args: BlockchainQueryTokens_TransactionsArgs,
    context: QRequestContext,
    info: GraphQLResolveInfo,
    traceSpan: QTraceSpan,
) {
    const maxJoinDepth = 2

    // filters
    const filters: string[] = []
    const params = new QParams({
        stringifyKeyInAqlComparison:
            context.services.config.queries.filter.stringifyKeyInAqlComparison,
    })
    const useArchive = useTokensTransactionsArchive(args.archive, context)

    await prepareChainOrderFilter(args, params, filters, context, useArchive)

    if (isDefined(args.workchain)) {
        filters.push(`tr.workchain_id == @${params.add(args.workchain)}`)
    }

    const { direction, limit } = processPaginationArgs(args)

    const { selectionSet } = upgradeSelectionForBocParsing(
        useArchive,
        getNodeSelectionSetForConnection(info),
        tokenTransactionArchiveFields,
    )
    const returnExpression = config.tokens_transactions.buildReturnExpression(
        selectionSet,
        context,
        maxJoinDepth,
        "doc",
    )

    // query
    const query = `
        FOR doc IN tokens_transactions
        LET tr = DOCUMENT(CONCAT("transactions/", doc.transaction_hash))
        FILTER ${filters.join(" AND ")}
        SORT doc.chain_order ${direction == Direction.Backward ? "DESC" : "ASC"}
        LIMIT ${limit}
        RETURN ${returnExpression}
    `

    const queryResult: BlockchainTokenTransaction[] =
        (await context.services.data.query(
            required(context.services.data.tokens_transactions.provider),
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
                archive: useArchive,
            },
        )) as any

    return (await processPaginatedQueryResult(
        queryResult,
        limit,
        direction,
        "chain_order",
        stringCursor,
        async r => {
            await config.tokens_transactions.fetchJoins(
                r,
                selectionSet,
                context,
                traceSpan,
                maxJoinDepth,
                useArchive,
            )
        },
    )) as BlockchainTokensTransactionsConnection
}
