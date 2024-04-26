import { SelectionSetNode } from "graphql"
import { mergeFieldWithSelectionSet } from "../../filter/filters"
import {
    BlockchainBlock,
    BlockchainMessage,
    BlockchainTransaction,
} from "./resolvers-types-generated"
import { QRequestContext } from "../../request"
import { BocModule } from "@eversdk/core"
import { toU64String } from "../../utils"

export const blockArchiveFields = new Set([
    "id",
    "hash",
    "boc",
    "chain_order",
    "gen_utime",
    "key_block",
    "master.shard_hashes.descr.root_hash",
    "master.shard_hashes.descr.seq_no",
    "master.shard_hashes.shard",
    "master.shard_hashes.workchain_id",
    "master.min_shard_gen_utime",
    "prev_alt_ref.root_hash",
    "prev_key_block_seqno",
    "prev_ref.root_hash",
    "seq_no",
    "shard",
    "tr_count",
    "value_flow.fees_collected",
    "workchain_id",
])
export const transactionArchiveFields = new Set([
    "id",
    "hash",
    "boc",
    "aborted",
    "account_addr",
    "account",
    "action.total_fwd_fees",
    "balance_delta",
    "block_id",
    "block",
    "chain_order",
    "compute.exit_code",
    "compute.gas_fees",
    "ext_in_msg_fee",
    "in_msg",
    "in_message",
    "lt",
    "now",
    "out_msgs",
    "out_messages",
    "storage.storage_fees_collected",
    "total_fees",
    "tr_type",
    "tr_type_name",
    "workchain_id",
])
export const tokenTransactionArchiveFields = new Set([
    "id",

    "amount_bigint",
    "amount_scale",
    "amount",

    "kind",
    "aborted",
    "lt",
    "lt_dec",

    "owner_address",
    "owner",

    "token_wallet_address",
    "token_wallet",

    "token",
    "block_time",

    "root_address",
    "token_root",

    "message_hash",
    "message",

    "payload",
    "token_standard",
    "chain_order",

    "transaction_hash",
    "transaction",
])
export const messageArchiveFields = new Set([
    "id",
    "hash",
    "boc",
    "block_id",
    "block",
    "chain_order",
    "created_at",
    "dst",
    "dst_account",
    "msg_type",
    "msg_type_name",
    "src",
    "src_account",
    "value",
])

export function upgradeSelectionForBocParsing(
    archive: boolean,
    selection: SelectionSetNode | undefined,
    archivedFields: Set<string>,
): { selectionSet: SelectionSetNode | undefined; requireBocParsing: boolean } {
    if (
        archive &&
        selection &&
        selectionContainsNonArchivedFields("", selection, archivedFields)
    ) {
        return {
            selectionSet: mergeFieldWithSelectionSet("boc", selection),
            requireBocParsing: true,
        }
    }
    return { selectionSet: selection, requireBocParsing: false }
}

export type BlocksPostProcessing = {
    resolveBocs: boolean
    parseBocs: boolean
}

export function getBlocksPostProcessing(
    context: QRequestContext,
    archive: boolean,
    selection: SelectionSetNode | undefined,
): BlocksPostProcessing {
    if (!selection || !archive) {
        return {
            resolveBocs: false,
            parseBocs: false,
        }
    }
    const parseBocs = selectionContainsNonArchivedFields(
        "",
        selection,
        blockArchiveFields,
    )
    const useBlockBocStorage = !!context.services.data.blockBocProvider
    const resolveBocs =
        parseBocs || (useBlockBocStorage && selectionContains(selection, "boc"))
    return {
        resolveBocs,
        parseBocs,
    }
}

function selectionContainsNonArchivedFields(
    parentPath: string,
    selection: SelectionSetNode,
    archivedFields: Set<string>,
) {
    for (const field of selection.selections) {
        if (field.kind !== "Field") {
            continue
        }
        const fieldPath =
            parentPath !== ""
                ? `${parentPath}.${field.name.value}`
                : field.name.value
        if (archivedFields.has(fieldPath)) {
            continue
        }
        if (
            !field.selectionSet ||
            selectionContainsNonArchivedFields(
                fieldPath,
                field.selectionSet,
                archivedFields,
            )
        ) {
            return true
        }
    }
    return false
}

export function selectionContains(selection: SelectionSetNode, field: string) {
    return !!selection.selections.find(
        x => x.kind === "Field" && x.name.value === field,
    )
}

interface DocWithBoc {
    boc?: string | null
}
async function parseBocs<T extends DocWithBoc>(
    context: QRequestContext,
    docs: T[],
    parse: (sdk: BocModule, boc: string) => Promise<T>,
): Promise<T[]> {
    const parsed: T[] = []
    const sdk = context.services.client.boc
    for (const doc of docs) {
        if (doc.boc) {
            parsed.push({ ...doc, ...(await parse(sdk, doc.boc)) })
        } else {
            parsed.push(doc)
        }
    }
    return parsed
}

export async function postProcessBlocks(
    postProcessing: BlocksPostProcessing,
    context: QRequestContext,
    blocks: BlockchainBlock[],
): Promise<BlockchainBlock[]> {
    const blocksStorage = context.services.data.blockBocProvider
    if (postProcessing.resolveBocs && blocksStorage) {
        const bocs = await blocksStorage.getBocs(
            blocks.map(x => ({
                hash: x._key,
                boc: x.boc,
            })),
        )
        for (const block of blocks) {
            const boc = bocs.get(block._key)
            if (boc) {
                block.boc = boc
            }
        }
    }
    if (!postProcessing.parseBocs) {
        return blocks
    }
    return await parseBocs(context, blocks, parseBlock)
}

async function parseMessage(
    sdk: BocModule,
    boc: string,
): Promise<BlockchainMessage> {
    return (await sdk.parse_message({ boc })).parsed
}

async function parseBlock(
    sdk: BocModule,
    boc: string,
): Promise<BlockchainBlock> {
    return (await sdk.parse_block({ boc })).parsed
}

async function parseTransaction(
    sdk: BocModule,
    boc: string,
): Promise<BlockchainTransaction> {
    const parsed = (await sdk.parse_transaction({ boc })).parsed
    if (parsed.lt && parsed.lt.startsWith("0x")) {
        parsed.lt = toU64String(BigInt(parsed.lt))
    }
    return parsed
}

export async function parseMessageBocsIfRequired(
    requireParsing: boolean,
    context: QRequestContext,
    messages: BlockchainMessage[],
): Promise<BlockchainMessage[]> {
    if (requireParsing) {
        return await parseBocs(context, messages, parseMessage)
    } else {
        return messages
    }
}

export async function parseTransactionBocsIfRequired(
    requireParsing: boolean,
    context: QRequestContext,
    transactions: BlockchainTransaction[],
): Promise<BlockchainTransaction[]> {
    if (requireParsing) {
        return await parseBocs(context, transactions, parseTransaction)
    } else {
        return transactions
    }
}
