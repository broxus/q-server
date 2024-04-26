import { QRequestContext } from "../../../request"
import { Resolvers } from "../resolvers-types-generated"

export const resolvers: Resolvers<QRequestContext> = {
    BlockchainTokenTransaction: {
        id: parent => `tokens_transactions/${parent._key}`,
    },
}
