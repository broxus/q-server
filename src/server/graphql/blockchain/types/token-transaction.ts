import { QRequestContext } from "../../../request"
import {
    Resolvers,
    TokenTransactionKindEnum,
} from "../resolvers-types-generated"

export const resolvers: Resolvers<QRequestContext> = {
    BlockchainTokenTransaction: {
        id: parent => `tokens_transactions/${parent._key}`,
        kind_name: parent => {
            switch (parent.kind) {
                case 0:
                    return TokenTransactionKindEnum.Mint
                case 1:
                    return TokenTransactionKindEnum.Burn
                case 2:
                    return TokenTransactionKindEnum.Send
                case 3:
                    return TokenTransactionKindEnum.Receive
                case 4:
                    return TokenTransactionKindEnum.SendCancellation
                case 5:
                    return TokenTransactionKindEnum.BurnCancellation
                default:
                    return null
            }
        },
    },
}
